import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsEnum, Matches, IsUUID } from 'class-validator';
import { MatchStatus } from 'src/common/enums/match-status.enum';
import { MatchType } from 'src/common/enums/match-type.enum';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFullMatchDto {
  @ApiProperty({ example: 'Friendly Match' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'New York' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: '2025-07-10' })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ example: '14:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime must be in HH:mm format' })
  startTime: string;

  @ApiProperty({ example: '15:30' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime must be in HH:mm format' })
  endTime: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isPublic: boolean;

  @ApiProperty({ example: 'field456' })
  @IsString()
  @IsNotEmpty()
  fieldId: string;

  @ApiProperty({ example: 'John Doe', required: false })
  @IsString()
  @IsOptional()
  creatorFullName?: string;

  @ApiProperty({ example: 'A friendly soccer match', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: '+1234567890' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+\d{8,15}$/, { message: 'contactPhone must be a valid phone number starting with + followed by 8-15 digits' })
  contactPhone: string;
}

export class UpdateFullMatchDto {
  @ApiProperty({ example: 'match101', required: false })
  @IsUUID()
  @IsOptional()
  id?: string;

  @ApiProperty({ example: 'Updated Match Title', required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ example: 'Los Angeles', required: false })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ example: '2025-07-11', required: false })
  @IsString()
  @IsOptional()
  date?: string;

  @ApiProperty({ example: '15:00', required: false })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime must be in HH:mm format' })
  @IsOptional()
  startTime?: string;

  @ApiProperty({ example: '16:30', required: false })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime must be in HH:mm format' })
  @IsOptional()
  endTime?: string;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiProperty({ example: 'field789', required: false })
  @IsString()
  @IsOptional()
  fieldId?: string;

  @ApiProperty({ example: 'Jane Doe', required: false })
  @IsString()
  @IsOptional()
  creatorFullName?: string;

  @ApiProperty({ example: 'Updated description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: '+0987654321', required: false })
  @IsString()
  @Matches(/^\+\d{8,15}$/, { message: 'contactPhone must be a valid phone number starting with + followed by 8-15 digits' })
  @IsOptional()
  contactPhone?: string;

  @ApiProperty({ enum: MatchStatus, required: false })
  @IsEnum(MatchStatus)
  @IsOptional()
  status?: MatchStatus;
}

export class ResponseFullMatchDto {
  @ApiProperty({ example: 'match101' })
  id: string;

  @ApiProperty({ enum: MatchType, example: MatchType.FULL })
  type: MatchType;

  @ApiProperty({ example: 'Friendly Match' })
  title: string;

  @ApiProperty({ example: 'New York' })
  city: string;

  @ApiProperty({ example: 'A friendly soccer match', required: false })
  description?: string;

  @ApiProperty({ enum: MatchStatus, example: MatchStatus.PENDING })
  status: MatchStatus;

  @ApiProperty({ example: '+1234567890' })
  contactPhone: string;

  @ApiProperty({ example: '2025-07-10' })
  date: Date;

  @ApiProperty({ example: '14:00' })
  startTime: string;

  @ApiProperty({ example: '15:30' })
  endTime: string;

  @ApiProperty({ example: true })
  isPublic: boolean;

  @ApiProperty({ example: false })
  isDeleted: boolean;

  @ApiProperty({ example: { id: 'user123', firstName: 'John', lastName: 'Doe' } })
  creator: { id: string; firstName: string; lastName: string };

  @ApiProperty({ example: { id: 'field456', name: 'Central Park Field' } })
  field: { id: string; name: string };

  @ApiProperty({ example: [{ id: 'res101', reservedStatus: 'PENDING' }] })
  reservations: { id: string; reservedStatus: string }[];

  constructor(match: any) {
    this.id = match?.id || '';
    this.type = match?.type || MatchType.FULL;
    this.title = match?.title || '';
    this.city = match?.city || '';
    this.description = match?.description;
    this.status = match?.status || MatchStatus.PENDING;
    this.contactPhone = match?.contactPhone || '';
    this.date = match?.date || new Date();
    this.startTime = match?.startTime || '';
    this.endTime = match?.endTime || '';
    this.isPublic = match?.isPublic ?? false;
    this.isDeleted = match?.isDeleted ?? false;
    this.creator = {
      id: match?.creator?.id || '',
      firstName: match?.creator?.firstName || '',
      lastName: match?.creator?.lastName || '',
    };
    this.field = {
      id: match?.field?.id || '',
      name: match?.field?.name || '',
    };
    this.reservations = Array.isArray(match?.reservations)
      ? match.reservations.map((res: any) => ({
          id: res?.id || '',
          reservedStatus: res?.reservedStatus || '',
        }))
      : [];
  }
}
