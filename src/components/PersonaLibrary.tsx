import * as React from "react";
import { usePersonas } from "@/personas/store";
import type { CustomerPersona } from "@/personas/types";
import { PersonaDetailsDialog } from "@/components/PersonaDetailsDialog";
import { PersonaUpsertDialog } from "@/components/PersonaUpsertDialog";
import { EntityLibrary, type EntityCardConfig } from "@/components/shared/EntityLibrary";

export function PersonaLibrary() {
  const { personas, personasById, seedIds, upsertPersona, deletePersona, resetPersonaToSeed } =
    usePersonas();

  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [detailsId, setDetailsId] = React.useState<string | null>(null);

  const [upsertOpen, setUpsertOpen] = React.useState(false);
  const [editPersona, setEditPersona] = React.useState<CustomerPersona | null>(null);

  const currentPersona = detailsId ? personasById[detailsId] ?? null : null;

  // Configure how personas are displayed in the library
  const cardConfig: EntityCardConfig = {
    titleField: "name",
    subtitleFields: [
      { field: "attributes.role" },
      { field: "summary" },
    ],
    searchFields: ["name", "summary", "attributes.role", "traits"],
    tagsField: "tags",
  };

  return (
    <>
      <EntityLibrary<CustomerPersona>
        entities={personas}
        entityType="persona"
        cardConfig={cardConfig}
        callbacks={{
          onDetails: (id) => {
            setDetailsId(id);
            setDetailsOpen(true);
          },
          onEdit: (entity) => {
            setEditPersona(entity);
            setUpsertOpen(true);
          },
          onDelete: (id) => {
            deletePersona(id);
          },
          onReset: (id) => {
            if (seedIds.has(id)) {
              resetPersonaToSeed(id);
            }
          },
        }}
      />

      <PersonaDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        persona={currentPersona}
      />

      <PersonaUpsertDialog
        open={upsertOpen}
        onOpenChange={setUpsertOpen}
        mode={editPersona ? "edit" : "create"}
        initial={editPersona}
        onSave={async (p) => {
          await upsertPersona(p);
          setEditPersona(null);
        }}
      />
    </>
  );
}
