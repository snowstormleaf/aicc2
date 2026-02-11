import { create } from "zustand";

type WorkspaceState = {
  selectedBrandsDraft: string[];
  appliedBrands: string[];
  setSelectedBrandsDraft: (brands: string[]) => void;
  applyBrandFilter: () => void;
  clearBrandFilter: () => void;
};

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  selectedBrandsDraft: [],
  appliedBrands: [],
  setSelectedBrandsDraft: (brands) => set({ selectedBrandsDraft: brands }),
  applyBrandFilter: () => set((state) => ({ appliedBrands: [...state.selectedBrandsDraft] })),
  clearBrandFilter: () => set({ selectedBrandsDraft: [], appliedBrands: [] }),
}));
