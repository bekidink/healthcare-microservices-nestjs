import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface PatientRecord {
  id: string;
  [key: string]: unknown;
}

/**
 * The only place Analytics talks to Patient — a plain synchronous REST call
 * (per the core microservice rules: "REST for synchronous operations"),
 * never a query against patient_db directly. Used by the AI tool facade's
 * lookup-patient tool.
 */
@Injectable()
export class PatientClientService {
  private readonly logger = new Logger(PatientClientService.name);
  private readonly baseUrl = process.env.PATIENT_SERVICE_URL || 'http://localhost:3003';

  constructor(private readonly http: HttpService) {}

  async getPatient(id: string): Promise<PatientRecord | null> {
    try {
      const response = await firstValueFrom(this.http.get(`${this.baseUrl}/patients/${id}`));
      return response.data ?? null;
    } catch (error) {
      this.logger.warn(`Could not fetch patient ${id} from Patient service: ${error}`);
      return null;
    }
  }
}
