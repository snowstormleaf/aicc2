import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { Vehicle } from "@/types/vehicle";
import { buildVehicleFormDefaults } from "@/lib/form-defaults";

function splitLines(v: string) {
  return v
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function newIdFromName(name: string) {
  const base = slugify(name) || "vehicle";
  const rand = Math.random().toString(16).slice(2, 8);
  return `${base}-${rand}`;
}

function extractJsonObject(text: string): string {
  // Works with plain JSON or fenced ```json blocks
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence?.[1]) return fence[1].trim();

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text.trim();
}

async function aiGenerateVehicle(apiKey: string, brief: string): Promise<Partial<Vehicle>> {
  const system = `
You create vehicle specifications.
Return ONLY a single JSON object (no markdown) with this shape:

{
  "name": "string",
  "manufacturer": "string",
  "model": "string",
  "year": number,
  "description": "string",
  "tags": ["string", ...]
}
  `.trim();

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Vehicle brief:\n${brief}` },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? "";
  const json = extractJsonObject(String(content));
  return JSON.parse(json) as Partial<Vehicle>;
}

export function VehicleUpsertDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  mode: "create" | "edit";
  initial?: Vehicle | null;

  onSave: (vehicle: Vehicle) => void;
}) {
  const { open, onOpenChange, mode, initial, onSave } = props;

  const [tab, setTab] = React.useState<"manual" | "ai">("manual");

  const initialDefaults = React.useMemo(() => buildVehicleFormDefaults(initial), [initial]);

  const [name, setName] = React.useState(initialDefaults.name);
  const [manufacturer, setManufacturer] = React.useState(initialDefaults.manufacturer);
  const [model, setModel] = React.useState(initialDefaults.model);
  const [year, setYear] = React.useState(initialDefaults.year);
  const [description, setDescription] = React.useState(initialDefaults.description);
  const [tags, setTags] = React.useState(initialDefaults.tags);

  const [brief, setBrief] = React.useState("");
  const [aiBusy, setAiBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setTab("manual");
    const defaults = buildVehicleFormDefaults(initial);
    setName(defaults.name);
    setManufacturer(defaults.manufacturer);
    setModel(defaults.model);
    setYear(defaults.year);
    setDescription(defaults.description);
    setTags(defaults.tags);
  }, [open, initial]);

  const handleSaveManual = () => {
    setError(null);

    const finalName = name.trim();
    if (!finalName) {
      setError("Name is required.");
      return;
    }

    const vehicle: Vehicle = {
      id: initial?.id ?? newIdFromName(finalName),
      name: finalName,
      manufacturer: manufacturer.trim() || undefined,
      model: model.trim() || undefined,
      year: year.trim() ? Number(year.trim()) : undefined,
      description: description.trim() || undefined,
      tags: splitLines(tags),
      createdAt: initial?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(vehicle);
    onOpenChange(false);
  };

  const handleAIGenerate = async () => {
    setError(null);
    const finalBrief = brief.trim();
    if (!finalBrief) {
      setError("Please enter a brief description.");
      return;
    }

    setAiBusy(true);
    try {
      const apiKey = localStorage.getItem("openai_api_key");
      if (!apiKey) {
        throw new Error("OpenAI API key not found. Please set it in Configuration.");
      }

      const result = await aiGenerateVehicle(apiKey, finalBrief);

      setName(result.name ?? "");
      setManufacturer(result.manufacturer ?? "");
      setModel(result.model ?? "");
      setYear(result.year ? String(result.year) : "");
      setDescription(result.description ?? "");
      setTags((result.tags ?? []).join("\n"));

      setTab("manual");
      setBrief("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create Vehicle" : "Edit Vehicle"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a new vehicle to your library."
              : "Update vehicle details."}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual</TabsTrigger>
            <TabsTrigger value="ai">AI Generate</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4">
            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="vehicle-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="vehicle-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Urban Delivery Van"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vehicle-manufacturer">Manufacturer</Label>
                <Input
                  id="vehicle-manufacturer"
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  placeholder="e.g. Mercedes"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicle-model">Model</Label>
                <Input
                  id="vehicle-model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. Sprinter"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicle-year">Year</Label>
              <Input
                id="vehicle-year"
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="e.g. 2024"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicle-description">Description</Label>
              <Textarea
                id="vehicle-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed description of the vehicle..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicle-tags">Tags (one per line)</Label>
              <Textarea
                id="vehicle-tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g. commercial&#10;delivery&#10;electric"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveManual}>
                {mode === "create" ? "Create" : "Save"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="ai" className="space-y-4">
            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="vehicle-brief">Describe the vehicle you want to create</Label>
              <Textarea
                id="vehicle-brief"
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="e.g. 'Create a luxury SUV for families with focus on safety and comfort'"
                rows={6}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleAIGenerate} disabled={aiBusy || !brief.trim()}>
                {aiBusy ? "Generating..." : "Generate"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
