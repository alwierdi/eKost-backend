import { Module } from '@nestjs/common';
import { TenanciesService } from './tenancies.service';
import { TenanciesController } from './tenancies.controller';
import { PrismaService } from 'src/infra/database/prisma.service';

@Module({
  controllers: [TenanciesController],
  providers: [TenanciesService, PrismaService],
  exports: [TenanciesService],
})
export class TenanciesModule {}
