import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FullMatchService } from './full-match.service';
import { FullMatchController } from './full-match.controller';
import { User } from 'src/users/entities/user.entity';
import { Reservation } from 'src/reservations/entities/reservation.entity';
import { FieldsModule } from 'src/fields/fields.module';
import { ReservationsModule } from 'src/reservations/reservations.module';
import { AuthModule } from 'src/auth/auth.module';
import { FullMatch } from './full-match.entity';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FullMatch, User, Reservation]),
    FieldsModule,
    NotificationsModule,
    ReservationsModule,
    AuthModule,
  ],
  controllers: [FullMatchController],
  providers: [FullMatchService],
  exports: [FullMatchService],
})
export class FullMatchModule {}