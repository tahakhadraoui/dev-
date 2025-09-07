import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TerrainController } from './terrain.controller';
import { Terrain } from './terrain.entity';
import { Field } from '../fields/entities/field.entity';
import { Reservation } from 'src/reservations/entities/reservation.entity';
import { TerrainsService } from './terrain.service';
import { FieldsModule } from 'src/fields/fields.module';

@Module({
imports: [
    TypeOrmModule.forFeature([Terrain, Reservation, Field]),
    forwardRef(() => FieldsModule), 
  ],
  controllers: [TerrainController],
  providers: [TerrainsService,],
  exports: [TerrainsService],
})
export class TerrainModule {}
