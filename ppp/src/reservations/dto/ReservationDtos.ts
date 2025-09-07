import { IsString, IsNotEmpty, IsEnum, IsOptional, Matches, IsNumber, Min } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"
import { ReservationStatus } from "src/common/enums/reservation-status.enum"

export class CreateReservationDto {
  @ApiProperty({ example: "field123" })
  @IsString()
  @IsNotEmpty()
  fieldId: string

  @ApiProperty({ example: "2025-05-24" })
  @IsString()
  @IsNotEmpty()
  date: string

  @ApiProperty({ example: "14:00" })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: "startTime must be in HH:mm format" })
  startTime: string

  @ApiProperty({ example: "15:15" })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: "endTime must be in HH:mm format" })
  endTime: string

  @ApiProperty({ example: ReservationStatus.PENDING, enum: ReservationStatus })
  @IsEnum(ReservationStatus)
  @IsOptional()
  reservedStatus?: ReservationStatus

  @ApiProperty({ example: "Awaiting approval" })
  @IsString()
  @IsOptional()
  statusComment?: string

  @ApiProperty({ example: "match101" })
  @IsString()
  @IsOptional()
  matchId?: string

  @ApiProperty({ example: "+1234567890" })
  @IsString()
  @IsOptional()
  phoneNumber?: string
}

export class CreateOwnerReservationDto {
  @ApiProperty({ example: "field123" })
  @IsString()
  @IsNotEmpty()
  fieldId: string

  @ApiProperty({ example: "2025-05-24" })
  @IsString()
  @IsNotEmpty()
  date: string

  @ApiProperty({ example: "14:00" })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: "startTime must be in HH:mm format" })
  startTime: string

  @ApiProperty({ example: "15:20" })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: "endTime must be in HH:mm format" })
  endTime: string

  @ApiProperty({ example: "terrain001" })
  @IsString()
  @IsNotEmpty()
  terrainId: string

  @ApiProperty({ example: "Phone booking" })
  @IsString()
  @IsOptional()
  statusComment?: string

  @ApiProperty({ example: "+1234567890" })
  @IsString()
  @IsOptional()
  phoneNumber?: string
}

export class CreateAbonnementDto {
  @ApiProperty({ example: "field123" })
  @IsString()
  @IsNotEmpty()
  fieldId: string

  @ApiProperty({ example: "2025-05-24" })
  @IsString()
  @IsNotEmpty()
  startDate: string

  @ApiProperty({ example: "14:00" })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: "startTime must be in HH:mm format" })
  startTime: string

  @ApiProperty({ example: "15:20" })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: "endTime must be in HH:mm format" })
  endTime: string

  @ApiProperty({ example: "terrain001" })
  @IsString()
  @IsNotEmpty()
  terrainId: string

  @ApiProperty({ example: 4 })
  @IsNumber()
  @Min(1)
  weeks: number

  @ApiProperty({ example: "Weekly team booking" })
  @IsString()
  @IsOptional()
  statusComment?: string

  @ApiProperty({ example: "+1234567890" })
  @IsString()
  @IsOptional()
  phoneNumber?: string
}

export class UpdateReservationDto {
  @ApiProperty({ example: "field123" })
  @IsString()
  @IsOptional()
  fieldId?: string

  @ApiProperty({ example: "2025-05-24" })
  @IsString()
  @IsOptional()
  date?: string

  @ApiProperty({ example: "14:00" })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: "startTime must be in HH:mm format" })
  @IsOptional()
  startTime?: string

  @ApiProperty({ example: "15:20" })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: "endTime must be in HH:mm format" })
  @IsOptional()
  endTime?: string

  @ApiProperty({ example: "terrain001" })
  @IsString()
  @IsOptional()
  terrainId?: string

  @ApiProperty({ example: ReservationStatus.APPROVED, enum: ReservationStatus })
  @IsEnum(ReservationStatus)
  @IsOptional()
  reservedStatus?: ReservationStatus

  @ApiProperty({ example: "Updated comment" })
  @IsString()
  @IsOptional()
  statusComment?: string

  @ApiProperty({ example: "+1234567890" })
  @IsString()
  @IsOptional()
  phoneNumber?: string
}

export class UpdateAbonnementDto {
  @ApiProperty({ example: "field123" })
  @IsString()
  @IsNotEmpty()
  fieldId: string

  @ApiProperty({ example: "2025-05-24" })
  @IsString()
  @IsNotEmpty()
  startDate: string

