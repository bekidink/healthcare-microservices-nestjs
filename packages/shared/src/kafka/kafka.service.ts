import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private producer: Producer | null = null;

  async onModuleInit() {
    const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
    const clientId = process.env.KAFKA_CLIENT_ID || 'unknown-service';
    const kafka = new Kafka({ clientId, brokers });
    this.producer = kafka.producer();
    try {
      await this.producer.connect();
    } catch (error) {
      // Best-effort: the outbox publisher retries on its own poll cycle, so
      // a Kafka outage at boot must not crash the whole service.
      this.logger.warn(`Kafka producer connect failed, will retry on next publish: ${error}`);
    }
  }

  async onModuleDestroy() {
    await this.producer?.disconnect();
  }

  async publish(topic: string, key: string, value: unknown) {
    if (!this.producer) throw new Error('Kafka producer not initialized');
    await this.producer.send({
      topic,
      messages: [{ key, value: JSON.stringify(value) }],
    });
  }
}
