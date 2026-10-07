import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface SchedulingAppointment {
  id: string;
  patientId: string;
  providerId: string;
  facilityId: string;
  departmentId: string | null;
  status: string;
}

/**
 * The only place Clinical talks to Scheduling — a plain synchronous REST
 * call (per the core microservice rules: "REST for synchronous operations"),
 * never a query against scheduling_db directly. Used to derive an
 * Encounter's patient/provider/facility/department from an appointmentId.
 */
@Injectable()
export class SchedulingClientService {
  private readonly logger = new Logger(SchedulingClientService.name);
  private readonly baseUrl = process.env.SCHEDULING_SERVICE_URL || 'http://localhost:3004';

  constructor(private readonly http: HttpService) {}

  async getAppointment(appointmentId: string): Promise<SchedulingAppointment | null> {
    try {
      const response = await firstValueFrom(this.http.get(`${this.baseUrl}/appointments/${appointmentId}`));
      return response.data ?? null;
    } catch (error) {
      this.logger.warn(`Could not fetch appointment ${appointmentId} from Scheduling service: ${error}`);
      return null;
    }
  }
}
