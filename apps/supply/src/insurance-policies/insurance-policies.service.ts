import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditOutboxService } from '../common/audit-outbox.service';
import type { CreateInsurancePolicyDto } from './dto/create-insurance-policy.dto';

@Injectable()
export class InsurancePoliciesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditOutbox: AuditOutboxService
  ) {}

  async create(dto: CreateInsurancePolicyDto, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const policy = await tx.insurancePolicy.create({
        data: {
          patientId: dto.patientId,
          payerName: dto.payerName,
          policyNumber: dto.policyNumber,
          groupNumber: dto.groupNumber,
          effectiveDate: new Date(dto.effectiveDate),
          expirationDate: dto.expirationDate ? new Date(dto.expirationDate) : undefined,
        },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: dto.patientId,
        action: 'insurance_policy.created',
        resourceType: 'InsurancePolicy',
        resourceId: policy.id,
        metadata: { payerName: dto.payerName, policyNumber: dto.policyNumber },
      });

      return policy;
    });
  }

  async findById(id: string) {
    const policy = await this.prisma.insurancePolicy.findUnique({
      where: { id },
      include: { claims: { orderBy: { submittedAt: 'desc' } } },
    });
    if (!policy) throw new NotFoundException('Insurance policy not found.');
    return policy;
  }

  async listByPatient(patientId: string) {
    return this.prisma.insurancePolicy.findMany({ where: { patientId } });
  }
}
