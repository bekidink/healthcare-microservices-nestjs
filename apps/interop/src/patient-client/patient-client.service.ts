import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface PatientIdentifier {
  id: string;
  patientId: string;
  type: string; // facility_mrn | national_id | insurance_id | phone | passport
  value: string;
  issuingContext: string | null;
  isPrimary: boolean;
  createdAt: string;
}

export interface PatientContact {
  id: string;
  patientId: string;
  type: string;
  value: string;
  label: string | null;
  isPrimary: boolean;
  createdAt: string;
}

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string | null;
  status: string;
  mergedIntoPatientId: string | null;
  identifiers: PatientIdentifier[];
  contacts: PatientContact[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Interop's only way of talking to Patient — a plain synchronous REST call
 * (per the core microservice rules: "REST for synchronous operations"),
 * never a query against patient_db directly. Interop makes no writes here,
 * ever — it only reads for FHIR translation. Mirrors Lab's
 * ClinicalClientService shape exactly.
 */
@Injectable()
export class PatientClientService {
  private readonly logger = new Logger(PatientClientService.name);
  private readonly baseUrl = process.env.PATIENT_SERVICE_URL || 'http://localhost:3003';

  constructor(private readonly http: HttpService) {}

  async getPatient(id: string): Promise<Patient | null> {
    try {
      const response = await firstValueFrom(this.http.get(`${this.baseUrl}/patients/${id}`));
      return response.data ?? null;
    } catch (error) {
      this.logger.warn(`Could not fetch patient ${id} from Patient service: ${error}`);
      return null;
    }
  }
}
