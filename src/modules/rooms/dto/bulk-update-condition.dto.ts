import { IsArray, IsEnum, IsNotEmpty } from 'class-validator';
import { RoomCondition, RoomStatus } from 'generated/prisma/enums';

export class BulkUpdateConditionDto {
  @IsArray()
  @IsNotEmpty()
  roomIds: string[];

  @IsEnum(RoomStatus)
  @IsNotEmpty()
  status: RoomStatus;

  @IsEnum(RoomCondition)
  @IsNotEmpty()
  conditionStatus: RoomCondition;
}
