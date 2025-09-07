import { Controller, Get, Patch, Param, Body, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { UserRole } from "../common/enums/user-role.enum";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UpdateUserDto } from "../users/dto/update-user.dto";
import { AdminService } from "./admin.service";

@ApiTags("admin")
@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("users")
  findAllUsers() {
    return this.adminService.findAllUsers();
  }

  @Get("users/owners")
  findAllOwners() {
    return this.adminService.findAllOwners();
  }

  @Get("users/players")
  findAllPlayers() {
    return this.adminService.findAllPlayers();
  }

  @Patch("users/:id")
  updateUser(@Param("id") id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.adminService.updateUser(id, updateUserDto);
  }

  @Patch("users/:id/activate")
  activateUser(@Param("id") id: string) {
    return this.adminService.activateUser(id);
  }

  @Patch("users/:id/deactivate")
  deactivateUser(@Param("id") id: string) {
    return this.adminService.deactivateUser(id);
  }

  @Get("matches")
  findAllMatches() {
    return this.adminService.findAllMatches();
  }

  @Get("reservations")
  findAllReservations() {
    return this.adminService.findAllReservations();
  }

  @Get("fields")
  findAllFields() {
    return this.adminService.findAllFields();
  }

  @Get("statistics")
  getStatistics() {
    return this.adminService.getStatistics();
  }
}