  @ApiProperty({ example: "14:00" })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: "startTime must be in HH:mm format" })
  @IsOptional()
  startTime?: string

  @ApiProperty({ example: "15:20" })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: "endTime must be in HH:mm format" })
  @IsOptional()
  endTime?: string

  @ApiProperty({ example: "terrain001" })
  @IsString()
  @IsOptional()
  terrainId?: string

  @ApiProperty({ example: "Weekly team booking updated" })
  @IsString()
  @IsOptional()
  statusComment?: string

  @ApiProperty({ example: "+1234567890" })
  @IsString()
  @IsOptional()
  phoneNumber?: string
}

export class ApproveReservationDto {
  @ApiProperty({ example: "terrain001" })
  @IsString()
  @IsNotEmpty()
  terrainId: string

  @ApiProperty({ example: "Approved for Terrain 1" })
  @IsString()
  @IsOptional()
  statusComment?: string
}

export class ResponseReservationDto {
  @ApiProperty({ example: "res789" })
  id: string

  @ApiProperty({ example: "field456" })
  fieldId: string

  @ApiProperty({ example: "2025-05-24" })
  date: string

  @ApiProperty({ example: "14:00" })
  startTime: string

  @ApiProperty({ example: "15:20" })
  endTime: string

  @ApiProperty({ example: ReservationStatus.APPROVED, enum: ReservationStatus })
  reservedStatus: ReservationStatus

  @ApiProperty({ example: "Approved for Terrain 1" })
  statusComment?: string

  @ApiProperty({ example: { id: "terrain001", name: "Terrain 1" } })
  terrain?: { id: string; name?: string }

  @ApiProperty({ example: { id: "match101", title: "Friendly Match" } })
  match?: { id: string; title?: string }

  @ApiProperty({ example: "+1234567890" })
  phoneNumber?: string

  @ApiProperty({
    example: {
      id: "user789",
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      username: "johndoe",
    },
  })
  user?: {
    id: string
    firstName?: string
    lastName?: string
    email?: string
    username?: string
  }

  @ApiProperty({
    example: {
      id: "field123",
      name: "Soccer Field Central",
      city: "New York",
      address: "123 Main Street",
      pricePerHour: 50,
    },
  })
  field?: {
    id: string
    name?: string
    city?: string
    address?: string
    pricePerHour?: number
  }

  @ApiProperty({ example: "2025-01-08T10:30:00Z" })
  createdAt?: Date

  @ApiProperty({ example: "2025-01-08T14:45:00Z" })
  updatedAt?: Date

  constructor(reservation: any) {
    this.id = reservation.id
    this.fieldId = reservation.field?.id || "unknown"
    this.date = reservation.date
    this.startTime = reservation.startTime
    this.endTime = reservation.endTime
    this.reservedStatus = reservation.reservedStatus
    this.statusComment = reservation.statusComment
    this.phoneNumber = reservation.phoneNumber
    this.createdAt = reservation.createdAt
    this.updatedAt = reservation.updatedAt

    // Enhanced terrain information
    this.terrain = reservation.terrain
      ? {
          id: reservation.terrain.id,
          name: reservation.terrain.name || `Terrain ${reservation.terrain.id}`,
        }
      : undefined

    // Enhanced match information
    this.match = reservation.match
      ? {
          id: reservation.match.id,
          title: reservation.match.title || reservation.match.name || `Match ${reservation.match.id}`,
        }
      : reservation.incompleteMatch
        ? {
            id: reservation.incompleteMatch.id,
            title:
              reservation.incompleteMatch.title ||
              reservation.incompleteMatch.name ||
              `Match ${reservation.incompleteMatch.id}`,
          }
        : reservation.teamVsTeamMatch
          ? {
              id: reservation.teamVsTeamMatch.id,
              title:
                reservation.teamVsTeamMatch.title ||
                reservation.teamVsTeamMatch.name ||
                `Match ${reservation.teamVsTeamMatch.id}`,
            }
          : undefined

    // Enhanced user information with fallbacks
    this.user = reservation.user
      ? {
          id: reservation.user.id,
          firstName: reservation.user.firstName,
          lastName: reservation.user.lastName,
          email: reservation.user.email,
          username: reservation.user.username,
        }
      : undefined

    // Enhanced field information
    this.field = reservation.field
      ? {
          id: reservation.field.id,
          name: reservation.field.name,
          city: reservation.field.city,
          address: reservation.field.address,
          pricePerHour: reservation.field.pricePerHour,
        }
      : undefined
  }
}
