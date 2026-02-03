import { create } from "zustand";
import { Vehicle } from "@/types/vehicle";
import {
  listVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  generateVehicleAI
} from "@/api/vehicleApi";

type VehicleState = {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  loading: boolean;
  error?: string;

  fetchVehicles: () => Promise<void>;
  selectVehicle: (v: Vehicle | null) => void;

  addVehicle: (payload: Partial<Vehicle>) => Promise<Vehicle>;
  editVehicle: (id: string, payload: Partial<Vehicle>) => Promise<Vehicle>;
  removeVehicle: (id: string) => Promise<void>;

  aiGenerateVehicle: (prompt: string) => Promise<Partial<Vehicle>>;
};

export const useVehicleStore = create<VehicleState>((set, get) => ({
  vehicles: [],
  selectedVehicle: null,
  loading: false,
  error: undefined,

  fetchVehicles: async () => {
    set({ loading: true, error: undefined });
    try {
      const vehicles = await listVehicles();
      set({ vehicles, loading: false });
    } catch (e: any) {
      set({ error: e.message ?? "Unknown error", loading: false });
    }
  },

  selectVehicle: (v) => set({ selectedVehicle: v }),

  addVehicle: async (payload) => {
    const created = await createVehicle(payload);
    set({ vehicles: [created, ...get().vehicles] });
    return created;
  },

  editVehicle: async (id, payload) => {
    const updated = await updateVehicle(id, payload);
    set({
      vehicles: get().vehicles.map(v => (v.id === id ? updated : v)),
      selectedVehicle: get().selectedVehicle?.id === id ? updated : get().selectedVehicle,
    });
    return updated;
  },

  removeVehicle: async (id) => {
    await deleteVehicle(id);
    set({
      vehicles: get().vehicles.filter(v => v.id !== id),
      selectedVehicle: get().selectedVehicle?.id === id ? null : get().selectedVehicle,
    });
  },

  aiGenerateVehicle: async (prompt) => generateVehicleAI(prompt),
}));