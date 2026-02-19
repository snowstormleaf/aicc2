import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * Configuration for displaying a single entity field
 */
interface FieldConfig {
  key: string;
  label: string;
  render: (value: unknown, entity: Record<string, unknown>) => React.ReactNode;
}

/**
 * Configuration for an accordion section in the details dialog
 */
interface SectionConfig {
  value: string;
  title: string;
  fields: FieldConfig[];
  isList?: boolean;
}

/**
 * Generic entity details dialog that works for personas, vehicles, or any entity
 */
export interface EntityDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: Record<string, unknown> | null;
  entity_type: string; // e.g., "persona", "vehicle" for accessibility
  title?: string;
  subtitle?: React.ReactNode;
  sections: SectionConfig[];
  isSelected?: boolean;
  onToggleSelect?: () => void;
  scrollHeight?: string;
}

function SectionList({ items }: { items: string[] }) {
  if (!items?.length) return <p className="text-sm text-muted-foreground">—</p>;
  return (
    <ul className="list-disc pl-5 space-y-1">
      {items.map((x, i) => (
        <li key={`${x}-${i}`} className="text-sm">
          {x}
        </li>
      ))}
    </ul>
  );
}

export function EntityDetailsDialog({
  open,
  onOpenChange,
  entity,
  entity_type,
  title,
  subtitle,
  sections,
  isSelected,
  onToggleSelect,
  scrollHeight = "h-[60vh]",
}: EntityDetailsDialogProps) {
  if (!entity) return null;

  const displayTitle = title || entity?.name || "Details";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[85vh] max-w-2xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span className="truncate">{displayTitle}</span>
            {onToggleSelect && (
              <Button
                variant={isSelected ? "default" : "outline"}
                onClick={onToggleSelect}
                aria-label={isSelected ? "Selected" : `Use for analysis`}
              >
                {isSelected ? "Selected" : "Use for analysis"}
              </Button>
            )}
          </DialogTitle>
          {subtitle && <DialogDescription>{subtitle}</DialogDescription>}
        </DialogHeader>

        <ScrollArea className={`min-h-0 ${scrollHeight} pr-4`}>
          <Accordion
            type="multiple"
            defaultValue={sections.slice(0, 2).map((s) => s.value)}
          >
            {sections.map((section) => (
              <AccordionItem key={section.value} value={section.value}>
                <AccordionTrigger>{section.title}</AccordionTrigger>
                <AccordionContent>
                  {section.isList ? (
                    <SectionList
                      items={(() => {
                        const field = section.fields[0];
                        const value = field ? entity?.[field.key] : undefined;
                        const rendered = field?.render(value, entity);
                        return Array.isArray(rendered) ? rendered : [];
                      })()}
                    />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {section.fields.map((field) => {
                        const value = entity?.[field.key];
                        const rendered = field.render(value, entity);

                        return (
                          <div key={field.key}>
                            <span className="font-medium">{field.label}:</span>{" "}
                            <span className="text-muted-foreground">{rendered}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
