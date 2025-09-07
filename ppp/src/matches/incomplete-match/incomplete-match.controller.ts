import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { IncompleteMatchService } from './incomplete-match.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { IncompleteMatchResponseDto } from './incomplete-match.dtos/incomplete-match-response-dto';
import { CreateIncompleteMatchDto } from './incomplete-match.dtos/create-incomplete-match.dto';
import { JoinRequestDto } from './incomplete-match.dtos/join-request.dto';
import { ApproveJoinRequestDto } from './incomplete-match.dtos/approve-join-request.dto';
import { InvitePlayerDto } from './incomplete-match.dtos/invite-player.dto';
import { UpdateIncompleteMatchDto } from './incomplete-match.dtos/update-incomplete-match.dto';
import { UpdateTimeslotDto } from './incomplete-match.dtos/update-time-slot.dto';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { User } from 'src/users/entities/user.entity';

@ApiTags('incomplete-matches')
@Controller('incomplete-matches')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class IncompleteMatchController {
  constructor(private readonly incompleteMatchService: IncompleteMatchService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new incomplete match' })
  @ApiResponse({ status: 201, description: 'Match created', type: IncompleteMatchResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(
    @Body() createIncompleteMatchDto: CreateIncompleteMatchDto,
    @Request() req,
  ): Promise<IncompleteMatchResponseDto> {
    return this.incompleteMatchService.create(createIncompleteMatchDto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all incomplete matches' })
  @ApiResponse({ status: 200, description: 'List of matches', type: [IncompleteMatchResponseDto] })
  async findAll(): Promise<IncompleteMatchResponseDto[]> {
    return this.incompleteMatchService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific incomplete match' })
  @ApiResponse({ status: 200, description: 'Match details', type: IncompleteMatchResponseDto })
  @ApiResponse({ status: 404, description: 'Match not found' })
  async findOne(@Param('id') id: string): Promise<IncompleteMatchResponseDto> {
    return this.incompleteMatchService.findOne(id);
  }

  @Post('join')
  @ApiOperation({ summary: 'Request to join a match' })
  @ApiResponse({ status: 200, description: 'Join request submitted', type: IncompleteMatchResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async requestToJoin(@Body() joinRequestDto: JoinRequestDto, @Request() req): Promise<IncompleteMatchResponseDto> {
    return this.incompleteMatchService.requestToJoin(joinRequestDto, req.user);
  }

  @Post('approve')
  @ApiOperation({ summary: 'Approve a join request' })
  @ApiResponse({ status: 200, description: 'Join request approved', type: IncompleteMatchResponseDto })
  @ApiResponse({ status: 403, description: 'Only creator can approve' })
  async approveJoinRequest(
    @Body() approveJoinRequestDto: ApproveJoinRequestDto,
    @Request() req,
  ): Promise<IncompleteMatchResponseDto> {
    return this.incompleteMatchService.approveJoinRequest(approveJoinRequestDto, req.user);
  }

  @Post('decline')
  @ApiOperation({ summary: 'Decline a join request' })
  @ApiResponse({ status: 200, description: 'Join request declined', type: IncompleteMatchResponseDto })
  @ApiResponse({ status: 403, description: 'Only creator can decline' })
  async declineJoinRequest(
    @Body() approveJoinRequestDto: ApproveJoinRequestDto,
    @Request() req,
  ): Promise<IncompleteMatchResponseDto> {
    return this.incompleteMatchService.declineJoinRequest(approveJoinRequestDto, req.user);
  }

  @Post('invite')
  @ApiOperation({ summary: 'Invite a player to a match' })
  @ApiResponse({ status: 200, description: 'Player invited', type: IncompleteMatchResponseDto })
  @ApiResponse({ status: 403, description: 'Only creator can invite' })
  async invitePlayer(@Body() invitePlayerDto: InvitePlayerDto, @Request() req): Promise<IncompleteMatchResponseDto> {
    return this.incompleteMatchService.invitePlayer(invitePlayerDto, req.user);
  }

  @Post(':id/accept-invitation')
  @ApiOperation({ summary: 'Accept a match invitation' })
  @ApiResponse({ status: 200, description: 'Invitation accepted', type: IncompleteMatchResponseDto })
  @ApiResponse({ status: 400, description: 'Not invited or already joined' })
  @ApiResponse({ status: 404, description: 'Match not found' })
  async acceptInvitation(@Param('id') id: string, @GetUser() user: User): Promise<IncompleteMatchResponseDto> {
    return this.incompleteMatchService.acceptInvitation(id, user);
  }

  @Post(':id/decline-invitation')
  @ApiOperation({ summary: 'Decline a match invitation' })
  @ApiResponse({ status: 200, description: 'Invitation declined', type: IncompleteMatchResponseDto })
  @ApiResponse({ status: 400, description: 'Not invited' })
  @ApiResponse({ status: 404, description: 'Match not found' })
  async declineInvitation(@Param('id') id: string, @GetUser() user: User): Promise<IncompleteMatchResponseDto> {
    return this.incompleteMatchService.declineInvitation(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a match' })
  @ApiResponse({ status: 200, description: 'Match updated', type: IncompleteMatchResponseDto })
  @ApiResponse({ status: 403, description: 'Only creator can update' })
  async update(
    @Param('id') id: string,
    @Body() updateIncompleteMatchDto: UpdateIncompleteMatchDto,
    @Request() req,
  ): Promise<IncompleteMatchResponseDto> {
    return this.incompleteMatchService.update(id, updateIncompleteMatchDto, req.user);
  }

  @Patch(':id/time-slot')
  @ApiOperation({ summary: 'Update match time slot' })
  @ApiResponse({ status: 200, description: 'Time slot updated', type: IncompleteMatchResponseDto })
  @ApiResponse({ status: 403, description: 'Only creator can update' })
  async updateTimeSlot(
    @Param('id') id: string,
    @Body() updateTimeSlotDto: UpdateTimeslotDto,
    @Request() req,
  ): Promise<IncompleteMatchResponseDto> {
    if (updateTimeSlotDto.matchId !== id) {
      throw new BadRequestException('matchId in body must match URL parameter');
    }
    return this.incompleteMatchService.updateTimeSlot(updateTimeSlotDto, req.user);
  }

  @Post(':id/leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Leave a match' })
  @ApiResponse({ status: 200, description: 'Left match', type: IncompleteMatchResponseDto })
  @ApiResponse({ status: 400, description: 'Not a player in this match' })
  async leaveMatch(@Param('id') id: string, @Request() req): Promise<IncompleteMatchResponseDto> {
    return this.incompleteMatchService.leaveMatch(id, req.user);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a match' })
  @ApiResponse({ status: 200, description: 'Match cancelled', type: IncompleteMatchResponseDto })
  @ApiResponse({ status: 403, description: 'Only creator can cancel' })
  async cancel(@Param('id') id: string, @Request() req): Promise<IncompleteMatchResponseDto> {
    return this.incompleteMatchService.cancel(id, req.user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a match' })
  @ApiResponse({ status: 204, description: 'Match deleted' })
  @ApiResponse({ status: 403, description: 'Only creator can delete' })
  async remove(@Param('id') id: string, @Request() req): Promise<void> {
    return this.incompleteMatchService.remove(id, req.user);
  }

  @Delete(':id/players/:playerId')
  @ApiOperation({ summary: 'Remove a player from a match' })
  @ApiResponse({ status: 200, description: 'Player removed', type: IncompleteMatchResponseDto })
  @ApiResponse({ status: 403, description: 'Only creator can remove players' })
  async removePlayerFromMatch(
    @Param('id') matchId: string,
    @Param('playerId') playerId: string,
    @GetUser() user: User,
  ): Promise<IncompleteMatchResponseDto> {
    return this.incompleteMatchService.removePlayerFromMatch(matchId, playerId, user);
  }
}