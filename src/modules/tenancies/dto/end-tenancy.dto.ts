import { IsNotEmpty, IsString } from 'class-validator';

export class EndTenancyDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  endDate: string;
}
