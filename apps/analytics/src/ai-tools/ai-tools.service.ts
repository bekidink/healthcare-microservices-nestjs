import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PatientClientService } from '../patient-client/patient-client.service';
import { ClinicalClientService } from '../clinical-client/clinical-client.service';
import type { Prisma } from '../../generated/client';

/**
 * Backs AiToolsController. Every method here proxies a read to another
 * service's real REST API and logs exactly one AiToolInvocation row per
 * call, success or failure — never a raw query against another service's
 * database, and never a write anywhere. See the controller's class-level
 * JSDoc for the full rule this demonstrates.
 */
@Injectable()
export class AiToolsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patientClient: PatientClientService,
    private readonly clinicalClient: ClinicalClientService
  ) {}

  async lookupPatient(patientId: string, actorId: string) {
    const inputPayload = { patientId };
    const patient = await this.patientClient.getPatient(patientId);

    if (!patient) {
      await this.prisma.aiToolInvocation.create({
        data: {
          toolName: 'lookup-patient',
          inputPayload,
          outputPayload: { error: `Patient ${patientId} not found.` },
          invokedBy: actorId,
          status: 'failed',
        },
      });
      // The client swallows both a genuine 404 and a network-level failure
      // into null (same shape as every other cross-service client in this
      // codebase), so a clean 404 is the most specific outcome we can
      // surface here without changing that shared contract.
      throw new NotFoundException(`Patient ${patientId} not found.`);
    }

    await this.prisma.aiToolInvocation.create({
      data: {
        toolName: 'lookup-patient',
        inputPayload,
        outputPayload: patient as Prisma.InputJsonValue,
        invokedBy: actorId,
        status: 'succeeded',
      },
    });
    return patient;
  }

  async summarizeEncounter(encounterId: string, actorId: string) {
    const inputPayload = { encounterId };
    const encounter = await this.clinicalClient.getEncounter(encounterId);

    if (!encounter) {
      await this.prisma.aiToolInvocation.create({
        data: {
          toolName: 'summarize-encounter',
          inputPayload,
          outputPayload: { error: `Encounter ${encounterId} not found.` },
          invokedBy: actorId,
          status: 'failed',
        },
      });
      throw new NotFoundException(`Encounter ${encounterId} not found.`);
    }

    const summary = {
      patientId: encounter.patientId,
      chiefComplaint: encounter.chiefComplaint ?? null,
      status: encounter.status,
      diagnosisCodes: (encounter.diagnoses ?? []).map((d) => d.code),
      vitalsCount: (encounter.vitals ?? []).length,
      notesCount: (encounter.notes ?? []).length,
    };

    await this.prisma.aiToolInvocation.create({
      data: {
        toolName: 'summarize-encounter',
        inputPayload,
        outputPayload: summary,
        invokedBy: actorId,
        status: 'succeeded',
      },
    });
    return summary;
  }

  async listInvocations(toolName?: string, invokedBy?: string) {
    return this.prisma.aiToolInvocation.findMany({
      where: {
        ...(toolName ? { toolName } : {}),
        ...(invokedBy ? { invokedBy } : {}),
      },
      orderBy: { invokedAt: 'desc' },
    });
  }
}
