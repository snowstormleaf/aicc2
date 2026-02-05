import * as React from "react";
import type { Vehicle } from "@/types/vehicle";
import { normalizeVehicle } from "@/domain/vehicles/usecases";
import { useVehiclesStore } from "@/application/vehicles/store";

/**
 * VehiclesProvider - Compatibility wrapper around Zustand store.
 * Loads vehicles from DB on mount.
 */
export function VehiclesProvider({ children }: { children: React.ReactNode }) {
  // Select only the stable loadVehicles action to avoid re-running on state updates
  const loadVehicles = useVehiclesStore((s) => s.loadVehicles);

  // Load vehicles from DB on mount
  React.useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  return <>{children}</>;
}

/**
 * useVehicles - Direct hook to Zustand store.
 * Provides vehicles state and actions.
 */
export function useVehicles() {
  return useVehiclesStore();
}
