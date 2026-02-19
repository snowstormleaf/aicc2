# UI Refresh: AI Customer Clinic

## Scope
This refresh implements a cohesive editorial + enterprise design language while preserving business logic, routes, and API flow.

## Design Tokens

### Primitive tokens
Defined in `/Users/simon/dev/aicc2/src/index.css`.

- Color primitives:
  - Neutral scale (`--neutral-*`) for background/surface/text/border structure.
  - Green accent scale (`--green-*`) for primary actions and focus highlights.
  - Status colors (`--red-600`, `--amber-600`).
- Spacing scale:
  - `--space-1`=4px, `--space-2`=8px, `--space-3`=12px, `--space-4`=16px, `--space-6`=24px, `--space-8`=32px, `--space-12`=48px, `--space-16`=64px.
- Radius tokens:
  - `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`.
- Shadow tokens:
  - `--shadow-subtle`, `--shadow-soft`, `--shadow-card`, `--shadow-focus`.
- Typography primitives:
  - `--font-display` (Source Serif 4), `--font-body` (Manrope), `--font-mono` (IBM Plex Mono).
  - Role sizes/line-height (`--fs-display`, `--fs-headline`, `--fs-deck`, `--fs-body`, `--fs-caption`).

### Semantic tokens
Defined in `/Users/simon/dev/aicc2/src/index.css` and mapped to existing shadcn/tailwind aliases.

- Surfaces/text:
  - `--bg`, `--surface`, `--surface-elevated`, `--surface-muted`
  - `--text-primary`, `--text-muted`, `--text-inverse`
- Borders:
  - `--border-subtle`, `--border-strong`
- Accent system:
  - `--accent`, `--accent-hover`, `--accent-subtle`, `--focus-ring`
- Link system:
  - `--link`, `--link-visited`
- Compatibility aliases:
  - `--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--secondary`, `--muted`, `--border`, `--ring`, etc.

## Typography + Reading Layout

### Roles
Implemented via utility roles in `/Users/simon/dev/aicc2/src/index.css` and Tailwind extension in `/Users/simon/dev/aicc2/tailwind.config.ts`.

- `type-display`: hero display
- `type-headline`: section/page headlines
- `type-deck`: short executive summary text
- `type-body`: standard body text
- `type-caption`: small uppercase metadata labels
- `type-mono`: technical IDs/log snippets

### Measure and rhythm
- Readable line length utilities:
  - `content-measure` (66ch)
  - `content-measure-wide` (80ch)
- Page rhythm helpers:
  - `page-shell`, `section-frame`, `editorial-stack`, `tile-grid`.

## Component Conventions

### Buttons
Updated in `/Users/simon/dev/aicc2/src/components/ui/button.tsx`.

- Variants:
  - `default`: primary accent action
  - `secondary`: neutral outlined surface action
  - `tertiary`: text-like neutral action
  - `outline`: neutral boundary action
  - `destructive`: destructive intent
  - `link`: inline textual action
- Do:
  - Use accent only for primary conversion points.
  - Use `secondary`/`tertiary` for surrounding controls.
- Don’t:
  - Use accent-heavy styles for every control in a dense panel.

### Links
Global behavior in `/Users/simon/dev/aicc2/src/index.css`.

- Underline is present by default.
- Hover/focus strengthens underline + color.
- Visited state uses dedicated token.
- Buttons apply `no-underline` so button-label links remain button-like.

### Inputs
Updated in:
- `/Users/simon/dev/aicc2/src/components/ui/input.tsx`
- `/Users/simon/dev/aicc2/src/components/ui/textarea.tsx`
- `/Users/simon/dev/aicc2/src/components/ui/select.tsx`
- `/Users/simon/dev/aicc2/src/components/ui/checkbox.tsx`

Conventions:
- Clear border + subtle transitions.
- Accent focus boundary and accessible focus ring.
- Placeholder muted but readable.

### Cards / Tiles
Updated in:
- `/Users/simon/dev/aicc2/src/components/ui/card.tsx`
- `/Users/simon/dev/aicc2/src/components/shared/EntityLibrary.tsx`

Conventions:
- Editorial tiles with top rectangular media band.
- Minimal border + subtle elevation.
- Dense metadata in caption/deck styles.

### Chips / Filters
Updated in `/Users/simon/dev/aicc2/src/components/ui/badge.tsx` and filter usage in `/Users/simon/dev/aicc2/src/components/BurgerMenu.tsx`.

- Selected states use `selected` variant (`border + tint + text`) instead of color-only cues.

### Tables
Updated in `/Users/simon/dev/aicc2/src/components/ui/table.tsx` and adopted in:
- `/Users/simon/dev/aicc2/src/components/FeatureUpload.tsx`
- `/Users/simon/dev/aicc2/src/components/ResultsVisualization.tsx`

