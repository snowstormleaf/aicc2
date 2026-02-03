import { create } from 'zustand';
import type { Vehicle } from '@/domain/vehicles/models';
import { normalizeVehicle } from '@/domain/vehicles/usecases';
import { VehicleApiRepository } from '@/infrastructure/api/repositories/vehicleRepository';

export interface VehiclesStore {
  vehicles: Vehicle[];
  vehiclesById: Record<string, Vehicle>;
  isLoading: boolean;

  // Actions
  loadVehicles: () => Promise<void>;
  upsertVehicle: (vehicle: Vehicle) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;
  getVehicleName: (id: string) => string;
}

const vehicleRepository = new VehicleApiRepository();

export const useVehiclesStore = create<VehiclesStore>((set, get) => ({
  vehicles: [],
  vehiclesById: {},
  isLoading: false,

  loadVehicles: async () => {
    set({ isLoading: true });
    try {
      const dbVehicles = await vehicleRepository.getAll();
      const vehiclesById: Record<string, Vehicle> = {};
      for (const v of dbVehicles) {
        const normalized = normalizeVehicle(v);
        vehiclesById[normalized.id] = normalized;
      }

      set({
        vehicles: Object.values(vehiclesById),
        vehiclesById,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load vehicles:', error);
      set({ isLoading: false });
    }
  },

  upsertVehicle: async (vehicle: Vehicle) => {
    const normalized = normalizeVehicle(vehicle);
    const state = get();
    const updated = { ...state.vehiclesById, [normalized.id]: normalized };

    set({
      vehiclesById: updated,
      vehicles: Object.values(updated),
    });

    try {
      await vehicleRepository.syncBatch(Object.values(updated));
    } catch (error) {
      console.error('Failed to sync vehicles:', error);
    }
  },

  deleteVehicle: async (id: string) => {
    const state = get();
    if (!(id in state.vehiclesById)) return;

    const updated = { ...state.vehiclesById };
    delete updated[id];

    set({
      vehiclesById: updated,
      vehicles: Object.values(updated),
    });

    try {
      await vehicleRepository.delete(id);
    } catch (error) {
      console.error('Failed to delete vehicle:', error);
    }
  },

  getVehicleName: (id: string) => {
    const state = get();
    return state.vehiclesById[id]?.name ?? id;
  },
}));
