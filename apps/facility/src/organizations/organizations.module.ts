import { Module } from '@nestjs/common';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { AuditOutboxService } from '../common/audit-outbox.service';

@Module({
  controllers: [OrganizationsController],
  providers: [OrganizationsService, AuditOutboxService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
