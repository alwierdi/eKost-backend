import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateTenancyDto } from './dto/create-tenancy.dto';
import { UpdateTenancyDto } from './dto/update-tenancy.dto';
import { PrismaService } from 'src/infra/database/prisma.service';
import { QueryTenancyDto } from './dto/query-tenancy.dto';
import { Prisma } from 'generated/prisma/client';
import { EndTenancyDto } from './dto/end-tenancy.dto';
import { ExtendTenancyDto } from './dto/extend-tenancy.dto';

@Injectable()
export class TenanciesService {
  constructor(private prisma: PrismaService) {}
  async create(createTenancyDto: CreateTenancyDto) {
    const { userId, roomId, startDate, endDate } = createTenancyDto;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException(`Room with ID ${roomId} not found`);
    }

    const existingActiveTenancy = await this.prisma.tenancy.findFirst({
      where: {
        roomId,
        isActive: true,
      },
    });

    if (existingActiveTenancy) {
      throw new ConflictException(
        `Room ${room.roomNumber} is already occupied.`,
      );
    }

    const userActiveTenancy = await this.prisma.tenancy.findFirst({
      where: {
        userId,
        isActive: true,
      },
    });

    if (userActiveTenancy) {
      throw new ConflictException(
        `User ${user.name} already has an active tenancy. Please end the current tenancy first.`,
      );
    }

    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;

    if (end && end <= start) {
      throw new BadRequestException('End date must be after start date');
    }

    return this.prisma.tenancy.create({
      data: {
        userId,
        roomId,
        startDate: start,
        endDate: end,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            role: true,
          },
        },
        room: true,
      },
    });
  }

  async findAll(query: QueryTenancyDto) {
    const { userId, roomId, isActive, page = 1, limit = 10 } = query;

    const where: Prisma.TenancyWhereInput = {};

    if (userId) {
      where.userId = userId;
    }

    if (roomId) {
      where.roomId = roomId;
    }

    if (typeof isActive === 'boolean') {
      where.isActive = isActive;
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.tenancy.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              role: true,
            },
          },
          room: true,
        },
      }),
      this.prisma.tenancy.count({ where }),
    ]);

    const dataWithComputed = data.map((tenancy) => ({
      ...tenancy,
      duration: this.calculateDuration(tenancy.startDate, tenancy.endDate),
      isActive: tenancy.endDate ? new Date() > tenancy.endDate : false,
    }));

    return {
      data: dataWithComputed,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const tenancy = await this.prisma.tenancy.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            role: true,
          },
        },
        room: {
          include: {
            complaints: {
              where: {
                tenantId: {
                  equals: undefined,
                },
              },
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
          },
        },
      },
    });

    if (!tenancy) {
      throw new NotFoundException(`Tenancy with ID ${id} not found`);
    }

    return {
      ...tenancy,
      duration: this.calculateDuration(tenancy.startDate, tenancy.endDate),
      isActive: tenancy.endDate ? new Date() > tenancy.endDate : false,
    };
  }

  async update(id: string, updateTenancyDto: UpdateTenancyDto) {
    await this.findOne(id);

    if (updateTenancyDto.startDate && updateTenancyDto.endDate) {
      const start = new Date(updateTenancyDto.startDate);
      const end = new Date(updateTenancyDto.endDate);

      if (end <= start) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    return this.prisma.tenancy.update({
      where: { id },
      data: {
        ...updateTenancyDto,
        startDate: updateTenancyDto.startDate
          ? new Date(updateTenancyDto.startDate)
          : undefined,
        endDate: updateTenancyDto.endDate
          ? new Date(updateTenancyDto.endDate)
          : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        room: true,
      },
    });
  }

  async remove(id: string) {
    const tenancy = await this.findOne(id);

    if (tenancy.isActive) {
      throw new ConflictException(
        'Cannot delete active tenancy. Please end the tenancy first',
      );
    }

    return this.prisma.tenancy.delete({
      where: { id },
    });
  }

  async endTenancy(id: string, endTenancyDto: EndTenancyDto) {
    const tenancy = await this.findOne(id);

    if (!tenancy.isActive) {
      throw new BadRequestException('Tenancy is not active or already ended');
    }

    const endDate = new Date(endTenancyDto.endDate);

    return this.prisma.tenancy.update({
      where: { id },
      data: {
        endDate,
        isActive: false,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        room: true,
      },
    });
  }

  async extendTenancy(id: string, extendTenancyDto: ExtendTenancyDto) {
    const tenancy = await this.findOne(id);

    if (!tenancy.isActive) {
      throw new BadRequestException('Cannot extend inactive tenancy');
    }

    const newEndDate = new Date(extendTenancyDto.newEndDate);
    const currentEndDate = tenancy.endDate ? new Date(tenancy.endDate) : null;

    if (currentEndDate && newEndDate <= currentEndDate) {
      throw new BadRequestException(
        'New end date must be after current end date',
      );
    }

    return this.prisma.tenancy.update({
      where: { id },
      data: {
        endDate: newEndDate,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        room: true,
      },
    });
  }

  async getActiveTenancies() {
    const tenancies = await this.prisma.tenancy.findMany({
      where: { isActive: true },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        room: true,
      },
      orderBy: { startDate: 'desc' },
    });

    return tenancies.map((tenancy) => ({
      ...tenancy,
      duration: this.calculateDuration(tenancy.startDate, tenancy.endDate),
    }));
  }

  async getExpiredTenancies() {
    const now = new Date();

    const tenancies = await this.prisma.tenancy.findMany({
      where: {
        isActive: true,
        endDate: {
          lt: now,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        room: true,
      },
      orderBy: { endDate: 'desc' },
    });

    return tenancies.map((tenancy) => ({
      ...tenancy,
      daysOverdue:
        Math.floor(now.getTime() - tenancy.endDate.getTime()) /
        (1000 * 60 * 60 * 24),
    }));
  }

  async getExpiringSoon(days: number = 30) {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const tenancies = await this.prisma.tenancy.findMany({
      where: {
        isActive: true,
        endDate: {
          gte: now,
          lte: futureDate,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        room: true,
      },
      orderBy: { endDate: 'asc' },
    });

    return tenancies.map((tenancy) => ({
      ...tenancy,
      daysLeft: Math.floor(
        (tenancy.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      ),
    }));
  }

  async getTenancyStats() {
    const [total, active, expired] = await Promise.all([
      this.prisma.tenancy.count(),
      this.prisma.tenancy.count({ where: { isActive: true } }),
      this.prisma.tenancy.count({
        where: {
          isActive: true,
          endDate: {
            lt: new Date(),
          },
        },
      }),
    ]);

    return {
      total,
      active,
      interface: total - active,
      expired,
    };
  }

  private calculateDuration(startDate: Date, endDate: Date) {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const months = Math.floor(diffDays / 30);
    const days = diffDays % 30;

    if (months > 0) {
      return `${months} month${months > 1 ? 's' : ''} ${days} day${days > 1 ? 's' : ''}`;
    }

    return `${days} day${days > 1 ? 's' : ''}`;
  }
}
