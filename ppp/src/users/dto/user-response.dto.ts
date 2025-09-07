import { Exclude, Expose, Transform } from "class-transformer";
import { UserRole } from "../../common/enums/user-role.enum";
import { Team } from "../../teams/entities/team.entity";
import { IncompleteMatch } from "src/matches/incomplete-match/incomplete-match.entity";
import { FullMatch } from "src/matches/full-match/full-match.entity";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class UserResponseDto {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  firstName: string;

  @Expose()
  @ApiProperty()
  lastName: string;

  @Expose()
  @ApiProperty()
  email: string;

  @Exclude()
  password: string;

  @Expose()
  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @Expose()
  @ApiPropertyOptional()
  city: string;

  @Expose()
  @ApiPropertyOptional()
  phoneNumber: string;

  @Expose()
  @ApiPropertyOptional()
  profilePicture: string;

  @Expose()
  @ApiPropertyOptional()
  bio: string;

  @Expose()
  @ApiProperty()
  totalRatings: number;

  @Expose()
  @ApiProperty()
  averageRating: number;

  @Expose()
  @ApiPropertyOptional()
  isReplacementPlayer: boolean;

  @Expose()
  @ApiProperty()
  isActive: boolean;

  @Expose()
  @ApiProperty()
  createdAt: Date;

  @Expose()
  @ApiProperty()
  updatedAt: Date;

  @Expose()
  @Transform(({ obj }) => `${obj.firstName} ${obj.lastName}`)
  @ApiProperty()
  fullName: string;

  @Expose()
  @ApiPropertyOptional()
  refreshToken: any;

  @Expose()
  @ApiProperty()
  ratingSum: number;

  @Expose()
  @ApiPropertyOptional()
  createdMatches: FullMatch[];

  @Expose()
  @ApiPropertyOptional()
  joinedMatches: IncompleteMatch[];

  @Expose()
  @ApiPropertyOptional()
  teams: Team[];

  @Expose()
  @ApiPropertyOptional()
  receivedRatings: any[];

  @Expose()
  @ApiPropertyOptional({ example: "1998-05-28" })
  dateOfBirth: Date;

  @Expose()
  @Transform(({ obj }) => {
    if (!obj.dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(obj.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  })
  @ApiPropertyOptional({ example: 25 })
  age: number;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}