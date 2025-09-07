import { Controller, Get, Post, Body, Param, Query, UseGuards, ValidationPipe } from '@nestjs/common';
import { RatingsService } from './ratings.service';
import { CreateRatingDto, MatchType } from './dto/create-rating.dto';
import { Rating } from './entities/rating.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from '../users/entities/user.entity';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ParseUUIDPipe } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

class FindMatchRatingsQuery {
  @ApiProperty({ enum: MatchType, description: 'Type of the match (INCOMPLETE or TEAM_VS_TEAM)' })
  @IsEnum(MatchType)
  matchType: MatchType;
}

@ApiTags('ratings')
@Controller('ratings')
@ApiBearerAuth()

export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new rating for a player in a completed match' })
  @ApiResponse({ status: 201, description: 'Rating created successfully', type: Rating })
  @ApiResponse({ status: 400, description: 'Invalid input, match not ended, or already rated' })
  @ApiResponse({ status: 403, description: 'Forbidden: Only players can rate' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLAYER)
  create(@Body(ValidationPipe) createRatingDto: CreateRatingDto, @GetUser() user: User) {
    return this.ratingsService.create(createRatingDto, user.id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all ratings given or received by a user' })
  @ApiResponse({ status: 200, description: 'List of ratings', type: [Rating] })
  @ApiResponse({ status: 400, description: 'Invalid user ID' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiParam({ name: 'userId', description: 'ID of the user (UUID)', type: String })
  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  findUserRatings(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.ratingsService.findUserRatings(userId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all ratings for a specific match (requires participation or admin role)' })
  @ApiResponse({ status: 200, description: 'List of ratings for the match', type: [Rating] })
  @ApiResponse({ status: 400, description: 'Invalid match ID or match type' })
  @ApiResponse({ status: 403, description: 'Forbidden: Must be a participant or admin' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiParam({ name: 'matchId', description: 'ID of the match (UUID)', type: String })
  @ApiQuery({ name: 'matchType', enum: MatchType, description: 'Type of the match (INCOMPLETE or TEAM_VS_TEAM)' })
  @Get('match/:matchId')
  @UseGuards(JwtAuthGuard)
  findMatchRatings(
    @Param('matchId', ParseUUIDPipe) matchId: string,
    @Query(ValidationPipe) query: FindMatchRatingsQuery,
    @GetUser() user: User,
  ) {
    return this.ratingsService.findMatchRatings(matchId, query.matchType, user);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all ratings received by a user' })
  @ApiResponse({ status: 200, description: 'List of received ratings', type: [Rating] })
  @ApiResponse({ status: 400, description: 'Invalid user ID' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiParam({ name: 'userId', description: 'ID of the user (UUID)', type: String })
  @Get('user/:userId/received')
  @UseGuards(JwtAuthGuard)
  findReceivedRatings(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.ratingsService.findReceivedRatings(userId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all ratings given by a user (only accessible by the user or admin)' })
  @ApiResponse({ status: 200, description: 'List of given ratings', type: [Rating] })
  @ApiResponse({ status: 400, description: 'Invalid user ID' })
  @ApiResponse({ status: 403, description: 'Forbidden: Only the user or admin can view given ratings' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiParam({ name: 'userId', description: 'ID of the user (UUID)', type: String })
  @Get('user/:userId/given')
  @UseGuards(JwtAuthGuard)
  findGivenRatings(@Param('userId', ParseUUIDPipe) userId: string, @GetUser() user: User) {
    return this.ratingsService.findGivenRatings(userId, user);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: "Get a user's average rating for a specific match type" })
  @ApiResponse({ status: 200, description: 'Average rating (number)', type: Number })
  @ApiResponse({ status: 400, description: 'Invalid user ID or match type' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiParam({ name: 'userId', description: 'ID of the user (UUID)', type: String })
  @ApiQuery({ name: 'matchType', enum: MatchType, description: 'Type of the match (INCOMPLETE or TEAM_VS_TEAM)' })
  @Get('user/:userId/average')
  @UseGuards(JwtAuthGuard)
  getAverageRating(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query(ValidationPipe) query: FindMatchRatingsQuery,
  ) {
    return this.ratingsService.getAverageRatingByMatchType(userId, query.matchType);
  }
}