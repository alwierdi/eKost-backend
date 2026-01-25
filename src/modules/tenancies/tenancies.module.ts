import { Module } from '@nestjs/common';
import { TenanciesService } from './tenancies.service';
import { TenanciesController } from './tenancies.controller';

@Module({
  controllers: [TenanciesController],
  providers: [TenanciesService],
  exports: [TenanciesService],
})
export class TenanciesModule {}
