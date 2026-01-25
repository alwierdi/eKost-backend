import { IsNotEmpty, IsString } from 'class-validator';

export class ExtendTenancyDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  newEndDate: string;
}
