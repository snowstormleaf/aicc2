import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { CustomerPersona } from "@/personas/types";

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
  const base = slugify(name) || "persona";
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

async function aiGeneratePersona(apiKey: string, brief: string): Promise<Partial<CustomerPersona>> {
  const system = `
You create customer/marketing/buyer personas.
Return ONLY a single JSON object (no markdown) with this shape:

{
  "name": "string",
  "summary": "string",
  "traits": ["string", ...],
  "tags": ["string", ...],
  "attributes": { "role": "string", "company_size": "string", "responsibility": "string", "decision_authority": "string" },
  "demographics": { "age": "string", "income": "string", "family": "string", "location": "string" },
  "motivations": ["string", ...],
  "painPoints": ["string", ...],
  "buyingBehavior": ["string", ...],
  "goals": ["string", ...],
  "jobsToBeDone": ["string", ...],
  "decisionCriteria": ["string", ...],
  "objections": ["string", ...],
  "channels": ["string", ...],
  "preferredContent": ["string", ...]
}
  `.trim();

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini-2025-04-14",
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Persona brief:\n${brief}` },
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
  return JSON.parse(json) as Partial<CustomerPersona>;
}

export function PersonaUpsertDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  mode: "create" | "edit";
  initial?: CustomerPersona | null;

  onSave: (persona: CustomerPersona) => void;
}) {
  const { open, onOpenChange, mode, initial, onSave } = props;

  const [tab, setTab] = React.useState<"manual" | "ai">("manual");

  const [name, setName] = React.useState(initial?.name ?? "");
  const [summary, setSummary] = React.useState(initial?.summary ?? "");

  const [role, setRole] = React.useState(initial?.attributes?.role ?? "");
  const [companySize, setCompanySize] = React.useState(initial?.attributes?.company_size ?? "");
  const [responsibility, setResponsibility] = React.useState(initial?.attributes?.responsibility ?? "");
  const [decisionAuthority, setDecisionAuthority] = React.useState(initial?.attributes?.decision_authority ?? "");

  const [age, setAge] = React.useState(initial?.demographics?.age ?? "");
  const [income, setIncome] = React.useState(initial?.demographics?.income ?? "");
  const [family, setFamily] = React.useState(initial?.demographics?.family ?? "");
  const [location, setLocation] = React.useState(initial?.demographics?.location ?? "");

  const [traits, setTraits] = React.useState((initial?.traits ?? []).join("\n"));
  const [tags, setTags] = React.useState((initial?.tags ?? []).join("\n"));

  const [motivations, setMotivations] = React.useState((initial?.motivations ?? []).join("\n"));
  const [painPoints, setPainPoints] = React.useState((initial?.painPoints ?? []).join("\n"));
  const [buyingBehavior, setBuyingBehavior] = React.useState((initial?.buyingBehavior ?? []).join("\n"));

  const [goals, setGoals] = React.useState((initial?.goals ?? []).join("\n"));
  const [jobsToBeDone, setJobsToBeDone] = React.useState((initial?.jobsToBeDone ?? []).join("\n"));
  const [decisionCriteria, setDecisionCriteria] = React.useState((initial?.decisionCriteria ?? []).join("\n"));
  const [objections, setObjections] = React.useState((initial?.objections ?? []).join("\n"));
  const [channels, setChannels] = React.useState((initial?.channels ?? []).join("\n"));
  const [preferredContent, setPreferredContent] = React.useState((initial?.preferredContent ?? []).join("\n"));

  const [brief, setBrief] = React.useState("");
  const [aiBusy, setAiBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setTab("manual");
  }, [open]);

  const handleSaveManual = () => {
    setError(null);

    const finalName = name.trim();
    if (!finalName) {
      setError("Name is required.");
      return;
    }

    const id = mode === "edit" ? (initial?.id ?? newIdFromName(finalName)) : newIdFromName(finalName);

    const persona: CustomerPersona = {
      id,
      name: finalName,
      summary: summary.trim() || undefined,
      traits: splitLines(traits),
      tags: splitLines(tags),

      attributes: {
        role: role.trim(),
        company_size: companySize.trim(),
        responsibility: responsibility.trim(),
        decision_authority: decisionAuthority.trim(),
      },
      demographics: {
        age: age.trim() || "Unknown",
        income: income.trim() || "Unknown",
        family: family.trim() || "Unknown",
        location: location.trim() || "Unknown",
      },
      motivations: splitLines(motivations),
      painPoints: splitLines(painPoints),
      buyingBehavior: splitLines(buyingBehavior),

      goals: splitLines(goals),
      jobsToBeDone: splitLines(jobsToBeDone),
      decisionCriteria: splitLines(decisionCriteria),
      objections: splitLines(objections),
      channels: splitLines(channels),
      preferredContent: splitLines(preferredContent),

      meta: {
        source: mode === "edit" ? (initial?.meta?.source ?? "manual") : "manual",
        createdAt: initial?.meta?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    onSave(persona);
    onOpenChange(false);
  };

  const handleGenerateFromAI = async () => {
    setError(null);
    const apiKey = localStorage.getItem("openai_api_key") ?? "";
    if (!apiKey) {
      setError("No OpenAI API key found. Add it in Configuration first.");
      return;
    }
    if (!brief.trim()) {
      setError("Please enter a persona brief.");
      return;
    }

    setAiBusy(true);
    try {
      const partial = await aiGeneratePersona(apiKey, brief.trim());
      // Hydrate fields into the manual form (so user can edit before saving)
      setName(String(partial.name ?? "").trim());
      setSummary(String(partial.summary ?? "").trim());

      setRole(String(partial.attributes?.role ?? "").trim());
      setCompanySize(String((partial.attributes as any)?.company_size ?? "").trim());
      setResponsibility(String((partial.attributes as any)?.responsibility ?? "").trim());
      setDecisionAuthority(String((partial.attributes as any)?.decision_authority ?? "").trim());

      setAge(String(partial.demographics?.age ?? "").trim());
      setIncome(String(partial.demographics?.income ?? "").trim());
      setFamily(String(partial.demographics?.family ?? "").trim());
      setLocation(String(partial.demographics?.location ?? "").trim());

      setTraits((partial.traits ?? []).join("\n"));
      setTags((partial.tags ?? []).join("\n"));

      setMotivations((partial.motivations ?? []).join("\n"));
      setPainPoints((partial.painPoints ?? []).join("\n"));
      setBuyingBehavior((partial.buyingBehavior ?? []).join("\n"));

      setGoals(((partial as any).goals ?? []).join("\n"));
      setJobsToBeDone(((partial as any).jobsToBeDone ?? []).join("\n"));
      setDecisionCriteria(((partial as any).decisionCriteria ?? []).join("\n"));
      setObjections(((partial as any).objections ?? []).join("\n"));
      setChannels(((partial as any).channels ?? []).join("\n"));
      setPreferredContent(((partial as any).preferredContent ?? []).join("\n"));

      setTab("manual");
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI generation failed.");
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create persona" : "Edit persona"}</DialogTitle>
          <DialogDescription>
            Manual entry or AI builder. Saved personas become selectable for analysis.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
            {error}
          </div>
        )}

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList>
            <TabsTrigger value="manual">Manual</TabsTrigger>
            <TabsTrigger value="ai">AI builder</TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="space-y-3">
            <div className="space-y-2">
              <Label>Persona brief</Label>
              <Textarea
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="e.g., Procurement lead at mid-size delivery company, optimizing fleet costs; skeptical of unproven tech; prioritizes uptime..."
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleGenerateFromAI} disabled={aiBusy}>
                {aiBusy ? "Generating..." : "Generate persona"}
              </Button>
              <Button variant="outline" onClick={() => setBrief("")} disabled={aiBusy}>
                Clear
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Uses the API key saved in Configuration (localStorage key: <code>openai_api_key</code>).
            </p>
          </TabsContent>

          <TabsContent value="manual" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Fleet Manager" />
              </div>
              <div className="space-y-2">
                <Label>Summary</Label>
                <Input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="One-liner describing this persona" />
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Operations / Fleet Manager" />
              </div>
              <div className="space-y-2">
                <Label>Company size</Label>
                <Input value={companySize} onChange={(e) => setCompanySize(e.target.value)} placeholder="50–200 employees" />
              </div>

              <div className="space-y-2">
                <Label>Responsibility</Label>
                <Input value={responsibility} onChange={(e) => setResponsibility(e.target.value)} placeholder="Owns fleet utilization and uptime" />
              </div>
              <div className="space-y-2">
                <Label>Decision authority</Label>
                <Input value={decisionAuthority} onChange={(e) => setDecisionAuthority(e.target.value)} placeholder="Final approver / influencer" />
              </div>

              <div className="space-y-2">
                <Label>Age</Label>
                <Input value={age} onChange={(e) => setAge(e.target.value)} placeholder="35–55" />
              </div>
              <div className="space-y-2">
                <Label>Income</Label>
                <Input value={income} onChange={(e) => setIncome(e.target.value)} placeholder="€70k–€120k" />
              </div>
              <div className="space-y-2">
                <Label>Family</Label>
                <Input value={family} onChange={(e) => setFamily(e.target.value)} placeholder="Married, 2 kids" />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Germany / DACH" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Traits (one per line)</Label>
                <Textarea value={traits} onChange={(e) => setTraits(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Tags (one per line)</Label>
                <Textarea value={tags} onChange={(e) => setTags(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Motivations (one per line)</Label>
                <Textarea value={motivations} onChange={(e) => setMotivations(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Pain points (one per line)</Label>
                <Textarea value={painPoints} onChange={(e) => setPainPoints(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Buying behavior (one per line)</Label>
                <Textarea value={buyingBehavior} onChange={(e) => setBuyingBehavior(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Goals (one per line)</Label>
                <Textarea value={goals} onChange={(e) => setGoals(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Jobs to be done (one per line)</Label>
                <Textarea value={jobsToBeDone} onChange={(e) => setJobsToBeDone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Decision criteria (one per line)</Label>
                <Textarea value={decisionCriteria} onChange={(e) => setDecisionCriteria(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Objections (one per line)</Label>
                <Textarea value={objections} onChange={(e) => setObjections(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Channels (one per line)</Label>
                <Textarea value={channels} onChange={(e) => setChannels(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Preferred content (one per line)</Label>
                <Textarea value={preferredContent} onChange={(e) => setPreferredContent(e.target.value)} />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveManual}>
                {mode === "create" ? "Create persona" : "Save changes"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}