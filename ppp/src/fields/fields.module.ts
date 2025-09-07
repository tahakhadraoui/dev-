import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FieldsService } from './fields.service';
import { Field } from './entities/field.entity';
import { Terrain } from '../terrain/terrain.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { UsersModule } from '../users/users.module';
import { TerrainModule } from 'src/terrain/terrain.module';
import { FieldsController } from './fields.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Field, Terrain, Reservation]),
    UsersModule,
    forwardRef(() => TerrainModule),
  ],
  controllers: [FieldsController],
  providers: [FieldsService],
  exports: [FieldsService],
})
export class FieldsModule {}