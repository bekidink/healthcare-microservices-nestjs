import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface PharmacyInventoryItem {
  id: string;
  facilityId: string;
  medicationCode: string;
  medicationName: string;
  quantityOnHand: number;
  reorderLevel: number;
}

/**
 * The only place Analytics talks to Pharmacy — a plain synchronous REST call
 * (per the core microservice rules: "REST for synchronous operations"),
 * never a query against pharmacy_db directly. Used to compute the
 * inventory_levels snapshot.
 */
@Injectable()
export class PharmacyClientService {
  private readonly logger = new Logger(PharmacyClientService.name);
  private readonly baseUrl = process.env.PHARMACY_SERVICE_URL || 'http://localhost:3007';

  constructor(private readonly http: HttpService) {}

  async listInventoryByFacility(facilityId: string): Promise<PharmacyInventoryItem[]> {
    try {
      const response = await firstValueFrom(
        this.http.get(`${this.baseUrl}/inventory-items`, { params: { facilityId } })
      );
      return response.data ?? [];
    } catch (error) {
      this.logger.warn(`Could not fetch inventory for facility ${facilityId} from Pharmacy service: ${error}`);
      return [];
    }
  }
}
