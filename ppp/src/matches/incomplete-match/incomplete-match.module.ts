import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IncompleteMatchService } from './incomplete-match.service';
import { IncompleteMatchController } from './incomplete-match.controller';
import { User } from 'src/users/entities/user.entity';
import { Reservation } from 'src/reservations/entities/reservation.entity';
import { FieldsModule } from 'src/fields/fields.module';
import { ReservationsModule } from 'src/reservations/reservations.module';
import { AuthModule } from 'src/auth/auth.module';
import { IncompleteMatch } from './incomplete-match.entity';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([IncompleteMatch, User, Reservation]),
    FieldsModule,
    NotificationsModule,
    ReservationsModule,
    AuthModule,
  ],
  controllers: [IncompleteMatchController],
  providers: [IncompleteMatchService],
  exports: [IncompleteMatchService],
})
export class IncompleteMatchModule {}