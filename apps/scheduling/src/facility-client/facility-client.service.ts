import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface FacilityProviderSchedule {
  id: string;
  providerId: string;
  facilityId: string;
  departmentId: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  status: string;
}

/**
 * The only place Scheduling talks to Facility — a plain synchronous REST
 * call (per the core microservice rules: "REST for synchronous operations"),
 * never a query against facility_db directly. Used to expand a provider's
 * recurring weekly availability (Facility's ProviderSchedule) into concrete
 * ScheduleSlot rows for a date range.
 */
@Injectable()
export class FacilityClientService {
  private readonly logger = new Logger(FacilityClientService.name);
  private readonly baseUrl = process.env.FACILITY_SERVICE_URL || 'http://localhost:3002';

  constructor(private readonly http: HttpService) {}

  async getDepartmentProviderSchedules(departmentId: string): Promise<FacilityProviderSchedule[]> {
    try {
      const response = await firstValueFrom(this.http.get(`${this.baseUrl}/departments/${departmentId}`));
      return response.data?.schedules ?? [];
    } catch (error) {
      this.logger.warn(`Could not fetch department ${departmentId} from Facility service: ${error}`);
      return [];
    }
  }
}
