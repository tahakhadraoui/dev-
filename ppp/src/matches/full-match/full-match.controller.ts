import { Controller, Get, Post, Patch, Delete, Param, UseGuards, HttpCode, HttpStatus, Req, Body } from "@nestjs/common"
import  { FullMatchService } from "./full-match.service"
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard"
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger"
import {  CreateFullMatchDto, ResponseFullMatchDto, type UpdateFullMatchDto } from "./full-match.dto/FullMatchDtos"
import { UpdateTimeSlotDtos } from "./full-match.dto/update-time-slot.dto"

@ApiTags("full-matches")
@Controller("full-matches")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FullMatchController {
  constructor(private readonly fullMatchService: FullMatchService) {}

  @Post()
  @ApiOperation({ summary: "Create a new full match" })
  @ApiResponse({ status: 201, description: "Match created", type: ResponseFullMatchDto })
  @ApiResponse({ status: 400, description: "Invalid input" })
  async create(@Body() createFullMatchDto: CreateFullMatchDto, @Req() req): Promise<ResponseFullMatchDto> {
    const match = await this.fullMatchService.create(createFullMatchDto, req.user)
    return new ResponseFullMatchDto(match)
  }

  @Get()
  @ApiOperation({ summary: "Get all full matches created by current user" })
  @ApiResponse({ status: 200, description: "List of user matches", type: [ResponseFullMatchDto] })
  async findAll(@Req() req): Promise<ResponseFullMatchDto[]> {
    return this.fullMatchService.findAllByCreator(req.user.id)
  }

  @Get("all")
  @ApiOperation({ summary: "Get all full matches (admin only)" })
  @ApiResponse({ status: 200, description: "List of all matches", type: [ResponseFullMatchDto] })
  async findAllMatches(): Promise<ResponseFullMatchDto[]> {
    return this.fullMatchService.findAll()
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a specific full match" })
  @ApiResponse({ status: 200, description: "Match details", type: ResponseFullMatchDto })
  @ApiResponse({ status: 404, description: "Match not found" })
  @ApiResponse({ status: 403, description: "Access denied - not your match" })
  async findOne(@Param('id') id: string, @Req() req): Promise<ResponseFullMatchDto> {
    return this.fullMatchService.findOne(id, req.user.id)
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a full match" })
  @ApiResponse({ status: 200, description: "Match updated", type: ResponseFullMatchDto })
  @ApiResponse({ status: 403, description: "Only creator can update" })
  async update(@Param('id') id: string, @Body() updateFullMatchDto: UpdateFullMatchDto, @Req() req): Promise<ResponseFullMatchDto> {
    updateFullMatchDto.id = id
    const match = await this.fullMatchService.update(id, updateFullMatchDto, req.user)
    return new ResponseFullMatchDto(match)
  }

@Patch(":id/time-slot")
@ApiOperation({ summary: "Update full match time slot" })
@ApiResponse({ status: 200, description: "Time slot updated", type: ResponseFullMatchDto })
@ApiResponse({ status: 403, description: "Only creator can update" })
@ApiResponse({ status: 400, description: "Invalid input" })
async updateTimeSlot(
  @Param('id') id: string,
  @Body() updateTimeSlotDto: UpdateTimeSlotDtos, // Use UpdateTimeSlotDtos
  @Req() req,
): Promise<ResponseFullMatchDto> {
  const match = await this.fullMatchService.updateTimeSlot(
    { id, ...updateTimeSlotDto }, // Pass id and DTO properties
    req.user,
  );
  return new ResponseFullMatchDto(match);
}

  @Patch(":id/cancel")
  @ApiOperation({ summary: "Cancel a full match" })
  @ApiResponse({ status: 200, description: "Match cancelled", type: ResponseFullMatchDto })
  @ApiResponse({ status: 403, description: "Only creator can cancel" })
  async cancel(@Param('id') id: string, @Req() req): Promise<ResponseFullMatchDto> {
    const match = await this.fullMatchService.cancel(id, req.user)
    return new ResponseFullMatchDto(match)
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Soft delete a full match" })
  @ApiResponse({ status: 204, description: "Match deleted" })
  @ApiResponse({ status: 403, description: "Only creator can delete" })
  async remove(@Param('id') id: string, @Req() req): Promise<void> {
    return this.fullMatchService.remove(id, req.user)
  }
}
