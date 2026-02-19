import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Briefcase, ShoppingCart, Eye, Edit2, CheckCircle2 } from "lucide-react";
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
      <div className="space-y-2 text-center">
        <p className="type-caption">Step 1</p>
        <h2 className="type-headline">Select Target Persona</h2>
        <p className="type-deck mx-auto content-measure">
          Choose one or more customer personas. Multiple personas enable comparison analysis.
        </p>
      </div>
      <div className="flex justify-end">
        <Button asChild variant="secondary" size="sm">
          <Link to="/persona-library">Open Persona Library</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredPersonas.map((persona) => {
          const Icon = personaIcon(persona.id);
          const isSelected = selectedPersonas.includes(persona.id);

          return (
            <Card
              key={persona.id}
              className={`group flex h-full cursor-pointer flex-col transition-all duration-200 ${
                isSelected
                  ? "border-primary/35 bg-primary/10 shadow-card"
                  : "hover:border-border hover:shadow-card"
              }`}
              onClick={() => handlePersonaToggle(persona.id)}
            >
              <CardHeader className="text-center">
                <div
                  className={`mx-auto w-fit rounded-full p-3 ${
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                  }`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl">{persona.name}</CardTitle>
                <CardDescription className="text-sm">
                  {persona.summary ?? persona.attributes?.role ?? "—"}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col gap-4">
                <div className="flex-1 space-y-4">
                  {!!persona.traits?.length && (
                    <div>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Key traits</h4>
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
                    <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Demographics</h4>
                    <p className="text-xs text-muted-foreground">
                      {persona.demographics.age} · {persona.demographics.location}
                    </p>
                  </div>
                </div>

                <div className="mt-auto flex gap-2">
                  <Button
                    variant={isSelected ? "default" : "outline"}
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePersonaToggle(persona.id);
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
        <div className="rounded-lg border border-border-subtle p-6 text-center text-sm text-muted-foreground">
          No personas found for selected brand filter. Update filters in Workspace.
        </div>
      )}

      {selectedPersonas.length > 0 && (
        <div className="mt-6 rounded-lg border border-primary/30 bg-primary/10 p-4">
          <p className="text-sm font-semibold">
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
