import { Exclude, Expose } from 'class-transformer';

export class TerrainResponseDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  isActive: boolean;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}

export class FieldResponseDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  description: string;

  @Expose()
  address: string;

  @Expose()
  city: string;

  @Expose()
  pricePerHour: number;

  @Expose()
  matchDuration: number;

  @Expose()
  hasShowers: boolean;

  @Expose()
  hasWater: boolean;

  @Expose()
  isIndoor: boolean;

  @Expose()
  image: string;

  @Expose()
  numberOfTerrains: number;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  openingTime: string;

  @Expose()
  closingTime: string;

  @Expose()
  ownerId: string;

  @Exclude()
  owner: any;


}