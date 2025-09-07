import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlayerHealth } from './player-health.entity';
import { CreatePlayerHealthDto, InjuryDataDto } from './dto/player-health.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { FullMatch } from '../matches/full-match/full-match.entity';
import { IncompleteMatch } from '../matches/incomplete-match/incomplete-match.entity';
import { TeamVsTeamMatch } from '../matches/team-vs-team-match/team-vs-team-match.entity';

@Injectable()
export class PlayerHealthService {
  constructor(
    @InjectRepository(PlayerHealth)
    private playerHealthRepository: Repository<PlayerHealth>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(FullMatch)
    private fullMatchRepository: Repository<FullMatch>,
    @InjectRepository(IncompleteMatch)
    private incompleteMatchRepository: Repository<IncompleteMatch>,
    @InjectRepository(TeamVsTeamMatch)
    private teamVsTeamMatchRepository: Repository<TeamVsTeamMatch>,
  ) {}

  async createHealthData(user: User, dto: CreatePlayerHealthDto): Promise<PlayerHealth> {
    if (user.role !== UserRole.PLAYER) {
      throw new BadRequestException('Only users with PLAYER role can submit health data');
    }
    const healthData = this.playerHealthRepository.create({
      ...dto,
      player: user,
    });
    return this.playerHealthRepository.save(healthData);
  }

  async updateInjuryData(userId: string, injuryData: InjuryDataDto): Promise<PlayerHealth> {
    const user = await this.userRepository.findOne({ where: { id: userId, role: UserRole.PLAYER } });
    if (!user) {
      throw new BadRequestException('Player not found or not a PLAYER role');
    }
    const latestHealth = await this.playerHealthRepository.findOne({
      where: { player: { id: userId } },
      order: { updatedAt: 'DESC' },
    });
    if (!latestHealth) {
      throw new BadRequestException('No health data found for user');
    }
    latestHealth.injuryOccurred = injuryData.injuryOccurred;
    latestHealth.injuryType = injuryData.injuryType || null;
    latestHealth.injuryDate = injuryData.injuryDate ? new Date(injuryData.injuryDate) : null;
    return this.playerHealthRepository.save(latestHealth);
  }

  async getPlayerHealthData(userId: string): Promise<PlayerHealth | null> {
    const user = await this.userRepository.findOne({ where: { id: userId, role: UserRole.PLAYER } });
    if (!user) {
      throw new BadRequestException('Player not found or not a PLAYER role');
    }
    return this.playerHealthRepository.findOne({
      where: { player: { id: userId } },
      order: { updatedAt: 'DESC' },
      cache: false, // Disable caching to ensure fresh data
    });
  }

  async getPlayerMatchStats(userId: string): Promise<{
    matchesPlayedWeek: number;
    matchTypes: string[];
    matchFrequency: number;
    matchIntensity: number;
  }> {
    const user = await this.userRepository.findOne({
      where: { id: userId, role: UserRole.PLAYER },
      relations: ['teams'],
    });
    if (!user) {
      throw new BadRequestException('Player not found or not a PLAYER role');
    }

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // FullMatch: Creator participation
    const fullMatches = await this.fullMatchRepository
      .createQueryBuilder('match')
      .where('match.creator.id = :userId', { userId })
      .andWhere('match.date >= :oneWeekAgo', { oneWeekAgo })
      .andWhere('match.status = :status', { status: 'CONFIRMED' })
      .getMany();

    // IncompleteMatch: Creator or joined players
    const incompleteMatches = await this.incompleteMatchRepository
      .createQueryBuilder('match')
      .leftJoin('match.players', 'player')
      .where('match.creator.id = :userId OR player.id = :userId', { userId })
      .andWhere('match.date >= :oneWeekAgo', { oneWeekAgo })
      .andWhere('match.status = :status', { status: 'CONFIRMED' })
      .getMany();

    // TeamVsTeamMatch: Players in team or opponentTeam
    const teamVsTeamMatches = await this.teamVsTeamMatchRepository
      .createQueryBuilder('match')
      .leftJoin('match.team', 'team')
      .leftJoin('match.opponentTeam', 'opponentTeam')
      .leftJoin('team.players', 'teamPlayer')
      .leftJoin('opponentTeam.players', 'opponentPlayer')
      .where('match.creator.id = :userId OR teamPlayer.id = :userId OR opponentPlayer.id = :userId', { userId })
      .andWhere('match.date >= :oneWeekAgo', { oneWeekAgo })
      .andWhere('match.status = :status', { status: 'CONFIRMED' })
      .getMany();

    const allMatches = [...fullMatches, ...incompleteMatches, ...teamVsTeamMatches];
    console.log('Matches retrieved:', allMatches); // Log matches for debugging

    const matchIntensity = this.calculateMatchIntensity(allMatches);
    return {
      matchesPlayedWeek: allMatches.length,
      matchTypes: allMatches.map(m => m.type),
      matchFrequency: allMatches.length > 1 ? this.calculateMatchFrequency(allMatches) : 0,
      matchIntensity,
    };
  }

  private calculateMatchFrequency(matches: (FullMatch | IncompleteMatch | TeamVsTeamMatch)[]): number {
    const sortedDates = matches
      .map(m => new Date(m.date).getTime())
      .sort((a, b) => a - b);
    if (sortedDates.length < 2) return 0;
    const intervals = sortedDates.slice(1).map((date, i) => (date - sortedDates[i]) / (1000 * 60 * 60 * 24));
    return intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  }

  private calculateMatchIntensity(matches: (FullMatch | IncompleteMatch | TeamVsTeamMatch)[]): number {
    let totalIntensity = 0;
    let count = 0;

    matches.forEach(match => {
      let intensity = 3; // Default: medium
      if (match.type === 'FULL') intensity = 5; // High intensity
      if (match.type === 'INCOMPLETE') {
        const avgSkill = ((match as IncompleteMatch).minSkillLevel + (match as IncompleteMatch).maxSkillLevel) / 2 || 3;
        intensity = Math.min(5, Math.max(1, Math.round(avgSkill)));
      }
      if (match.type === 'TEAM_VS_TEAM') intensity = 4; // Moderately high
      totalIntensity += intensity;
      count++;
    });

    return count > 0 ? totalIntensity / count : 3;
  }
}