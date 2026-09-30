import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { KafkaService } from '@healthcare/shared';
import { PrismaService } from '../prisma/prisma.service';

const POLL_INTERVAL_MS = 2000;
const BATCH_SIZE = 25;
const MAX_ATTEMPTS = 10;

@Injectable()
export class OutboxPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxPublisherService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly kafka: KafkaService
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => this.pollOnce(), POLL_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async pollOnce() {
    if (this.running) return;
    this.running = true;
    try {
      const pending = await this.prisma.outboxEvent.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        take: BATCH_SIZE,
      });

      for (const event of pending) {
        try {
          await this.kafka.publish(`facility.${event.eventType}`, event.id, event.payload);
          await this.prisma.outboxEvent.update({
            where: { id: event.id },
            data: { status: 'PUBLISHED', publishedAt: new Date() },
          });
        } catch (error) {
          const attempts = event.attempts + 1;
          this.logger.warn(`Failed to publish outbox event ${event.id} (attempt ${attempts}): ${error}`);
          await this.prisma.outboxEvent.update({
            where: { id: event.id },
            data: { attempts, status: attempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING' },
          });
        }
      }
    } catch (error) {
      this.logger.error(`Outbox poll failed: ${error}`);
    } finally {
      this.running = false;
    }
  }
}
