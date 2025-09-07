import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationResponseDto } from './dto/notification-response-dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
    private readonly usersService: UsersService,
  ) {}

  async create(dto: CreateNotificationDto): Promise<Notification> {
    const user = await this.usersService.findOne(dto.userId);
    if (!user) {
      this.logger.error(`User not found: ${dto.userId}`);
      throw new NotFoundException('User not found');
    }

    const notification = this.notificationsRepository.create({
      userId: dto.userId,
      title: dto.title,
      message: dto.message,
      type: dto.type,
      relatedId: dto.relatedId,
      isRead: false,
    });

    return this.notificationsRepository.save(notification);
  }

  async findByUser(userId: string, isRead: boolean | null = null): Promise<NotificationResponseDto[]> {
    const notifications = await this.notificationsRepository.find({
      where: { userId, ...(isRead !== null && { isRead }) },
      order: { createdAt: 'DESC' },
      relations: ['user'], // Include user relation for id, firstName, lastName
    });

    return notifications.map(notification => ({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      user: {
        id: notification.user.id,
        firstName: notification.user.firstName,
        lastName: notification.user.lastName,
      },
    }));
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const notification = await this.notificationsRepository.findOne({
      where: { id: notificationId, userId },
    });
    if (!notification) {
      this.logger.error(`Notification not found or not authorized: ${notificationId}`);
      throw new NotFoundException('Notification not found or not authorized');
    }
    notification.isRead = true;
    await this.notificationsRepository.save(notification);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationsRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );
  }
}