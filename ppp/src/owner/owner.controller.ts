import { Controller, Get, UseGuards } from "@nestjs/common"
import  { OwnerService } from "./owner.service"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { RolesGuard } from "../common/guards/roles.guard"
import { Roles } from "../common/decorators/roles.decorator"
import { UserRole } from "../common/enums/user-role.enum"
import { GetUser } from "../common/decorators/get-user.decorator"
import  { User } from "../users/entities/user.entity"
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger"

@ApiTags("owner")
@Controller("owner")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER)
@ApiBearerAuth()
export class OwnerController {
  constructor(private readonly ownerService: OwnerService) {}

  @Get('dashboard')
  getDashboard(@GetUser() user: User) {
    return this.ownerService.getDashboard(user.id);
  }

  @Get('fields')
  getFields(@GetUser() user: User) {
    return this.ownerService.getFields(user.id);
  }

  @Get('reservations')
  getReservations(@GetUser() user: User) {
    return this.ownerService.getReservations(user.id);
  }

  @Get('reservations/pending')
  getPendingReservations(@GetUser() user: User) {
    return this.ownerService.getPendingReservations(user.id);
  }

  @Get('statistics')
  getStatistics(@GetUser() user: User) {
    return this.ownerService.getStatistics(user.id);
  }

  @Get('calendar')
  getCalendar(@GetUser() user: User) {
    return this.ownerService.getCalendar(user.id);
  }
}
