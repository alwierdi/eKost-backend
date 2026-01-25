import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { RoomCondition, RoomStatus } from 'generated/prisma/enums';

export class CreateRoomDto {
  @IsString()
  @IsNotEmpty()
  roomNumber: string;

  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus = RoomStatus.AVAILABLE;

  @IsOptional()
  @IsEnum(RoomCondition)
  conditionStatus?: RoomCondition = RoomCondition.NORMAL;
}
