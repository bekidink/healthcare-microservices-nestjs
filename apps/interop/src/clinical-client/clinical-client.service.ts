import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface VitalSigns {
  id: string;
  encounterId: string;
  temperatureC: number | null;
  heartRateBpm: number | null;
  respiratoryRateBpm: number | null;
  bloodPressureSystolic: number | null;
  bloodPressureDiastolic: number | null;
  spo2Percent: number | null;
  weightKg: number | null;
  heightCm: number | null;
  recordedBy: string;
  recordedAt: string;
}

export interface ClinicalNote {
  id: string;
  encounterId: string;
  noteType: string;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  authorId: string;
  signedBy: string | null;
  signedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Diagnosis {
  id: string;
  encounterId: string;
  code: string;
  description: string;
  type: string;
  recordedAt: string;
}

export interface ClinicalEncounter {
  id: string;
  appointmentId: string | null;
  patientId: string;
  providerId: string;
  facilityId: string;
  departmentId: string | null;
  encounterType: string; // outpatient_visit | inpatient_admission | emergency_visit | telemedicine
  status: string; // in_progress | completed | cancelled
  chiefComplaint: string | null;
  startedAt: string;
  endedAt: string | null;
  vitals: VitalSigns[];
  notes: ClinicalNote[];
  diagnoses: Diagnosis[];
}

/**
 * Interop's only way of talking to Clinical — a plain synchronous REST call
 * (per the core microservice rules: "REST for synchronous operations"),
 * never a query against clinical_db directly. Interop makes no writes here,
 * ever — it only reads for FHIR translation. Clinical's own findById already
 * nests vitals/notes/diagnoses, which is exactly what's needed to build a
 * FHIR Observation bundle. Mirrors Lab's ClinicalClientService shape exactly.
 */
@Injectable()
export class ClinicalClientService {
  private readonly logger = new Logger(ClinicalClientService.name);
  private readonly baseUrl = process.env.CLINICAL_SERVICE_URL || 'http://localhost:3005';

  constructor(private readonly http: HttpService) {}

  async getEncounter(encounterId: string): Promise<ClinicalEncounter | null> {
    try {
      const response = await firstValueFrom(this.http.get(`${this.baseUrl}/encounters/${encounterId}`));
      return response.data ?? null;
    } catch (error) {
      this.logger.warn(`Could not fetch encounter ${encounterId} from Clinical service: ${error}`);
      return null;
    }
  }
}
