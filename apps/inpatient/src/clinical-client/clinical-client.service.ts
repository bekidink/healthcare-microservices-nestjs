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
}

/**
 * The only place Inpatient talks to Clinical — a plain synchronous REST call
 * (per the core microservice rules: "REST for synchronous operations"),
 * never a query against clinical_db directly. Used to validate/enrich an
 * Admission that's linked to an encounterId — unlike Clinical/Lab's "must be
 * in_progress" rule, no particular encounter status is required here (an
 * admission can follow a completed encounter, e.g. post-surgical).
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
