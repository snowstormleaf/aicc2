import type { CustomerPersona } from "@/domain/personas/models";
import { HttpClient } from "../httpClient";

export interface PersonaRepository {
  getAll(): Promise<CustomerPersona[]>;
  save(persona: CustomerPersona): Promise<void>;
  delete(id: string): Promise<void>;
  syncBatch(personas: CustomerPersona[]): Promise<void>;
}

export class PersonaApiRepository implements PersonaRepository {
  private client: HttpClient;

  constructor(baseUrl: string = import.meta.env?.VITE_API_URL || 'http://localhost:3001/api') {
    this.client = new HttpClient(baseUrl);
  }

  async getAll(): Promise<CustomerPersona[]> {
    try {
      return await this.client.get<CustomerPersona[]>('/personas');
    } catch (error) {
      console.error('Failed to fetch personas:', error);
      return [];
    }
  }

  async save(persona: CustomerPersona): Promise<void> {
    try {
      await this.client.post('/personas', persona);
    } catch (error) {
      console.error('Failed to save persona:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.client.delete(`/personas/${id}`);
    } catch (error) {
      console.error('Failed to delete persona:', error);
      throw error;
    }
  }

  async syncBatch(personas: CustomerPersona[]): Promise<void> {
    try {
      await this.client.post('/sync/personas', { personas });
    } catch (error) {
      console.error('Failed to sync personas:', error);
      throw error;
    }
  }
}
