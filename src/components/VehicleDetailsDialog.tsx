import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { EntityDetailsDialog, type EntityDetailsDialogProps } from "@/components/shared/EntityDetailsDialog";
import type { Vehicle } from "@/types/vehicle";

export function VehicleDetailsDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: Vehicle | null;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}) {
  const { open, onOpenChange, vehicle, isSelected, onToggleSelect } = props;

  if (!vehicle) return null;

  // Build subtitle with manufacturer, model, year, description, and tags
  const subtitle = (
    <div className="space-y-2">
      {vehicle.manufacturer && (
        <div className="text-sm">
          <span className="font-medium">Manufacturer:</span>{" "}
          <span className="text-muted-foreground">{vehicle.manufacturer}</span>
        </div>
      )}
      {vehicle.model && (
        <div className="text-sm">
          <span className="font-medium">Model:</span>{" "}
          <span className="text-muted-foreground">{vehicle.model}</span>
        </div>
      )}
      {vehicle.year && (
        <div className="text-sm">
          <span className="font-medium">Year:</span>{" "}
          <span className="text-muted-foreground">{vehicle.year}</span>
        </div>
      )}
    </div>
  );

  // Configure sections for vehicle details
  const sections: EntityDetailsDialogProps["sections"] = [
    {
      value: "general",
      title: "General Information",
      fields: [
        { key: "name", label: "Name", render: (v) => v ?? "—" },
        { key: "manufacturer", label: "Manufacturer", render: (v) => v ?? "—" },
        { key: "model", label: "Model", render: (v) => v ?? "—" },
        { key: "year", label: "Year", render: (v) => v ?? "—" },
      ],
    },
    ...(vehicle.description
      ? [
          {
            value: "description" as const,
            title: "Description",
            fields: [
              {
                key: "description",
                label: "Description",
                render: (v: string) => (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{v}</p>
                ),
              },
            ],
          },
        ]
      : []),
    ...(vehicle.tags?.length
      ? [
          {
            value: "tags" as const,
            title: "Tags",
            fields: [
              {
                key: "tags",
                label: "Tags",
                render: (v: string[]) => (
                  <div className="flex flex-wrap gap-2">
                    {v.map((t) => (
                      <Badge key={t} variant="secondary">
                        {t}
                      </Badge>
                    ))}
                  </div>
                ),
              },
            ],
          },
        ]
      : []),
    ...(vehicle.createdAt
      ? [
          {
            value: "metadata" as const,
            title: "Metadata",
            fields: [
              {
                key: "createdAt",
                label: "Created",
                render: (v: string) =>
                  v ? new Date(v).toLocaleString() : "—",
              },
              {
                key: "updatedAt",
                label: "Updated",
                render: (v: string) =>
                  v ? new Date(v).toLocaleString() : "—",
              },
            ],
          },
        ]
      : []),
  ];

  return (
    <EntityDetailsDialog
      open={open}
      onOpenChange={onOpenChange}
      entity={vehicle}
      entity_type="vehicle"
      title={vehicle.name}
      subtitle={subtitle}
      sections={sections}
      isSelected={isSelected}
      onToggleSelect={onToggleSelect}
      scrollHeight="h-[56vh]"
    />
  );
}
