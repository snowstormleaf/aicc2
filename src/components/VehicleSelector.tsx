import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Edit2, CheckCircle2 } from "lucide-react";
import { useVehicles } from "@/vehicles/store";
import { VehicleDetailsDialog } from "@/components/VehicleDetailsDialog";
import { VehicleUpsertDialog } from "@/components/VehicleUpsertDialog";
import type { Vehicle } from "@/types/vehicle";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { Link } from "react-router-dom";

interface VehicleSelectorProps {
  selectedVehicle: string | null;
  onSelectVehicle: (vehicleId: string) => void;
}

export const VehicleSelector = ({ selectedVehicle, onSelectVehicle }: VehicleSelectorProps) => {
  const { vehicles, getVehicleName, upsertVehicle } = useVehicles();
  const appliedBrands = useWorkspaceStore((state) => state.appliedBrands);

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
  const normalizedBrandSet = new Set(appliedBrands.map((brand) => brand.trim().toLowerCase()));
  const filteredVehicles = normalizedBrandSet.size > 0
    ? vehicles.filter((vehicle) => normalizedBrandSet.has((vehicle.brand ?? vehicle.manufacturer ?? "Unknown").trim().toLowerCase()))
    : vehicles;

  if (vehicles.length === 0) {
    return (
      <div className="space-y-6">
        <div className="space-y-3 text-center">
          <div>
            <p className="type-caption">Step 2</p>
            <h2 className="type-headline">Select Target Vehicle</h2>
            <p className="type-deck mx-auto content-measure">Choose a vehicle model for feature analysis.</p>
          </div>
          <div className="flex justify-end">
            <Button asChild variant="secondary" size="sm">
              <Link to="/vehicle-library">Open Vehicle Library</Link>
            </Button>
          </div>
        </div>
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground mb-4">No vehicles created yet.</p>
          <p className="text-sm text-muted-foreground">
            Open Vehicle Library from the analysis workflow to create vehicles.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3 text-center">
        <div>
          <p className="type-caption">Step 2</p>
          <h2 className="type-headline">Select Target Vehicle</h2>
          <p className="type-deck mx-auto content-measure">Choose the vehicle model for feature analysis.</p>
        </div>
        <div className="flex justify-end">
          <Button asChild variant="secondary" size="sm">
            <Link to="/vehicle-library">Open Vehicle Library</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {filteredVehicles.map((vehicle) => {
          const isSelected = selectedVehicle === vehicle.id;
          const brandLabel = (vehicle.brand ?? vehicle.manufacturer ?? "").trim();
          const manufacturerLabel = (vehicle.manufacturer ?? "Unknown").trim();
          const subtitleLine = [
            manufacturerLabel,
            (vehicle.model ?? "").trim(),
            vehicle.year != null ? String(vehicle.year) : "",
          ]
            .filter(Boolean)
            .join(" · ");

          return (
            <Card
              key={vehicle.id}
              className={`group flex h-full cursor-pointer flex-col transition-all duration-200 ${
                isSelected
                  ? "border-primary/35 bg-primary/10 shadow-card"
                  : "hover:border-border hover:shadow-card"
              }`}
              onClick={() => onSelectVehicle(vehicle.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{vehicle.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{subtitleLine}</p>
                  </div>
                  {brandLabel && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      {brandLabel}
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col gap-4">
                <div className="flex-1 space-y-4">
                  {vehicle.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {vehicle.description}
                    </p>
                  )}

                  {!!vehicle.tags?.length && (
                    <div>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tags</h4>
                      <div className="flex flex-wrap gap-1">
                        {vehicle.tags.slice(0, 6).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-auto flex gap-2 pt-2">
                  <Button
                    variant={isSelected ? "default" : "outline"}
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectVehicle(vehicle.id);
                    }}
                  >
                    {isSelected && <CheckCircle2 className="h-4 w-4" />}
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

      {filteredVehicles.length === 0 && normalizedBrandSet.size > 0 && (
        <div className="rounded-lg border border-border-subtle p-6 text-center text-sm text-muted-foreground">
          No vehicles found for selected brand filter. Update filters in Workspace.
        </div>
      )}

      {selectedVehicle && (
        <div className="mt-6 rounded-lg border border-primary/30 bg-primary/10 p-4">
          <p className="text-sm font-semibold">
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
        onSave={async (vehicle) => {
          await upsertVehicle(vehicle);
          setEditVehicle(null);
        }}
      />
    </div>
  );
};
