import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class QueryTenancyDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  roomId?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as boolean;
  })
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;
}
