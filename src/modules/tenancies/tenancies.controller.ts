import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { TenanciesService } from './tenancies.service';
import { CreateTenancyDto } from './dto/create-tenancy.dto';
import { UpdateTenancyDto } from './dto/update-tenancy.dto';
import { QueryTenancyDto } from './dto/query-tenancy.dto';
import { EndTenancyDto } from './dto/end-tenancy.dto';
import { ExtendTenancyDto } from './dto/extend-tenancy.dto';

@Controller('tenancies')
export class TenanciesController {
  constructor(private readonly tenanciesService: TenanciesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createTenancyDto: CreateTenancyDto) {
    return this.tenanciesService.create(createTenancyDto);
  }

  @Get()
  findAll(@Query() query: QueryTenancyDto) {
    return this.tenanciesService.findAll(query);
  }

  @Get('active')
  getActiveTenancies() {
    return this.tenanciesService.getActiveTenancies();
  }

  @Get('expired')
  getExpiredTenancies() {
    return this.tenanciesService.getExpiredTenancies();
  }

  @Get('expiring-soon')
  getExpiringSoon(@Query('days') days?: number) {
    return this.tenanciesService.getExpiringSoon(days ? Number(days) : 30);
  }

  @Get('stats')
  getTenancyStats() {
    return this.tenanciesService.getTenancyStats();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tenanciesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTenancyDto: UpdateTenancyDto) {
    return this.tenanciesService.update(id, updateTenancyDto);
  }

  @Patch(':id/end')
  endTenancy(@Param('id') id: string, @Body() endTenancyDto: EndTenancyDto) {
    return this.tenanciesService.endTenancy(id, endTenancyDto);
  }

  @Patch(':id/extend')
  extendTenancy(
    @Param('id') id: string,
    @Body() extendTenancyDto: ExtendTenancyDto,
  ) {
    return this.tenanciesService.extendTenancy(id, extendTenancyDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.tenanciesService.remove(id);
  }
}
