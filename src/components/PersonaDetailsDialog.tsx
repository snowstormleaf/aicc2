import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CustomerPersona } from "@/personas/types";

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

export function PersonaDetailsDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  persona: CustomerPersona | null;

  isSelected?: boolean;
  onToggleSelect?: () => void;
}) {
  const { open, onOpenChange, persona, isSelected, onToggleSelect } = props;

  if (!persona) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span className="truncate">{persona.name}</span>
            {onToggleSelect && (
              <Button variant={isSelected ? "analytics" : "outline"} onClick={onToggleSelect}>
                {isSelected ? "Selected" : "Use for analysis"}
              </Button>
            )}
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <div className="text-sm">
              <span className="font-medium">Role:</span>{" "}
              <span className="text-muted-foreground">{persona.attributes?.role ?? "—"}</span>
            </div>
            {persona.summary && <p className="text-sm text-muted-foreground">{persona.summary}</p>}
            {!!persona.tags?.length && (
              <div className="flex flex-wrap gap-1">
                {persona.tags.slice(0, 8).map((t) => (
                  <Badge key={t} variant="secondary" className="text-xs">
                    {t}
                  </Badge>
                ))}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          <Accordion type="multiple" defaultValue={["traits", "demographics", "motivations", "painPoints"]}>
            <AccordionItem value="traits">
              <AccordionTrigger>Key traits</AccordionTrigger>
              <AccordionContent>
                <SectionList items={persona.traits ?? []} />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="demographics">
              <AccordionTrigger>Demographics</AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div><span className="font-medium">Age:</span> <span className="text-muted-foreground">{persona.demographics.age}</span></div>
                  <div><span className="font-medium">Income:</span> <span className="text-muted-foreground">{persona.demographics.income}</span></div>
                  <div><span className="font-medium">Family:</span> <span className="text-muted-foreground">{persona.demographics.family}</span></div>
                  <div><span className="font-medium">Location:</span> <span className="text-muted-foreground">{persona.demographics.location}</span></div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="attributes">
              <AccordionTrigger>Attributes</AccordionTrigger>
              <AccordionContent>
                {persona.attributes && Object.keys(persona.attributes).length ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    {Object.entries(persona.attributes).map(([k, v]) => (
                      <div key={k} className="flex gap-2">
                        <span className="font-medium">{k}:</span>
                        <span className="text-muted-foreground">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="motivations">
              <AccordionTrigger>Motivations</AccordionTrigger>
              <AccordionContent>
                <SectionList items={persona.motivations ?? []} />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="painPoints">
              <AccordionTrigger>Pain points</AccordionTrigger>
              <AccordionContent>
                <SectionList items={persona.painPoints ?? []} />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="buyingBehavior">
              <AccordionTrigger>Buying behavior</AccordionTrigger>
              <AccordionContent>
                <SectionList items={persona.buyingBehavior ?? []} />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="marketing">
              <AccordionTrigger>Marketing fields</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div>
                  <div className="font-medium text-sm mb-1">Goals</div>
                  <SectionList items={persona.goals ?? []} />
                </div>
                <div>
                  <div className="font-medium text-sm mb-1">Jobs to be done</div>
                  <SectionList items={persona.jobsToBeDone ?? []} />
                </div>
                <div>
                  <div className="font-medium text-sm mb-1">Decision criteria</div>
                  <SectionList items={persona.decisionCriteria ?? []} />
                </div>
                <div>
                  <div className="font-medium text-sm mb-1">Objections</div>
                  <SectionList items={persona.objections ?? []} />
                </div>
                <div>
                  <div className="font-medium text-sm mb-1">Channels</div>
                  <SectionList items={persona.channels ?? []} />
                </div>
                <div>
                  <div className="font-medium text-sm mb-1">Preferred content</div>
                  <SectionList items={persona.preferredContent ?? []} />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="mt-4 text-xs text-muted-foreground">
            Source: <strong>{persona.meta?.source ?? "unknown"}</strong>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}