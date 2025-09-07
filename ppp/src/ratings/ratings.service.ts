import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateRatingDto, MatchType } from './dto/create-rating.dto';
import { Rating } from './entities/rating.entity';
import { UsersService } from '../users/users.service';
import { IncompleteMatchService } from '../matches/incomplete-match/incomplete-match.service';
import { TeamVsTeamMatchService } from '../matches/team-vs-team-match/team-vs-team-match.service';
import { TeamsService } from '../teams/teams.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from '../users/entities/user.entity';
import { IsNull, Not } from 'typeorm';

@Injectable()
export class RatingsService {
  private readonly logger = new Logger(RatingsService.name);

  constructor(
    @InjectRepository(Rating)
    private readonly ratingsRepository: Repository<Rating>,
    private readonly usersService: UsersService,
    private readonly incompleteMatchService: IncompleteMatchService,
    private readonly teamVsTeamMatchService: TeamVsTeamMatchService,
    private readonly teamsService: TeamsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(createRatingDto: CreateRatingDto, raterId: string): Promise<Rating> {
    const { playerId, matchId, matchType, score } = createRatingDto

    // Fetch rater and player
    const rater = await this.usersService.findOne(raterId, { relations: ["teams"] })
    const player = await this.usersService.findOne(playerId, { relations: ["teams"] })
    if (!rater || !player) {
      throw new BadRequestException("Rater or player not found")
    }

    // Fetch match based on type with reservation relation
    let match: any
    switch (matchType) {
      case MatchType.INCOMPLETE:
        match = await this.incompleteMatchService.findOne(matchId)
        break
      case MatchType.TEAM_VS_TEAM:
        match = await this.teamVsTeamMatchService.findOne(matchId)
        break
      default:
        throw new BadRequestException("Invalid match type")
    }
    if (!match) {
      throw new BadRequestException(`Match with ID ${matchId} not found`)
    }

    // Check rater and player participation
    let raterParticipated = false
    let playerParticipated = false
    if (matchType === MatchType.TEAM_VS_TEAM) {
      const teamMembers = await this.teamsService.findMemberTeams(match.team.id)
      const opponentTeamMembers = match.opponentTeam
        ? await this.teamsService.findMemberTeams(match.opponentTeam.id)
        : []
      raterParticipated = teamMembers.some((p) => p.id === raterId) || opponentTeamMembers.some((p) => p.id === raterId)
      playerParticipated =
        teamMembers.some((p) => p.id === playerId) || opponentTeamMembers.some((p) => p.id === playerId)
    } else {
      raterParticipated = match.players.some((p) => p.id === raterId)
      playerParticipated = match.players.some((p) => p.id === playerId)
    }
    if (!raterParticipated) {
      throw new BadRequestException("You can only rate players from matches you participated in")
    }
    if (!playerParticipated) {
      throw new BadRequestException("You can only rate players who participated in the match")
    }

    // Check for existing rating
    const existingRating = await this.ratingsRepository.findOne({
      where: {
        rater: { id: raterId },
        player: { id: playerId },
        ...(matchType === MatchType.INCOMPLETE && { incompleteMatch: { id: matchId } }),
        ...(matchType === MatchType.TEAM_VS_TEAM && { teamVsTeamMatch: { id: matchId } }),
      },
    })
    if (existingRating) {
      throw new BadRequestException("You have already rated this player for this match")
    }

    // FETCH EXISTING RATINGS BEFORE SAVING THE NEW ONE
    const playerRatings = await this.ratingsRepository.find({
      where: { player: { id: playerId } },
    })

    // Create rating
    const rating = this.ratingsRepository.create({
      rater,
      player,
      ...(matchType === MatchType.INCOMPLETE && { incompleteMatch: { id: matchId } }),
      ...(matchType === MatchType.TEAM_VS_TEAM && { teamVsTeamMatch: { id: matchId } }),
      score,
    })

    const savedRating = await this.ratingsRepository.save(rating)
    this.logger.log(`Rating created: ${savedRating.id} for player ${playerId} in match ${matchId} (${matchType})`)

    // Calculate correct values using existing ratings + new rating
    const totalRatings = playerRatings.length + 1
    const ratingSum = playerRatings.reduce((sum, rating) => sum + rating.score, 0) + score
    const averageRating = Number((ratingSum / totalRatings).toFixed(2))
    await this.usersService.updateAverageRating(playerId, averageRating, totalRatings, ratingSum)

    // Notify player
    await this.notificationsService.create({
      userId: playerId,
      title: "New Rating",
      message:
        raterId === playerId
          ? `You rated yourself ${score}/10 for a ${matchType} match`
          : `You received a rating of ${score}/10 for a ${matchType} match`,
      type: "new_rating",
      relatedId: matchId,
    })

    return savedRating
  }

  async findUserRatings(userId: string): Promise<Rating[]> {
    return this.ratingsRepository.find({
      where: [{ rater: { id: userId } }, { player: { id: userId } }],
      relations: ["rater", "player", "incompleteMatch", "teamVsTeamMatch"],
    })
  }

  async findMatchRatings(matchId: string, matchType: MatchType, user: User): Promise<Rating[]> {
    let match: any
    switch (matchType) {
      case MatchType.INCOMPLETE:
        match = await this.incompleteMatchService.findOne(matchId)
        break
      case MatchType.TEAM_VS_TEAM:
        match = await this.teamVsTeamMatchService.findOne(matchId)
        break
      default:
        throw new BadRequestException("Invalid match type")
    }
    if (!match) {
      throw new BadRequestException(`Match with ID ${matchId} not found`)
    }

    // Check participation or admin role
    let userParticipated = false
    if (matchType === MatchType.TEAM_VS_TEAM) {
      const teamMembers = await this.teamsService.findMemberTeams(match.team.id)
      const opponentTeamMembers = match.opponentTeam
        ? await this.teamsService.findMemberTeams(match.opponentTeam.id)
        : []
      userParticipated = teamMembers.some((p) => p.id === user.id) || opponentTeamMembers.some((p) => p.id === user.id)
    } else {
      userParticipated = match.players.some((p) => p.id === user.id)
    }
    const isAdmin = user.role === UserRole.ADMIN
    if (!userParticipated && !isAdmin) {
      throw new ForbiddenException("You can only view ratings for matches you participated in")
    }

    return this.ratingsRepository.find({
      where: {
        ...(matchType === MatchType.INCOMPLETE && { incompleteMatch: { id: matchId } }),
        ...(matchType === MatchType.TEAM_VS_TEAM && { teamVsTeamMatch: { id: matchId } }),
      },
      relations: ["rater", "player"],
    })
  }

  async findReceivedRatings(userId: string): Promise<Rating[]> {
    return this.ratingsRepository.find({
      where: { player: { id: userId } },
      relations: ["rater", "incompleteMatch", "teamVsTeamMatch"],
    })
  }

  async findGivenRatings(userId: string, user: User): Promise<Rating[]> {
    if (userId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException("You can only view your own given ratings")
    }
    return this.ratingsRepository.find({
      where: { rater: { id: userId } },
      relations: ["player", "incompleteMatch", "teamVsTeamMatch"],
    })
  }

  async getAverageRatingByMatchType(userId: string, matchType: MatchType): Promise<number> {
    const ratings = await this.ratingsRepository.find({
      where: {
        player: { id: userId },
        ...(matchType === MatchType.INCOMPLETE && { incompleteMatch: { id: Not(IsNull()) } }),
        ...(matchType === MatchType.TEAM_VS_TEAM && { teamVsTeamMatch: { id: Not(IsNull()) } }),
      },
    })
    if (ratings.length === 0) return 0
    const totalScore = ratings.reduce((sum, rating) => sum + rating.score, 0)
    return Number((totalScore / ratings.length).toFixed(2))
  }
}
