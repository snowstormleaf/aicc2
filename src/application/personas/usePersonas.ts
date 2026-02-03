import { usePersonasStore } from './store';

/**
 * Hook to access personas store state and actions.
 * Can be used as a drop-in replacement for the old Context-based usePersonas.
 */
export function usePersonas() {
  return usePersonasStore();
}
