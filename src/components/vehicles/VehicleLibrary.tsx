import * as React from "react";
import { useVehicles } from "@/vehicles/store";
import type { Vehicle } from "@/types/vehicle";
import { VehicleDetailsDialog } from "@/components/VehicleDetailsDialog";
import { VehicleUpsertDialog } from "@/components/VehicleUpsertDialog";
import { EntityLibrary, type EntityCardConfig } from "@/components/shared/EntityLibrary";

export function VehicleLibrary() {
  const { vehicles, upsertVehicle, deleteVehicle } = useVehicles();

  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [detailsId, setDetailsId] = React.useState<string | null>(null);

  const [upsertOpen, setUpsertOpen] = React.useState(false);
  const [editVehicle, setEditVehicle] = React.useState<Vehicle | null>(null);

  const currentVehicle = detailsId ? vehicles.find((v) => v.id === detailsId) ?? null : null;

  // Configure how vehicles are displayed in the library
  const cardConfig: EntityCardConfig = {
    titleField: "name",
    subtitleFields: [
      { field: "manufacturer" },
      { field: "model" },
      { field: "year" },
    ],
    searchFields: ["name", "description", "manufacturer", "model", "tags"],
    tagsField: "tags",
  };

  return (
    <>
      <EntityLibrary<Vehicle>
        entities={vehicles}
        entityType="vehicle"
        cardConfig={cardConfig}
        callbacks={{
          onDetails: (id) => {
            setDetailsId(id);
            setDetailsOpen(true);
          },
          onEdit: (entity) => {
            setEditVehicle(entity);
            setUpsertOpen(true);
          },
          onDelete: (id) => {
            deleteVehicle(id);
          },
        }}
      />

      <VehicleDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        vehicle={currentVehicle}
      />

      <VehicleUpsertDialog
        open={upsertOpen}
        onOpenChange={setUpsertOpen}
        mode={editVehicle ? "edit" : "create"}
        initial={editVehicle}
        onSave={(v) => {
          upsertVehicle(v);
          setUpsertOpen(false);
          setEditVehicle(null);
        }}
      />
    </>
  );
}
