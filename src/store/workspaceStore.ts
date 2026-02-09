import { create } from "zustand";

type WorkspaceState = {
  selectedBrand: string;
  setSelectedBrand: (brand: string) => void;
};

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  selectedBrand: "",
  setSelectedBrand: (brand) => set({ selectedBrand: brand }),
}));
