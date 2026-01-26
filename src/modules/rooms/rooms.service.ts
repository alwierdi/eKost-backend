import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { PrismaService } from 'src/infra/database/prisma.service';
import { QueryRoomDto } from './dto/query-room.dto';
import { Prisma, RoomStatus } from 'generated/prisma/client';
import { BulkUpdateConditionDto } from './dto/bulk-update-condition.dto';

@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) {}
  async create(createRoomDto: CreateRoomDto) {
    const existingRoom = await this.prisma.room.findFirst({
      where: {
        roomNumber: createRoomDto.roomNumber,
      },
    });

    if (existingRoom) {
      throw new Error(`Room number ${createRoomDto.roomNumber} already exists`);
    }

    return this.prisma.room.create({
      data: createRoomDto,
    });
  }

  async findAll(query: QueryRoomDto) {
    const {
      availableOnly,
      conditionStatus,
      limit = 10,
      page = 1,
      search,
    } = query;

    const where: Prisma.RoomWhereInput = {};

    if (availableOnly) {
      where.status = RoomStatus.AVAILABLE;
    }

    if (conditionStatus) {
      where.conditionStatus = conditionStatus;
    }

    if (search) {
      where.roomNumber = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.room.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          roomNumber: 'asc',
        },
        include: {
          tenancies: {
            where: {
              isActive: true,
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                },
              },
            },
          },
          _count: {
            select: {
              tenancies: true,
              complaints: true,
            },
          },
        },
      }),
      this.prisma.room.count({ where }),
    ]);

    const dataWithAvailability = data.map((room) => ({
      ...room,
      isAvailable: room.status === RoomStatus.AVAILABLE,
      currentTenant: room.tenancies[0]?.user || null,
    }));

    return {
      data: dataWithAvailability,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: {
        tenancies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        complaints: {
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
        _count: {
          select: {
            tenancies: true,
            complaints: true,
          },
        },
      },
    });

    if (!room) {
      throw new NotFoundException(`Room with ID ${id} not found`);
    }

    const activeTenancy = room.tenancies.find((tenancy) => tenancy.isActive);

    return {
      ...room,
      isAvailable: room.status === RoomStatus.AVAILABLE,
      currentTenant: activeTenancy?.user || null,
      activeTenancy: activeTenancy || null,
    };
  }

  async update(id: string, updateRoomDto: UpdateRoomDto) {
    await this.findOne(id);

    if (updateRoomDto.roomNumber) {
      const existingRoom = await this.prisma.room.findFirst({
        where: {
          roomNumber: updateRoomDto.roomNumber,
        },
      });

      if (existingRoom && existingRoom.id !== id) {
        throw new ConflictException(
          `Room number ${updateRoomDto.roomNumber} already exists`,
        );
      }
    }

    return this.prisma.room.update({
      where: { id },
      data: updateRoomDto,
    });
  }

  async remove(id: string) {
    const room = await this.findOne(id);

    if (room.status === RoomStatus.OCCUPIED) {
      throw new ConflictException(
        'Cannot delete occupied room. Please end the tenancy first',
      );
    }

    return this.prisma.room.delete({
      where: { id },
    });
  }

  async bulkUpdateCondition(bulkUpdateDto: BulkUpdateConditionDto) {
    const { roomIds, conditionStatus } = bulkUpdateDto;

    const rooms = await this.prisma.room.findMany({
      where: { id: { in: roomIds } },
    });

    if (rooms.length !== roomIds.length) {
      throw new NotFoundException('One or more rooms not found');
    }

    const result = await this.prisma.room.updateMany({
      where: { id: { in: roomIds } },
      data: { conditionStatus },
    });

    return {
      updated: result.count,
      conditionStatus,
    };
  }

  async getAvailabilitySummary() {
    const [total, occupied, needRepair] = await Promise.all([
      this.prisma.room.count(),
      this.prisma.room.count({
        where: {
          tenancies: {
            some: { isActive: true },
          },
        },
      }),
      this.prisma.room.count({
        where: { conditionStatus: 'NEED_REPAIR' },
      }),
    ]);

    const available = total - occupied;

    return {
      total,
      available,
      occupied,
      needRepair,
      occupancyRate: total > 0 ? ((occupied / total) * 100).toFixed(2) : 0,
    };
  }

  async getRoomHistory(id: string) {
    await this.findOne(id);

    const tenancies = await this.prisma.tenancy.findMany({
      where: { roomId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    return {
      roomId: id,
      totalTenants: tenancies.length,
      tenancies,
    };
  }

  async checkAvailability(id: string) {
    const room = await this.findOne(id);

    return {
      roomId: id,
      roomNumber: room.roomNumber,
      isAvailable: room.isAvailable,
      conditionStatus: room.conditionStatus,
      currentTenant: room.currentTenant,
      activeTenancy: room.activeTenancy,
    };
  }
}