Conventions:
- Airy rows with subtle separators.
- Uppercase caption-like headers.
- Right alignment for numeric columns.

### Alerts / Status
Updated in `/Users/simon/dev/aicc2/src/components/ui/alert.tsx` and applied across setup/config components.

## Navigation + Taxonomy

### Mega menu + mobile drawer
Implemented via:
- `/Users/simon/dev/aicc2/src/components/layout/EnterpriseNav.tsx`
- `/Users/simon/dev/aicc2/src/components/layout/PageHeader.tsx`

Desktop:
- Click-open multi-column menus:
  - Capabilities
  - Industries
  - Insights
- Semantic structure:
  - `nav`, grouped sections, heading associations, lists.

Mobile:
- Accessible `Sheet` drawer.
- Grouped headings + link lists.

Accessibility characteristics:
- Openable via click and keyboard (`Button` triggers).
- Escape-to-close and focus trapping handled by Radix primitives.
- Hidden menu content is not focusable when closed.

## Accessibility Notes

- Contrast strategy:
  - High-contrast text/surface pairing from semantic token mapping.
  - Accent reserved for high-importance actions.
- Focus strategy:
  - Global visible focus ring (`--focus-ring`) via `:focus-visible` box-shadow stack.
- Non-color state cues:
  - Selected steps/cards use icon + border + label changes.
  - Badge/filter selected state includes shape/border/text emphasis, not color alone.
- Link affordance:
  - Underline behavior ensures links are recognizable beyond color.

## Updated Screens and Components

### Screens
- `/Users/simon/dev/aicc2/src/pages/Index.tsx`
- `/Users/simon/dev/aicc2/src/pages/PersonaLibraryPage.tsx`
- `/Users/simon/dev/aicc2/src/pages/VehicleLibraryPage.tsx`
- `/Users/simon/dev/aicc2/src/pages/NotFound.tsx`

### New layout components
- `/Users/simon/dev/aicc2/src/components/layout/EnterpriseNav.tsx`
- `/Users/simon/dev/aicc2/src/components/layout/PageHeader.tsx`

### Workflow/UI surfaces
- `/Users/simon/dev/aicc2/src/components/PersonaSelector.tsx`
- `/Users/simon/dev/aicc2/src/components/VehicleSelector.tsx`
- `/Users/simon/dev/aicc2/src/components/FeatureUpload.tsx`
- `/Users/simon/dev/aicc2/src/components/MaxDiffAnalysis.tsx`
- `/Users/simon/dev/aicc2/src/components/ResultsVisualization.tsx`
- `/Users/simon/dev/aicc2/src/components/BurgerMenu.tsx`
- `/Users/simon/dev/aicc2/src/components/ConfigPage.tsx`
- `/Users/simon/dev/aicc2/src/components/DesignParametersPanel.tsx`
- `/Users/simon/dev/aicc2/src/components/ModelSettings.tsx`
- `/Users/simon/dev/aicc2/src/components/ApiKeyInput.tsx`
- `/Users/simon/dev/aicc2/src/components/shared/EntityLibrary.tsx`
- `/Users/simon/dev/aicc2/src/components/shared/EntityDetailsDialog.tsx`

### Primitive library updates
- `/Users/simon/dev/aicc2/src/components/ui/button.tsx`
- `/Users/simon/dev/aicc2/src/components/ui/input.tsx`
- `/Users/simon/dev/aicc2/src/components/ui/textarea.tsx`
- `/Users/simon/dev/aicc2/src/components/ui/select.tsx`
- `/Users/simon/dev/aicc2/src/components/ui/card.tsx`
- `/Users/simon/dev/aicc2/src/components/ui/table.tsx`
- `/Users/simon/dev/aicc2/src/components/ui/badge.tsx`
- `/Users/simon/dev/aicc2/src/components/ui/alert.tsx`
- `/Users/simon/dev/aicc2/src/components/ui/tabs.tsx`
- `/Users/simon/dev/aicc2/src/components/ui/sheet.tsx`
- `/Users/simon/dev/aicc2/src/components/ui/dropdown-menu.tsx`
- `/Users/simon/dev/aicc2/src/components/ui/checkbox.tsx`

### Theme and config
- `/Users/simon/dev/aicc2/src/index.css`
- `/Users/simon/dev/aicc2/tailwind.config.ts`

## Dependencies
No new package dependencies were introduced.

Font imports were added via CSS `@import` in `/Users/simon/dev/aicc2/src/index.css` for:
- Source Serif 4
- Manrope
- IBM Plex Mono

## Screenshots
No automated screenshots were generated in this environment.
