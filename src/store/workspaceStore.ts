import { create } from "zustand";
import { persist } from "zustand/middleware";

type WorkspaceState = {
  selectedBrandsDraft: string[];
  appliedBrands: string[];
  setSelectedBrandsDraft: (brands: string[]) => void;
  applyBrandFilter: () => void;
  clearBrandFilter: () => void;
};

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      selectedBrandsDraft: [],
      appliedBrands: [],
      setSelectedBrandsDraft: (brands) => set({ selectedBrandsDraft: brands }),
      applyBrandFilter: () => set((state) => ({ appliedBrands: [...state.selectedBrandsDraft] })),
      clearBrandFilter: () => set({ selectedBrandsDraft: [], appliedBrands: [] }),
    }),
    {
      name: "workspace_filters",
      partialize: (state) => ({
        selectedBrandsDraft: state.selectedBrandsDraft,
        appliedBrands: state.appliedBrands,
      }),
    }
  )
);
