import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller"; 
import { User } from "./entities/user.entity";
import { Order } from "src/order/entities/order.entity";

@Module({
  imports: [TypeOrmModule.forFeature([User,Order])],
  controllers: [UsersController], 
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule], 
})
export class UsersModule {}