import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateTenancyDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}

/*
di tenancies module ketika gua mau create tenancy maka dia meminta userId dari frontend, seharusnya itu tidak terjadi kan ya? karena tipe userId itu unique sehingga yang handle harus nya adalah be. gimana menurut lu? btw untuk user, session, dan account (auth) gua menggunakan library better-auth yaa
*/
