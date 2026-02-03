import { create } from 'zustand';
import type { CustomerPersona, PersonaSource } from '@/domain/personas/models';
import { normalizePersona } from '@/domain/personas/usecases';
import { PersonaApiRepository } from '@/infrastructure/api/repositories/personaRepository';

export interface PersonasStore {
  personas: CustomerPersona[];
  personasById: Record<string, CustomerPersona>;
  seedIds: Set<string>;
  isLoading: boolean;

  // Actions
  initializePersonas: (seedPersonas: Record<string, CustomerPersona>) => void;
  loadPersonas: () => Promise<void>;
  upsertPersona: (persona: CustomerPersona) => Promise<void>;
  deletePersona: (id: string) => Promise<void>;
  resetPersonaToSeed: (id: string) => void;
  getPersonaName: (id: string) => string;
}

const personaRepository = new PersonaApiRepository();

export const usePersonasStore = create<PersonasStore>((set, get) => ({
  personas: [],
  personasById: {},
  seedIds: new Set(),
  isLoading: false,

  initializePersonas: (seedPersonas: Record<string, CustomerPersona>) => {
    set({
      personasById: seedPersonas,
      seedIds: new Set(Object.keys(seedPersonas)),
      personas: Object.values(seedPersonas).sort((a, b) => a.name.localeCompare(b.name)),
    });
  },

  loadPersonas: async () => {
    set({ isLoading: true });
    try {
      const dbPersonas = await personaRepository.getAll();
      const customById: Record<string, CustomerPersona> = {};
      for (const p of dbPersonas) {
        const normalized = normalizePersona(p, p.meta?.source ?? 'manual');
        customById[normalized.id] = normalized;
      }

      const state = get();
      const merged = { ...state.personasById, ...customById };
      const personasList = Object.values(merged).sort((a, b) => a.name.localeCompare(b.name));

      set({
        personasById: merged,
        personas: personasList,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load personas:', error);
      set({ isLoading: false });
    }
  },

  upsertPersona: async (persona: CustomerPersona) => {
    const normalized = normalizePersona(persona, persona.meta?.source ?? 'manual');
    const state = get();
    const updated = { ...state.personasById, [normalized.id]: normalized };
    const personasList = Object.values(updated).sort((a, b) => a.name.localeCompare(b.name));

    set({
      personasById: updated,
      personas: personasList,
    });

    try {
      await personaRepository.syncBatch(Object.values(updated));
    } catch (error) {
      console.error('Failed to sync personas:', error);
    }
  },

  deletePersona: async (id: string) => {
    const state = get();
    if (!(id in state.personasById)) return;

    const updated = { ...state.personasById };
    delete updated[id];
    const personasList = Object.values(updated).sort((a, b) => a.name.localeCompare(b.name));

    set({
      personasById: updated,
      personas: personasList,
    });

    try {
      await personaRepository.delete(id);
    } catch (error) {
      console.error('Failed to delete persona:', error);
    }
  },

  resetPersonaToSeed: (id: string) => {
    const state = get();
    if (!state.seedIds.has(id)) return;
    get().deletePersona(id);
  },

  getPersonaName: (id: string) => {
    const state = get();
    return state.personasById[id]?.name ?? id;
  },
}));
