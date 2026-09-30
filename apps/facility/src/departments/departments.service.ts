import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditOutboxService } from '../common/audit-outbox.service';
import type { CreateDepartmentDto } from './dto/create-department.dto';
import type { CreateRoomDto } from './dto/create-room.dto';
import type { AssignProviderDto } from './dto/assign-provider.dto';
import type { CreateProviderScheduleDto } from './dto/create-provider-schedule.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditOutbox: AuditOutboxService
  ) {}

  async create(facilityId: string, dto: CreateDepartmentDto, actorId: string) {
    const facility = await this.prisma.facility.findUnique({ where: { id: facilityId } });
    if (!facility) throw new NotFoundException('Facility not found.');

    return this.prisma.$transaction(async (tx) => {
      const department = await tx.department.create({ data: { ...dto, facilityId } });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: facilityId,
        action: 'department.created',
        resourceType: 'Department',
        resourceId: department.id,
      });
      await this.auditOutbox.publishEvent(tx, 'DepartmentCreated', {
        departmentId: department.id,
        facilityId,
        type: department.type,
      });

      return department;
    });
  }

  async findById(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: { rooms: true, services: true, providerAssignments: true, schedules: true },
    });
    if (!department) throw new NotFoundException('Department not found.');
    return department;
  }

  async createRoom(departmentId: string, dto: CreateRoomDto, actorId: string) {
    const department = await this.prisma.department.findUnique({ where: { id: departmentId } });
    if (!department) throw new NotFoundException('Department not found.');

    return this.prisma.$transaction(async (tx) => {
      const room = await tx.room.create({
        data: { ...dto, departmentId, capacity: dto.capacity ?? 1 },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: departmentId,
        action: 'room.created',
        resourceType: 'Room',
        resourceId: room.id,
      });

      return room;
    });
  }

  async listRooms(departmentId: string) {
    return this.prisma.room.findMany({ where: { departmentId } });
  }

  async assignProvider(departmentId: string, dto: AssignProviderDto, actorId: string) {
    const department = await this.prisma.department.findUnique({ where: { id: departmentId } });
    if (!department) throw new NotFoundException('Department not found.');

    const existing = await this.prisma.providerDepartment.findUnique({
      where: { providerId_departmentId: { providerId: dto.providerId, departmentId } },
    });
    if (existing) throw new BadRequestException('Provider is already assigned to this department.');

    return this.prisma.$transaction(async (tx) => {
      const assignment = await tx.providerDepartment.create({
        data: { departmentId, providerId: dto.providerId, roleTitle: dto.roleTitle },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: departmentId,
        action: 'provider_department.assigned',
        resourceType: 'ProviderDepartment',
        resourceId: assignment.id,
        metadata: { providerId: dto.providerId },
      });
      await this.auditOutbox.publishEvent(tx, 'ProviderAssignedToDepartment', {
        departmentId,
        providerId: dto.providerId,
      });

      return assignment;
    });
  }

  async createSchedule(departmentId: string, dto: CreateProviderScheduleDto, actorId: string) {
    const department = await this.prisma.department.findUnique({ where: { id: departmentId } });
    if (!department) throw new NotFoundException('Department not found.');

    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('startTime must be before endTime.');
    }

    return this.prisma.$transaction(async (tx) => {
      const schedule = await tx.providerSchedule.create({
        data: {
          facilityId: department.facilityId,
          departmentId,
          providerId: dto.providerId,
          dayOfWeek: dto.dayOfWeek,
          startTime: dto.startTime,
          endTime: dto.endTime,
        },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: department.facilityId,
        action: 'provider_schedule.created',
        resourceType: 'ProviderSchedule',
        resourceId: schedule.id,
        metadata: { providerId: dto.providerId, dayOfWeek: dto.dayOfWeek },
      });

      return schedule;
    });
  }
}
