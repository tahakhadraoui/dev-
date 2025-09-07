import { Controller, Get, Patch, Param, UseGuards, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationResponseDto } from './dto/notification-response-dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiProperty } from '@nestjs/swagger';
import { ParseUUIDPipe } from '@nestjs/common';
import { IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

class NotificationQueryDto {
  @ApiProperty({ description: 'Filter by read status (true/false)', required: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isRead?: boolean;
}

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get notifications for the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of notifications', type: [NotificationResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'isRead', type: Boolean, required: false, description: 'Filter by read status' })
  @Get()
  @UseGuards(JwtAuthGuard)
  async findUserNotifications(@GetUser() user: User, @Query() query: NotificationQueryDto): Promise<NotificationResponseDto[]> {
    return this.notificationsService.findByUser(user.id, query.isRead ?? null);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 400, description: 'Invalid notification ID' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Notification not found or not authorized' })
  @ApiParam({ name: 'notificationId', description: 'ID of the notification (UUID)', type: String })
  @Patch(':notificationId/read')
  @UseGuards(JwtAuthGuard)
  async markAsRead(@Param('notificationId', ParseUUIDPipe) notificationId: string, @GetUser() user: User): Promise<void> {
    return this.notificationsService.markAsRead(notificationId, user.id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark all notifications as read for the authenticated user' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Patch('read-all')
  @UseGuards(JwtAuthGuard)
  async markAllAsRead(@GetUser() user: User): Promise<void> {
    return this.notificationsService.markAllAsRead(user.id);
  }
}