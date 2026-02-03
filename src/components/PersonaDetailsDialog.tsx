import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { EntityDetailsDialog, type EntityDetailsDialogProps } from "@/components/shared/EntityDetailsDialog";
import type { CustomerPersona } from "@/personas/types";

export function PersonaDetailsDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  persona: CustomerPersona | null;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}) {
  const { open, onOpenChange, persona, isSelected, onToggleSelect } = props;

  if (!persona) return null;

  // Build subtitle with role, summary, and tags
  const subtitle = (
    <div className="space-y-2">
      {persona.attributes?.role && (
        <div className="text-sm">
          <span className="font-medium">Role:</span>{" "}
          <span className="text-muted-foreground">{persona.attributes.role}</span>
        </div>
      )}
      {persona.summary && (
        <p className="text-sm text-muted-foreground">{persona.summary}</p>
      )}
      {!!persona.tags?.length && (
        <div className="flex flex-wrap gap-1">
          {persona.tags.slice(0, 8).map((t) => (
            <Badge key={t} variant="secondary" className="text-xs">
              {t}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );

  // Configure sections for persona details
  const sections: EntityDetailsDialogProps["sections"] = [
    {
      value: "traits",
      title: "Key traits",
      fields: [
        {
          key: "traits",
          label: "Traits",
          render: (val: string[]) => val ?? [],
        },
      ],
      isList: true,
    },
    {
      value: "demographics",
      title: "Demographics",
      fields: [
        { key: "age", label: "Age", render: (v) => v ?? "—" },
        { key: "income", label: "Income", render: (v) => v ?? "—" },
        { key: "family", label: "Family", render: (v) => v ?? "—" },
        { key: "location", label: "Location", render: (v) => v ?? "—" },
      ]
        .map(f => ({
          ...f,
          key: `demographics.${f.key}`,
          render: (v: any) => persona.demographics?.[f.key.split('.')[1]] ?? "—",
        }))
        .slice(0, 4),
    },
    {
      value: "attributes",
      title: "Attributes",
      fields: [
        {
          key: "attributes",
          label: "Attributes",
          render: (attrs: any) => {
            if (!attrs || !Object.keys(attrs).length) return "—";
            return Object.entries(attrs)
              .map(([k, v]) => `${k}: ${v}`)
              .join("\n");
          },
        },
      ],
    },
    {
      value: "motivations",
      title: "Motivations",
      fields: [
        {
          key: "motivations",
          label: "Motivations",
          render: (val: string[]) => val ?? [],
        },
      ],
      isList: true,
    },
    {
      value: "painPoints",
      title: "Pain points",
      fields: [
        {
          key: "painPoints",
          label: "Pain points",
          render: (val: string[]) => val ?? [],
        },
      ],
      isList: true,
    },
    {
      value: "buyingBehavior",
      title: "Buying behavior",
      fields: [
        {
          key: "buyingBehavior",
          label: "Buying behavior",
          render: (val: string[]) => val ?? [],
        },
      ],
      isList: true,
    },
    {
      value: "marketing",
      title: "Marketing fields",
      fields: [
        { key: "goals", label: "Goals", render: (v: string[]) => v ?? [] },
        { key: "jobsToBeDone", label: "Jobs to be done", render: (v: string[]) => v ?? [] },
        { key: "decisionCriteria", label: "Decision criteria", render: (v: string[]) => v ?? [] },
        { key: "objections", label: "Objections", render: (v: string[]) => v ?? [] },
        { key: "channels", label: "Channels", render: (v: string[]) => v ?? [] },
        { key: "preferredContent", label: "Preferred content", render: (v: string[]) => v ?? [] },
      ],
    },
  ];

  return (
    <EntityDetailsDialog
      open={open}
      onOpenChange={onOpenChange}
      entity={persona}
      entity_type="persona"
      title={persona.name}
      subtitle={subtitle as any}
      sections={sections}
      isSelected={isSelected}
      onToggleSelect={onToggleSelect}
      scrollHeight="h-[60vh]"
    />
  );
}