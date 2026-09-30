import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditOutboxService } from '../common/audit-outbox.service';
import { FacilityClientService } from '../facility-client/facility-client.service';
import { splitIntoSlots } from './time.util';
import type { CreateScheduleSlotDto } from './dto/create-schedule-slot.dto';
import type { GenerateSlotsDto } from './dto/generate-slots.dto';

@Injectable()
export class ScheduleSlotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditOutbox: AuditOutboxService,
    private readonly facilityClient: FacilityClientService
  ) {}

  async create(dto: CreateScheduleSlotDto, actorId: string) {
    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('startTime must be before endTime.');
    }

    return this.prisma.$transaction(async (tx) => {
      const slot = await tx.scheduleSlot.create({ data: dto });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: dto.facilityId,
        action: 'schedule_slot.created',
        resourceType: 'ScheduleSlot',
        resourceId: slot.id,
      });

      return slot;
    });
  }

  /**
   * Expands a provider's recurring weekly availability (fetched from the
   * Facility service — a synchronous REST call, never a cross-database
   * join) into concrete bookable ScheduleSlot rows for each matching date
   * in [dateFrom, dateTo]. Already-existing slots (same provider/date/
   * startTime) are skipped rather than erroring the whole batch.
   */
  async generateFromFacilitySchedule(dto: GenerateSlotsDto, actorId: string) {
    const dateFrom = new Date(dto.dateFrom);
    const dateTo = new Date(dto.dateTo);
    if (dateFrom > dateTo) throw new BadRequestException('dateFrom must be before dateTo.');

    const schedules = await this.facilityClient.getDepartmentProviderSchedules(dto.departmentId);
    const providerSchedules = schedules.filter((s) => s.providerId === dto.providerId && s.status === 'active');
    if (providerSchedules.length === 0) {
      throw new NotFoundException(
        'No active recurring ProviderSchedule found for this provider in this department (check the Facility service).'
      );
    }

    const facilityId = providerSchedules[0].facilityId;
    const slotDuration = dto.slotDurationMins ?? 30;
    const created = [];
    let skipped = 0;

    for (let cursor = new Date(dateFrom); cursor <= dateTo; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
      const dayOfWeek = cursor.getUTCDay();
      const matchingSchedules = providerSchedules.filter((s) => s.dayOfWeek === dayOfWeek);

      for (const schedule of matchingSchedules) {
        const slotWindows = splitIntoSlots(schedule.startTime, schedule.endTime, slotDuration);

        for (const [startTime, endTime] of slotWindows) {
          try {
            const slot = await this.prisma.scheduleSlot.create({
              data: {
                providerId: dto.providerId,
                facilityId,
                departmentId: dto.departmentId,
                date: new Date(cursor),
                startTime,
                endTime,
              },
            });
            created.push(slot);
          } catch {
            // Unique constraint (providerId, date, startTime) — already generated, skip.
            skipped++;
          }
        }
      }
    }

    return { createdCount: created.length, skippedCount: skipped, slots: created };
  }

  async list(query: { providerId?: string; facilityId?: string; departmentId?: string; date?: string; status?: string }) {
    return this.prisma.scheduleSlot.findMany({
      where: {
        providerId: query.providerId,
        facilityId: query.facilityId,
        departmentId: query.departmentId,
        date: query.date ? new Date(query.date) : undefined,
        status: query.status ?? 'open',
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
  }

  async findById(id: string) {
    const slot = await this.prisma.scheduleSlot.findUnique({ where: { id } });
    if (!slot) throw new NotFoundException('Schedule slot not found.');
    return slot;
  }
}
