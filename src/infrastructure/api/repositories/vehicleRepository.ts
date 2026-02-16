import type { Vehicle } from "@/domain/vehicles/models";
import { HttpClient } from "../httpClient";

export interface VehicleRepository {
  getAll(): Promise<Vehicle[]>;
  save(vehicle: Vehicle): Promise<void>;
  delete(id: string): Promise<void>;
  syncBatch(vehicles: Vehicle[]): Promise<void>;
}

export class VehicleApiRepository implements VehicleRepository {
  private client: HttpClient;

  constructor(baseUrl: string = import.meta.env?.VITE_API_URL || 'http://localhost:3001/api') {
    this.client = new HttpClient(baseUrl);
  }

  async getAll(): Promise<Vehicle[]> {
    try {
      return await this.client.get<Vehicle[]>('/vehicles');
    } catch (error) {
      console.error('Failed to fetch vehicles:', error);
      return [];
    }
  }

  async save(vehicle: Vehicle): Promise<void> {
    try {
      await this.client.post('/vehicles', vehicle);
    } catch (error) {
      console.error('Failed to save vehicle:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.client.delete(`/vehicles/${id}`);
    } catch (error) {
      console.error('Failed to delete vehicle:', error);
      throw error;
    }
  }

  async syncBatch(vehicles: Vehicle[]): Promise<void> {
    try {
      await this.client.post('/sync/vehicles', { vehicles });
    } catch (error) {
      console.error('Failed to sync vehicles:', error);
      throw error;
    }
  }
}
