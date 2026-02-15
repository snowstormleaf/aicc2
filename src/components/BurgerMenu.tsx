import { useMemo, useState } from "react";
import { Menu, Settings, SlidersHorizontal, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { ConfigPage } from "./ConfigPage";
import { DesignParametersPanel } from "./DesignParametersPanel";
import { usePersonas } from "@/personas/store";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useVehicles } from "@/vehicles/store";
import { Checkbox } from "@/components/ui/checkbox";

interface BurgerMenuProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  featureCount?: number;
}

export const BurgerMenu = ({ open, onOpenChange, activeTab, onTabChange, featureCount = 0 }: BurgerMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tabValue, setTabValue] = useState("config");
  const { personas } = usePersonas();
  const { vehicles } = useVehicles();
  const selectedBrandsDraft = useWorkspaceStore((state) => state.selectedBrandsDraft);
  const appliedBrands = useWorkspaceStore((state) => state.appliedBrands);
  const setSelectedBrandsDraft = useWorkspaceStore((state) => state.setSelectedBrandsDraft);
  const applyBrandFilter = useWorkspaceStore((state) => state.applyBrandFilter);
  const clearBrandFilter = useWorkspaceStore((state) => state.clearBrandFilter);

  const brandOptions = useMemo(() => {
    const brands = new Set<string>();
    personas.forEach((persona) => brands.add((persona.brand ?? "Unknown").trim() || "Unknown"));
    vehicles.forEach((vehicle) => brands.add((vehicle.brand ?? vehicle.manufacturer ?? "Unknown").trim() || "Unknown"));
    return Array.from(brands).sort((a, b) => a.localeCompare(b));
  }, [personas, vehicles]);

  const toggleDraftBrand = (brand: string) => {
    if (selectedBrandsDraft.includes(brand)) {
      setSelectedBrandsDraft(selectedBrandsDraft.filter((item) => item !== brand));
      return;
    }
    setSelectedBrandsDraft([...selectedBrandsDraft, brand]);
  };

  const isMenuOpen = open ?? isOpen;
  const setMenuOpen = onOpenChange ?? setIsOpen;
  const currentTab = activeTab ?? tabValue;
  const setCurrentTab = onTabChange ?? setTabValue;

  return (
    <Sheet open={isMenuOpen} onOpenChange={setMenuOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-[520px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Workspace
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4">
          <Tabs value={currentTab} onValueChange={setCurrentTab}>
            <TabsList className="grid h-auto w-full grid-cols-3">
              <TabsTrigger value="config" className="gap-2">
                <Settings className="h-4 w-4" />
                Configuration
              </TabsTrigger>
              <TabsTrigger value="design" className="gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Analysis parameters
              </TabsTrigger>
              <TabsTrigger value="filters" className="gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </TabsTrigger>
            </TabsList>

            <TabsContent value="config" className="mt-4">
              <ConfigPage onClose={() => setMenuOpen(false)} />
            </TabsContent>

            <TabsContent value="design" className="mt-4">
              <DesignParametersPanel featureCount={featureCount} />
            </TabsContent>

            <TabsContent value="filters" className="mt-4 space-y-4">
              <div>
                <Label className="text-sm font-medium">Brand filter</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Select brands, then click Apply Filter. Workflow selectors are filtered; libraries remain unfiltered.
                </p>
                <div className="space-y-3 rounded-md border p-3">
                  <div className="max-h-56 space-y-2 overflow-auto pr-1">
                    {brandOptions.map((brand) => (
                      <label key={brand} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={selectedBrandsDraft.includes(brand)}
                          onCheckedChange={() => toggleDraftBrand(brand)}
                          aria-label={`Filter by ${brand}`}
                        />
                        <span>{brand}</span>
                      </label>
                    ))}
                    {brandOptions.length === 0 && (
                      <p className="text-xs text-muted-foreground">No brands found in persona or vehicle data.</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" onClick={applyBrandFilter} disabled={selectedBrandsDraft.length === 0}>
                      Apply filter
                    </Button>
                    <Button size="sm" variant="outline" onClick={clearBrandFilter}>
                      All brands
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Applied: {appliedBrands.length > 0 ? appliedBrands.join(", ") : "All brands"}
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
};
