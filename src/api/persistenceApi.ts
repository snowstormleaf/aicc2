import type { CustomerPersona } from '@/personas/types';
import type { Vehicle } from '@/types/vehicle';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// ===== PERSONAS API =====

export async function getPersonasFromDB(): Promise<CustomerPersona[]> {
  try {
    const response = await fetch(`${API_BASE}/personas`);
    if (!response.ok) throw new Error('Failed to fetch personas');
    return await response.json();
  } catch (error) {
    console.error('Error fetching personas:', error);
    return [];
  }
}

export async function savePersonaToDB(persona: CustomerPersona): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/personas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(persona),
    });
    if (!response.ok) throw new Error('Failed to save persona');
  } catch (error) {
    console.error('Error saving persona:', error);
    throw error;
  }
}

export async function deletePersonaFromDB(id: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/personas/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete persona');
  } catch (error) {
    console.error('Error deleting persona:', error);
    throw error;
  }
}

export async function syncPersonasBatchToDB(personas: CustomerPersona[]): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/sync/personas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personas }),
    });
    if (!response.ok) throw new Error('Failed to sync personas');
  } catch (error) {
    console.error('Error syncing personas:', error);
    throw error;
  }
}

// ===== VEHICLES API =====

export async function getVehiclesFromDB(): Promise<Vehicle[]> {
  try {
    const response = await fetch(`${API_BASE}/vehicles`);
    if (!response.ok) throw new Error('Failed to fetch vehicles');
    return await response.json();
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    return [];
  }
}

export async function saveVehicleToDB(vehicle: Vehicle): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/vehicles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vehicle),
    });
    if (!response.ok) throw new Error('Failed to save vehicle');
  } catch (error) {
    console.error('Error saving vehicle:', error);
    throw error;
  }
}

export async function deleteVehicleFromDB(id: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/vehicles/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete vehicle');
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    throw error;
  }
}

export async function syncVehiclesBatchToDB(vehicles: Vehicle[]): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/sync/vehicles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehicles }),
    });
    if (!response.ok) throw new Error('Failed to sync vehicles');
  } catch (error) {
    console.error('Error syncing vehicles:', error);
    throw error;
  }
}
