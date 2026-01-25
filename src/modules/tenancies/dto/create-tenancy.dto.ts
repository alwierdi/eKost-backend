import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTenancyDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsString()
  @IsNotEmpty()
  startDate: string;

  @IsString()
  @IsOptional()
  endDate?: string;
}
