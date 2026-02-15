import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Briefcase, ShoppingCart, Eye, Edit2 } from "lucide-react";
import { usePersonas } from "@/personas/store";
import { PersonaDetailsDialog } from "@/components/PersonaDetailsDialog";
import { PersonaUpsertDialog } from "@/components/PersonaUpsertDialog";
import type { CustomerPersona } from "@/personas/types";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { Link } from "react-router-dom";

function personaIcon(id: string) {
  if (id === "fleet-manager") return Briefcase;
  if (id === "small-business-owner") return Users;
  if (id === "individual-buyer") return ShoppingCart;
  return Users;
}

interface PersonaSelectorProps {
  selectedPersonas: string[];
  onPersonaSelect: (personaIds: string[]) => void;
}

export const PersonaSelector = ({ selectedPersonas, onPersonaSelect }: PersonaSelectorProps) => {
  const { personas, personasById, getPersonaName, upsertPersona } = usePersonas();
  const appliedBrands = useWorkspaceStore((state) => state.appliedBrands);

  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [detailsId, setDetailsId] = React.useState<string | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editPersona, setEditPersona] = React.useState<CustomerPersona | null>(null);

  const openDetails = (id: string) => {
    setDetailsId(id);
    setDetailsOpen(true);
  };

  const openEdit = (persona: CustomerPersona) => {
    setEditPersona(persona);
    setEditOpen(true);
  };

  const handlePersonaToggle = (personaId: string) => {
    if (selectedPersonas.includes(personaId)) {
      onPersonaSelect(selectedPersonas.filter((p) => p !== personaId));
    } else {
      onPersonaSelect([...selectedPersonas, personaId]);
    }
  };

  const detailsPersona: CustomerPersona | null =
    detailsId ? personasById[detailsId] ?? null : null;
  const normalizedBrandSet = new Set(appliedBrands.map((brand) => brand.trim().toLowerCase()));
  const filteredPersonas = normalizedBrandSet.size > 0
    ? personas.filter((persona) => normalizedBrandSet.has((persona.brand ?? "Unknown").trim().toLowerCase()))
    : personas;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">Select Target Persona</h2>
        <p className="text-muted-foreground">
          Choose one or more customer personas. Multiple personas enable comparison analysis.
        </p>
      </div>
      <div className="flex justify-end">
        <Button asChild variant="outline" size="sm">
          <Link to="/persona-library">Open Persona Library</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredPersonas.map((persona) => {
          const Icon = personaIcon(persona.id);
          const isSelected = selectedPersonas.includes(persona.id);

          return (
            <Card
              key={persona.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                isSelected ? "ring-2 ring-primary shadow-lg bg-primary/5" : "hover:shadow-md"
              }`}
              onClick={() => handlePersonaToggle(persona.id)}
            >
              <CardHeader className="text-center">
                <div
                  className={`mx-auto p-3 rounded-full w-fit ${
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl">{persona.name}</CardTitle>
                <CardDescription className="text-sm">
                  {persona.summary ?? persona.attributes?.role ?? "—"}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {!!persona.traits?.length && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Key traits</h4>
                    <div className="flex flex-wrap gap-1">
                      {persona.traits.slice(0, 6).map((trait) => (
                        <Badge key={trait} variant="secondary" className="text-xs">
                          {trait}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="font-medium text-sm mb-1">Demographics</h4>
                  <p className="text-xs text-muted-foreground">
                    {persona.demographics.age} · {persona.demographics.location}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant={isSelected ? "analytics" : "outline"}
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePersonaToggle(persona.id);
                    }}
                  >
                    {isSelected ? "Selected" : "Select"}
                  </Button>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDetails(persona.id);
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
                      openEdit(persona);
                    }}
                    aria-label={`Edit persona ${persona.name}`}
                    title="Edit persona"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredPersonas.length === 0 && normalizedBrandSet.size > 0 && (
        <div className="text-center p-6 border rounded-lg text-sm text-muted-foreground">
          No personas found for selected brand filter. Update filters in Workspace.
        </div>
      )}

      {selectedPersonas.length > 0 && (
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <p className="text-sm font-medium">
            Selected Personas: {selectedPersonas.map(getPersonaName).join(", ")}
          </p>
        </div>
      )}

      <PersonaDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        persona={detailsPersona}
        isSelected={detailsPersona ? selectedPersonas.includes(detailsPersona.id) : false}
        onToggleSelect={
          detailsPersona
            ? () => handlePersonaToggle(detailsPersona.id)
            : undefined
        }
      />

      <PersonaUpsertDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        initial={editPersona}
        onSave={(persona) => {
          upsertPersona(persona);
          setEditOpen(false);
        }}
      />
    </div>
  );
};
