import { ApiProperty } from "@nestjs/swagger"
import { IsString, IsDateString, Matches } from "class-validator"

export class UpdateTimeSlotDtos {
  @ApiProperty({ description: "Match date in YYYY-MM-DD format" })
  @IsDateString()
  date: string

  @ApiProperty({ description: "Start time in HH:MM format" })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: "Start time must be in HH:MM format" })
  startTime: string

  @ApiProperty({ description: "End time in HH:MM format" })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: "End time must be in HH:MM format" })
  endTime: string
}
