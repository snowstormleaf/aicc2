import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type NavLinkItem = {
  title: string;
  description: string;
  to: string;
};

type NavGroup = {
  heading: string;
  links: NavLinkItem[];
};

type NavSection = {
  id: string;
  label: string;
  groups: NavGroup[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    id: "capabilities",
    label: "Capabilities",
    groups: [
      {
        heading: "Core Workflow",
        links: [
          {
            title: "Analysis Workflow",
            description: "Run end-to-end MaxDiff experiments.",
            to: "/#workflow",
          },
          {
            title: "Persona Selection",
            description: "Choose target buyers for simulation.",
            to: "/#persona-hub",
          },
          {
            title: "Feature Valuation",
            description: "Upload features and compare perceived value.",
            to: "/#analysis-hub",
          },
        ],
      },
      {
        heading: "Workspace",
        links: [
          {
            title: "Configuration",
            description: "Verify backend and model readiness.",
            to: "/#workspace-hub",
          },
          {
            title: "Design Parameters",
            description: "Tune retries, temperature, and caching.",
            to: "/#design-hub",
          },
          {
            title: "Brand Filters",
            description: "Focus runs by portfolio or brand family.",
            to: "/#filters-hub",
          },
        ],
      },
      {
        heading: "Execution",
        links: [
          {
            title: "Run Analysis",
            description: "Launch AI ranking calls with progress telemetry.",
            to: "/#run-hub",
          },
          {
            title: "API Console",
            description: "Inspect request and response traces.",
            to: "/#insights-console",
          },
          {
            title: "Export Center",
            description: "Download CSV and Excel outputs.",
            to: "/#insights-export",
          },
        ],
      },
    ],
  },
  {
    id: "industries",
    label: "Industries",
    groups: [
      {
        heading: "Commercial Mobility",
        links: [
          {
            title: "Fleet Buyers",
            description: "Operational personas for uptime and TCO.",
            to: "/persona-library",
          },
          {
            title: "Delivery Platforms",
            description: "Vehicle sets for last-mile programs.",
            to: "/vehicle-library",
          },
        ],
      },
      {
        heading: "Performance & Luxury",
        links: [
          {
            title: "Premium Segments",
            description: "Explore high-value preference patterns.",
            to: "/#industry-hub",
          },
          {
            title: "High-Involvement Purchase",
            description: "Model decision criteria and objections.",
            to: "/#industry-hub",
          },
        ],
      },
      {
        heading: "Consumer Urban",
        links: [
          {
            title: "Daily Commuters",
            description: "Understand practical utility tradeoffs.",
            to: "/#industry-hub",
          },
          {
            title: "Family Mobility",
            description: "Balance safety, comfort, and value cues.",
            to: "/#industry-hub",
          },
        ],
      },
    ],
  },
  {
    id: "insights",
    label: "Insights",
    groups: [
      {
        heading: "Hubs",
        links: [
          {
            title: "Insights Hub",
            description: "Jump directly to analysis outputs.",
            to: "/#insights",
          },
          {
            title: "Persona Hub",
            description: "Manage and enrich buyer profiles.",
            to: "/persona-library",
          },
          {
            title: "Vehicle Hub",
            description: "Maintain models used in experiments.",
            to: "/vehicle-library",
          },
        ],
      },
      {
        heading: "Comparisons",
        links: [
          {
            title: "Value Difference Charts",
            description: "Highlight persona gaps by feature.",
            to: "/#insights-compare",
          },
          {
            title: "Detailed Tables",
            description: "Inspect ranked values and ratios.",
            to: "/#insights-detail",
          },
        ],
      },
      {
        heading: "Actions",
        links: [
          {
            title: "Learn More",
            description: "Review methodology and operating notes.",
            to: "/#learn-more",
          },
          {
            title: "Explore Workflow",
            description: "Start a new experiment from step one.",
            to: "/#workflow",
          },
        ],
      },
    ],
  },
];

