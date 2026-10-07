import { Module } from '@nestjs/common';
import { InsurancePoliciesController } from './insurance-policies.controller';
import { InsurancePoliciesService } from './insurance-policies.service';
import { AuditOutboxService } from '../common/audit-outbox.service';

@Module({
  controllers: [InsurancePoliciesController],
  providers: [InsurancePoliciesService, AuditOutboxService],
  exports: [InsurancePoliciesService],
})
export class InsurancePoliciesModule {}
