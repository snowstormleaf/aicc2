import * as React from "react";
import { Search, Plus, Trash2, Pencil, Eye, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * Callback configuration for library operations
 */
export interface LibraryCallbacks<T> {
  onDetails: (id: string) => void;
  onEdit: (entity: T | null) => void;
  onDelete: (id: string) => void;
  onReset?: (id: string) => void;
}

/**
 * Configuration for rendering an entity card
 */
export interface EntityCardConfig {
  titleField: string;
  subtitleFields: (string | { field: string; prefix?: string; suffix?: string })[];
  searchFields: string[];
  tagsField?: string;
  renderSubtitle?: (entity: Record<string, unknown>) => React.ReactNode;
}

/**
 * Generic entity library component for browsing, searching, and managing entities
 */
export interface EntityLibraryProps<T> {
  entities: T[];
  entityType: "persona" | "vehicle" | string;
  cardConfig: EntityCardConfig;
  callbacks: LibraryCallbacks<T>;
  renderEntityCard?: (entity: T, callbacks: LibraryCallbacks<T>, cardConfig: EntityCardConfig) => React.ReactNode;
}

const getString = (value: unknown) => (typeof value === "string" ? value : "");

function defaultRenderEntityCard<T>(
  entity: T,
  callbacks: LibraryCallbacks<T>,
  cardConfig: EntityCardConfig,
  isSeed?: boolean,
  hasResetButton?: boolean,
) {
  const record = entity as Record<string, unknown>;
  const id = getString(record.id) || "";
  const title = getString(record[cardConfig.titleField]) || "Untitled";

  // Build subtitle
  let subtitle = "";
  for (const field of cardConfig.subtitleFields) {
    if (typeof field === "string") {
      const val = getString(record[field]);
      if (val) subtitle += (subtitle ? " · " : "") + val;
    } else {
      const val = getString(record[field.field]);
      if (val) {
        const prefix = field.prefix ? `${field.prefix} ` : "";
        const suffix = field.suffix ? ` ${field.suffix}` : "";
        subtitle += (subtitle ? " · " : "") + prefix + val + suffix;
      }
    }
  }

  const tags = cardConfig.tagsField && Array.isArray(record[cardConfig.tagsField])
    ? (record[cardConfig.tagsField] as string[])
    : [];

  return (
    <Card key={id} className="flex h-full flex-col overflow-hidden transition-all duration-200 hover:border-border hover:shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="min-w-0">
          <div className="truncate">{title}</div>
          {subtitle && <CardDescription className="truncate">{subtitle}</CardDescription>}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3">
        <div className="flex-1">
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 6).map((tag: string) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="mt-auto flex gap-1 self-end">
          <Button
            variant="tertiary"
            size="icon"
            onClick={() => callbacks.onDetails(id)}
            aria-label="View details"
            title="View details"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="tertiary"
            size="icon"
            onClick={() => callbacks.onEdit(entity)}
            aria-label="Edit"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {hasResetButton && isSeed && callbacks.onReset && (
            <Button
              variant="tertiary"
              size="icon"
              onClick={() => callbacks.onReset?.(id)}
              aria-label="Reset to seed"
              title="Reset to seed"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="tertiary"
            size="icon"
            onClick={() => callbacks.onDelete(id)}
            aria-label="Delete"
            title="Delete"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function EntityLibrary<T extends { id: string }>({
  entities,
  entityType,
  cardConfig,
  callbacks,
  renderEntityCard,
}: EntityLibraryProps<T>) {
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entities;

    return entities.filter((entity) => {
      const record = entity as Record<string, unknown>;
      const searchableText = cardConfig.searchFields
        .map((f) => getString(record[f]))
        .concat(cardConfig.tagsField && Array.isArray(record[cardConfig.tagsField])
          ? (record[cardConfig.tagsField] as string[])
          : [])
        .join(" ")
        .toLowerCase();

      return searchableText.includes(q);
    });
  }, [entities, query, cardConfig]);

  const placeholderText =
    entityType === "persona"
      ? "Search personas…"
      : entityType === "vehicle"
        ? "Search vehicles…"
        : `Search ${entityType}s…`;

  const newButtonText = entityType === "persona" ? "New Persona" : entityType === "vehicle" ? "New Vehicle" : "New";

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholderText}
          />
        </div>
        <Button onClick={() => callbacks.onEdit?.(null)}>
          <Plus className="h-4 w-4" />
          {newButtonText}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.length === 0 ? (
          <div className="col-span-full rounded-lg border border-border-subtle bg-muted/15 p-12 text-center">
            <p className="text-muted-foreground">
              {query ? "No results found." : `No ${entityType}s yet.`}
            </p>
          </div>
        ) : (
          filtered.map((entity) => {
            const record = entity as Record<string, unknown>;
            const meta = record.meta as { source?: string } | undefined;
            const isSeed = (meta?.source ?? "") === "seed";
            const hasResetButton = entityType === "persona";

            if (renderEntityCard) {
              return renderEntityCard(entity, callbacks, cardConfig);
            }

            return defaultRenderEntityCard(entity, callbacks, cardConfig, isSeed, hasResetButton);
          })
        )}
      </div>
    </div>
  );
}
