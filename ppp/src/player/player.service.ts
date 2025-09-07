import { Injectable } from "@nestjs/common";
import { FullMatchService } from "../matches/full-match/full-match.service";
import { IncompleteMatchService } from "../matches/incomplete-match/incomplete-match.service";
import { TeamVsTeamMatchService } from "../matches/team-vs-team-match/team-vs-team-match.service";
import { TeamsService } from "../teams/teams.service";
import { RatingsService } from "../ratings/ratings.service";
import { UsersService } from "../users/users.service";

@Injectable()
export class PlayerService {
  constructor(
    private readonly fullMatchService: FullMatchService,
    private readonly incompleteMatchService: IncompleteMatchService,
    private readonly teamVsTeamMatchService: TeamVsTeamMatchService,
    private readonly teamsService: TeamsService,
    private readonly ratingsService: RatingsService,
    private readonly usersService: UsersService,
  ) {}

  async getDashboard(playerId: string) {
    // Get created matches
    const fullMatchesCreated = await this.fullMatchService.findAll();
    const incompleteMatchesCreated = await this.incompleteMatchService.findAll();
    const teamVsTeamMatchesCreated = await this.teamVsTeamMatchService.findAll();
    const createdMatches = [
      ...fullMatchesCreated.filter((m) => m.creator.id === playerId && !m.isDeleted),
      ...incompleteMatchesCreated.filter((m) => m.creator.id === playerId),
      ...teamVsTeamMatchesCreated.filter((m) => m.creator.id === playerId),
    ];

    // Get joined matches
    const memberTeams = await this.teamsService.findMemberTeams(playerId);
    const teamVsTeamMatchesJoined = await this.teamVsTeamMatchService.findAll();
    const incompleteMatchesJoined = await this.incompleteMatchService.findAll();
    const joinedMatches = [
      ...fullMatchesCreated.filter((m) => m.creator.id === playerId && !m.isDeleted),
      ...incompleteMatchesJoined.filter((m) => m.players.some((p) => p.id === playerId)),
      ...teamVsTeamMatchesJoined.filter(
        (m) =>
          m.team?.players?.some((p) => p.id === playerId) ||
          m.opponentTeam?.players?.some((p) => p.id === playerId),
      ),
    ];

    // Get captained and member teams
    const captainedTeams = await this.teamsService.findCaptainedTeams(playerId);
    const receivedRatings = await this.ratingsService.findReceivedRatings(playerId);

    // Get upcoming matches (next 7 days)
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const upcomingMatches = joinedMatches.filter((match) => {
      const matchDate = new Date(match.date);
      return matchDate >= today && matchDate <= nextWeek;
    });

    // Get user stats
    const user = await this.usersService.findOne(playerId, {
      relations: ["joinedMatches", "teams", "receivedRatings"],
    });

    return {
      totalCreatedMatches: createdMatches.length,
      totalJoinedMatches: joinedMatches.length,
      totalTeams: memberTeams.length,
      averageRating: user.averageRating || 0,
      totalRatings: user.totalRatings || 0,
      upcomingMatches,
    };
  }

  async getCreatedMatches(playerId: string) {
    const fullMatches = await this.fullMatchService.findAll();
    const incompleteMatches = await this.incompleteMatchService.findAll();
    const teamVsTeamMatches = await this.teamVsTeamMatchService.findAll();
    return [
      ...fullMatches.filter((m) => m.creator.id === playerId && !m.isDeleted),
      ...incompleteMatches.filter((m) => m.creator.id === playerId),
      ...teamVsTeamMatches.filter((m) => m.creator.id === playerId),
    ];
  }

  async getJoinedMatches(playerId: string) {
    const fullMatches = await this.fullMatchService.findAll();
    const incompleteMatches = await this.incompleteMatchService.findAll();
    const teamVsTeamMatches = await this.teamVsTeamMatchService.findAll();
    return [
      ...fullMatches.filter((m) => m.creator.id === playerId && !m.isDeleted),
      ...incompleteMatches.filter((m) => m.players.some((p) => p.id === playerId)),
      ...teamVsTeamMatches.filter(
        (m) =>
          m.team?.players?.some((p) => p.id === playerId) ||
          m.opponentTeam?.players?.some((p) => p.id === playerId),
      ),
    ];
  }

  async getCaptainedTeams(playerId: string) {
    return this.teamsService.findCaptainedTeams(playerId);
  }

  async getMemberTeams(playerId: string) {
    return this.teamsService.findMemberTeams(playerId);
  }

  async getReceivedRatings(playerId: string) {
    return this.ratingsService.findReceivedRatings(playerId);
  }

  async getGivenRatings(playerId: string, user: any) {
    return this.ratingsService.findGivenRatings(playerId, user);
  }

  async getProfile(playerId: string) {
    const user = await this.usersService.findOne(playerId, {
      relations: ["joinedMatches", "teams", "receivedRatings"],
    });
    const joinedMatches = await this.getJoinedMatches(playerId);
    const memberTeams = await this.teamsService.findMemberTeams(playerId);
    const receivedRatings = await this.ratingsService.findReceivedRatings(playerId);

    // Get recent ratings (top 5, sorted by createdAt)
    const recentRatings = receivedRatings
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    return {
      user,
      stats: {
        totalMatches: joinedMatches.length,
        totalTeams: memberTeams.length,
        averageRating: user.averageRating || 0,
        totalRatings: user.totalRatings || 0,
      },
      recentRatings,
    };
  }
}