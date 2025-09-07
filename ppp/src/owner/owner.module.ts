import { Module } from "@nestjs/common"
import { OwnerService } from "./owner.service"
import { OwnerController } from "./owner.controller"
import { FieldsModule } from "../fields/fields.module"
import { ReservationsModule } from "../reservations/reservations.module"
import { TypeOrmModule } from "@nestjs/typeorm"
import { Field } from "../fields/entities/field.entity"
import { Reservation } from "../reservations/entities/reservation.entity"

@Module({
  imports: [TypeOrmModule.forFeature([Field, Reservation]), FieldsModule, ReservationsModule],
  controllers: [OwnerController],
  providers: [OwnerService],
})
export class OwnerModule {}
