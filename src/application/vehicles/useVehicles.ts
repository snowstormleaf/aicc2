import { useVehiclesStore } from './store';

/**
 * Hook to access vehicles store state and actions.
 * Can be used as a drop-in replacement for the old Context-based useVehicles.
 */
export function useVehicles() {
  return useVehiclesStore();
}
