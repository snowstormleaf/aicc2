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
          render: (val) => (Array.isArray(val) ? val : []),
        },
      ],
      isList: true,
    },
    {
      value: "demographics",
      title: "Demographics",
      fields: (["age", "income", "family", "location"] as const).map((key) => ({
        key: `demographics.${key}`,
        label: key.charAt(0).toUpperCase() + key.slice(1),
        render: () => persona.demographics?.[key] ?? "—",
      })),
    },
    {
      value: "attributes",
      title: "Attributes",
      fields: [
        {
          key: "attributes",
          label: "Attributes",
          render: (attrs) => {
            if (!attrs || typeof attrs !== "object") return "—";
            const entries = Object.entries(attrs as Record<string, unknown>);
            if (!entries.length) return "—";
            return entries
              .filter(([, value]) => value != null && value !== "")
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
          render: (val) => (Array.isArray(val) ? val : []),
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
          render: (val) => (Array.isArray(val) ? val : []),
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
          render: (val) => (Array.isArray(val) ? val : []),
        },
      ],
      isList: true,
    },
    {
      value: "marketing",
      title: "Marketing fields",
      fields: [
        { key: "goals", label: "Goals", render: (val) => (Array.isArray(val) ? val : []) },
        { key: "jobsToBeDone", label: "Jobs to be done", render: (val) => (Array.isArray(val) ? val : []) },
        { key: "decisionCriteria", label: "Decision criteria", render: (val) => (Array.isArray(val) ? val : []) },
        { key: "objections", label: "Objections", render: (val) => (Array.isArray(val) ? val : []) },
        { key: "channels", label: "Channels", render: (val) => (Array.isArray(val) ? val : []) },
        { key: "preferredContent", label: "Preferred content", render: (val) => (Array.isArray(val) ? val : []) },
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
      subtitle={subtitle}
      sections={sections}
      isSelected={isSelected}
      onToggleSelect={onToggleSelect}
      scrollHeight="h-[60vh]"
    />
  );
}
