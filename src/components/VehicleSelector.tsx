import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Edit2 } from "lucide-react";
import { useVehicles } from "@/vehicles/store";
import { VehicleDetailsDialog } from "@/components/VehicleDetailsDialog";
import { VehicleUpsertDialog } from "@/components/VehicleUpsertDialog";
import type { Vehicle } from "@/types/vehicle";

interface VehicleSelectorProps {
  selectedVehicle: string | null;
  onSelectVehicle: (vehicleId: string) => void;
}

export const VehicleSelector = ({ selectedVehicle, onSelectVehicle }: VehicleSelectorProps) => {
  const { vehicles, getVehicleName, upsertVehicle } = useVehicles();

  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [detailsId, setDetailsId] = React.useState<string | null>(null);

  const [editOpen, setEditOpen] = React.useState(false);
  const [editVehicle, setEditVehicle] = React.useState<Vehicle | null>(null);

  const openDetails = (id: string) => {
    setDetailsId(id);
    setDetailsOpen(true);
  };

  const openEdit = (vehicle: Vehicle) => {
    setEditVehicle(vehicle);
    setEditOpen(true);
  };

  const currentVehicle = detailsId ? vehicles.find(v => v.id === detailsId) ?? null : null;

  if (vehicles.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Select Target Vehicle</h2>
          <p className="text-muted-foreground">Choose a vehicle model for feature analysis</p>
        </div>
        <div className="text-center p-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">No vehicles created yet.</p>
          <p className="text-sm text-muted-foreground">
            Create vehicles in the Workspace menu (Vehicles tab) to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">Select Target Vehicle</h2>
        <p className="text-muted-foreground">Choose the vehicle model for feature analysis</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {vehicles.map((vehicle) => {
          const isSelected = selectedVehicle === vehicle.id;

          return (
            <Card
              key={vehicle.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                isSelected
                  ? "ring-2 ring-primary shadow-lg bg-primary/5"
                  : "hover:shadow-md"
              }`}
              onClick={() => onSelectVehicle(vehicle.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{vehicle.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {vehicle.manufacturer && `${vehicle.manufacturer}`}
                      {vehicle.model && ` · ${vehicle.model}`}
                      {vehicle.year && ` · ${vehicle.year}`}
                    </p>
                  </div>
                  {vehicle.manufacturer && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      {vehicle.manufacturer}
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {vehicle.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {vehicle.description}
                  </p>
                )}

                {!!vehicle.tags?.length && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-1">
                      {vehicle.tags.slice(0, 6).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant={isSelected ? "analytics" : "outline"}
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectVehicle(vehicle.id);
                    }}
                  >
                    {isSelected ? "Selected" : "Select"}
                  </Button>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDetails(vehicle.id);
                    }}
                    aria-label="View details"
                    title="View details"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(vehicle);
                    }}
                    aria-label="Edit"
                    title="Edit"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedVehicle && (
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <p className="text-sm font-medium">
            Selected Vehicle: {getVehicleName(selectedVehicle)}
          </p>
        </div>
      )}

      <VehicleDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        vehicle={currentVehicle}
      />

      <VehicleUpsertDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        initial={editVehicle}
        onSave={(vehicle) => {
          upsertVehicle(vehicle);
          setEditOpen(false);
        }}
      />
    </div>
  );
};