const splitPathAndHash = (value: string) => {
  const [path, hash] = value.split("#");
  return {
    path: path || "/",
    hash: hash ? `#${hash}` : "",
  };
};

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const menuItemClassName =
  "flex h-auto flex-col items-start gap-1 rounded-md px-3 py-2.5 text-left no-underline outline-none transition-colors duration-200 hover:bg-accent/80 focus:bg-accent/80";

function MegaMenuSection({ section }: { section: NavSection }) {
  const location = useLocation();
  const isActive = section.groups.some((group) =>
    group.links.some((link) => {
      const { path } = splitPathAndHash(link.to);
      return path === location.pathname;
    })
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="tertiary"
          size="sm"
          aria-label={`${section.label} menu`}
          className={isActive ? "border border-primary/25 bg-primary/10 text-primary" : "text-foreground"}
        >
          {section.label}
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={10}
        className="w-[min(92vw,860px)] rounded-xl border border-border-subtle bg-surface p-5 shadow-soft"
      >
        <div className="grid gap-4 md:grid-cols-3">
          {section.groups.map((group) => {
            const groupId = `${section.id}-${slugify(group.heading)}`;
            return (
              <section key={group.heading} aria-labelledby={groupId} className="space-y-2">
                <h3 id={groupId} className="type-caption">
                  {group.heading}
                </h3>
                <ul className="space-y-1" aria-label={group.heading}>
                  {group.links.map((link) => (
                    <li key={link.title}>
                      <DropdownMenuItem asChild className={menuItemClassName}>
                        <Link to={link.to}>
                          <span className="text-sm font-semibold text-foreground">{link.title}</span>
                          <span className="text-xs leading-relaxed text-muted-foreground">{link.description}</span>
                        </Link>
                      </DropdownMenuItem>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function EnterpriseMegaMenu() {
  return (
    <nav aria-label="Primary" className="hidden items-center justify-center gap-2 lg:flex">
      {NAV_SECTIONS.map((section) => (
        <MegaMenuSection key={section.id} section={section} />
      ))}
    </nav>
  );
}

export function EnterpriseMobileMenu() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="tertiary"
          size="icon"
          className="lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="w-full overflow-y-auto sm:max-w-[420px]">
        <SheetHeader className="space-y-2 border-b border-border-subtle pb-4">
          <SheetTitle className="text-left text-xl font-semibold">Navigation</SheetTitle>
          <SheetDescription className="text-left">
            Explore capabilities, industry hubs, and insights.
          </SheetDescription>
        </SheetHeader>

        <nav className="space-y-5 py-5" aria-label="Mobile primary navigation">
          {NAV_SECTIONS.map((section) => (
            <section key={section.id} className="space-y-3" aria-labelledby={`mobile-${section.id}`}>
              <h2 id={`mobile-${section.id}`} className="type-caption">
                {section.label}
              </h2>
              <div className="space-y-3">
                {section.groups.map((group) => (
                  <div key={group.heading} className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.heading}</h3>
                    <ul className="space-y-1">
                      {group.links.map((link) => {
                        const { path, hash } = splitPathAndHash(link.to);
                        const isCurrentPath = path === location.pathname;
                        const isCurrentHash = isCurrentPath && hash && hash === location.hash;
                        const isCurrent = Boolean(isCurrentPath && (!hash || isCurrentHash));

                        return (
                          <li key={`${group.heading}-${link.title}`}>
                            <Link
                              to={link.to}
                              className={`block rounded-md border px-3 py-2 no-underline transition-colors duration-200 ${
                                isCurrent
                                  ? "border-primary/30 bg-primary/10 text-primary"
                                  : "border-border-subtle bg-surface text-foreground hover:bg-muted/55"
                              }`}
                              onClick={() => setOpen(false)}
                            >
                              <span className="block text-sm font-semibold">{link.title}</span>
                              <span className="mt-1 block text-xs text-muted-foreground">{link.description}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
