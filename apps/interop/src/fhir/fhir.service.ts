import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PatientClientService } from '../patient-client/patient-client.service';
import { ClinicalClientService, ClinicalEncounter, VitalSigns } from '../clinical-client/clinical-client.service';

// Maps Clinical's internal Encounter.status values onto the FHIR R4
// Encounter.status value set. Anything unrecognized falls back to
// "unknown" rather than throwing — this is a best-effort translation
// layer, not a validating FHIR server.
const ENCOUNTER_STATUS_MAP: Record<string, string> = {
  in_progress: 'in-progress',
  completed: 'finished',
  cancelled: 'cancelled',
};

/**
 * Translates this system's internal resources (fetched read-only over REST
 * from Patient/Clinical — never a direct DB query against their schemas)
 * into a minimal, non-conformant FHIR R4 subset (Patient/Encounter/
 * Observation). Every call is logged to InteropAccessLog for traceability;
 * this service never writes to any other service.
 */
@Injectable()
export class FhirService {
  private readonly logger = new Logger(FhirService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly patientClient: PatientClientService,
    private readonly clinicalClient: ClinicalClientService
  ) {}

  private async logAccess(resourceType: string, resourceId: string, requestedBy: string) {
    try {
      await this.prisma.interopAccessLog.create({
        data: { resourceType, resourceId, requestedBy },
      });
    } catch (error) {
      // Access logging is best-effort — a logging failure must never block
      // (or fail) the actual read it's recording.
      this.logger.warn(`Could not record InteropAccessLog for ${resourceType}/${resourceId}: ${error}`);
    }
  }

  private toDateOnly(value: string | null | undefined): string | undefined {
    if (!value) return undefined;
    // Patient-service dateOfBirth serializes as an ISO datetime
    // (e.g. "1990-05-15T00:00:00.000Z") — FHIR's `birthDate` wants just the
    // date part.
    return value.slice(0, 10);
  }

  async getPatient(id: string, actorId: string) {
    const patient = await this.patientClient.getPatient(id);
    if (!patient) throw new NotFoundException(`Patient ${id} not found.`);

    await this.logAccess('Patient', id, actorId);

    const nationalId = patient.identifiers?.find((identifier) => identifier.type === 'national_id')?.value;

    return {
      resourceType: 'Patient',
      id: patient.id,
      name: [{ given: [patient.firstName], family: patient.lastName }],
      gender: patient.gender,
      birthDate: this.toDateOnly(patient.dateOfBirth),
      identifier: nationalId ? [{ system: 'national-id', value: nationalId }] : [],
    };
  }

  async getEncounter(id: string, actorId: string) {
    const encounter = await this.clinicalClient.getEncounter(id);
    if (!encounter) throw new NotFoundException(`Encounter ${id} not found.`);

    await this.logAccess('Encounter', id, actorId);

    return this.mapEncounter(encounter);
  }

  private mapEncounter(encounter: ClinicalEncounter) {
    return {
      resourceType: 'Encounter',
      id: encounter.id,
      status: ENCOUNTER_STATUS_MAP[encounter.status] ?? 'unknown',
      class: { code: encounter.encounterType },
      subject: { reference: `Patient/${encounter.patientId}` },
      participant: [{ individual: { reference: `Practitioner/${encounter.providerId}` } }],
      period: { start: encounter.startedAt, end: encounter.endedAt ?? undefined },
    };
  }

  private mapVitalToObservation(vital: VitalSigns, patientId: string) {
    const component: Array<{ code: { text: string }; valueQuantity?: { value: number; unit: string }; valueString?: string }> = [];

    if (vital.heartRateBpm != null) {
      component.push({ code: { text: 'heart rate' }, valueQuantity: { value: vital.heartRateBpm, unit: 'bpm' } });
    }
    if (vital.temperatureC != null) {
      component.push({ code: { text: 'body temperature' }, valueQuantity: { value: vital.temperatureC, unit: 'Cel' } });
    }
    if (vital.respiratoryRateBpm != null) {
      component.push({
        code: { text: 'respiratory rate' },
        valueQuantity: { value: vital.respiratoryRateBpm, unit: 'breaths/min' },
      });
    }
    if (vital.bloodPressureSystolic != null && vital.bloodPressureDiastolic != null) {
      component.push({
        code: { text: 'blood pressure' },
        valueString: `${vital.bloodPressureSystolic}/${vital.bloodPressureDiastolic} mmHg`,
      });
    }
    if (vital.spo2Percent != null) {
      component.push({ code: { text: 'oxygen saturation' }, valueQuantity: { value: vital.spo2Percent, unit: '%' } });
    }
    if (vital.weightKg != null) {
      component.push({ code: { text: 'body weight' }, valueQuantity: { value: vital.weightKg, unit: 'kg' } });
    }
    if (vital.heightCm != null) {
      component.push({ code: { text: 'body height' }, valueQuantity: { value: vital.heightCm, unit: 'cm' } });
    }

    return {
      resourceType: 'Observation',
      id: vital.id,
      status: 'final',
      code: { text: 'Vital Signs Panel' },
      subject: { reference: `Patient/${patientId}` },
      effectiveDateTime: vital.recordedAt,
      component,
    };
  }

  async getObservationsByEncounter(encounterId: string, actorId: string) {
    const encounter = await this.clinicalClient.getEncounter(encounterId);
    if (!encounter) throw new NotFoundException(`Encounter ${encounterId} not found.`);

    await this.logAccess('Observation', encounterId, actorId);

    const observations = (encounter.vitals ?? []).map((vital) => this.mapVitalToObservation(vital, encounter.patientId));

    return {
      resourceType: 'Bundle',
      type: 'searchset',
      total: observations.length,
      entry: observations.map((resource) => ({ resource })),
    };
  }
}
