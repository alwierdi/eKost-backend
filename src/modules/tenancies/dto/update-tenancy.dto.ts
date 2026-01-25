import { PartialType } from '@nestjs/mapped-types';
import { CreateTenancyDto } from './create-tenancy.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateTenancyDto extends PartialType(CreateTenancyDto) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
