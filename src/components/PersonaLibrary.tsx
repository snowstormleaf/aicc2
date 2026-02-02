import * as React from "react";
import { Search, Plus, Trash2, RotateCcw, Pencil, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePersonas } from "@/personas/store";
import type { CustomerPersona } from "@/personas/types";
import { PersonaDetailsDialog } from "@/components/PersonaDetailsDialog";
import { PersonaUpsertDialog } from "@/components/PersonaUpsertDialog";

export function PersonaLibrary() {
  const { personas, personasById, seedIds, upsertPersona, deletePersona, resetPersonaToSeed } = usePersonas();

  const [query, setQuery] = React.useState("");
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [detailsId, setDetailsId] = React.useState<string | null>(null);

  const [upsertOpen, setUpsertOpen] = React.useState(false);
  const [editPersona, setEditPersona] = React.useState<CustomerPersona | null>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return personas;
    return personas.filter((p) => {
      const hay = [
        p.name,
        p.summary ?? "",
        p.attributes?.role ?? "",
        ...(p.tags ?? []),
        ...(p.traits ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [personas, query]);

  const openDetails = (id: string) => {
    setDetailsId(id);
    setDetailsOpen(true);
  };

  const currentPersona = detailsId ? personasById[detailsId] ?? null : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search personas…"
          />
        </div>
        <Button
          onClick={() => {
            setEditPersona(null);
            setUpsertOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          New
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {filtered.map((p) => {
          const isSeed = seedIds.has(p.id);
          const isOverridden = isSeed && p.meta?.source !== "seed"; // seed ID but custom override exists

          return (
            <Card key={p.id} className="hover:shadow-sm transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate">{p.name}</div>
                    <CardDescription className="truncate">
                      {p.attributes?.role ?? "—"}
                      {p.summary ? ` · ${p.summary}` : ""}
                    </CardDescription>
                  </div>

                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openDetails(p.id)} aria-label="View details">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditPersona(p);
                        setUpsertOpen(true);
                      }}
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>

                    {isSeed && !isOverridden ? (
                      <Button variant="ghost" size="icon" disabled aria-label="Seed persona">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : isSeed && isOverridden ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => resetPersonaToSeed(p.id)}
                        aria-label="Reset to seed"
                        title="Reset to seed"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deletePersona(p.id)}
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>

              <CardContent className="pt-0 space-y-2">
                {!!p.traits?.length && (
                  <div className="flex flex-wrap gap-1">
                    {p.traits.slice(0, 6).map((t) => (
                      <Badge key={t} variant="secondary" className="text-xs">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  Source: <strong>{p.meta?.source ?? "unknown"}</strong>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

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
        onSave={(persona) => {
          upsertPersona(persona);
        }}
      />
    </div>
  );
}