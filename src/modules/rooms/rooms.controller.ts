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
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { QueryRoomDto } from './dto/query-room.dto';
import { BulkUpdateConditionDto } from './dto/bulk-update-condition.dto';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createRoomDto: CreateRoomDto) {
    return this.roomsService.create(createRoomDto);
  }

  @Get()
  findAll(@Query() query: QueryRoomDto) {
    return this.roomsService.findAll(query);
  }

  @Get('summary')
  getAvailabilitySummary() {
    return this.roomsService.getAvailabilitySummary();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roomsService.findOne(id);
  }

  @Get(':id/availability')
  checkAvailability(@Param('id') id: string) {
    return this.roomsService.checkAvailability(id);
  }

  @Get(':id/history')
  getRoomHistory(@Param('id') id: string) {
    return this.roomsService.getRoomHistory(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRoomDto: UpdateRoomDto) {
    return this.roomsService.update(id, updateRoomDto);
  }

  @Patch('bulk/condition')
  bulkUpdateCondition(@Body() bulkUpdateDto: BulkUpdateConditionDto) {
    return this.roomsService.bulkUpdateCondition(bulkUpdateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.roomsService.remove(id);
  }
}
