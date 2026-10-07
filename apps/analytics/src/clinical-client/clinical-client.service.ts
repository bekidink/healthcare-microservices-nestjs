import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface ClinicalEncounter {
  id: string;
  patientId: string;
  providerId: string;
  facilityId: string;
  departmentId: string | null;
  status: string;
  chiefComplaint?: string | null;
  vitals: unknown[];
  notes: unknown[];
  diagnoses: Array<{ code: string; [key: string]: unknown }>;
  [key: string]: unknown;
}

/**
 * The only place Analytics talks to Clinical — a plain synchronous REST call
 * (per the core microservice rules: "REST for synchronous operations"),
 * never a query against clinical_db directly. Used by the AI tool facade's
 * summarize-encounter tool; the response already nests vitals/notes/
 * diagnoses, so no further cross-service calls are needed to build a summary.
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
