import { useMemo, useState } from "react";
import { Menu, Settings, Users, Car, SlidersHorizontal, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ConfigPage } from "./ConfigPage";
import { PersonaLibrary } from "./PersonaLibrary";
import { VehicleLibrary } from "@/components/vehicles/VehicleLibrary";
import { DesignParametersPanel } from "./DesignParametersPanel";
import { usePersonas } from "@/personas/store";
import { useWorkspaceStore } from "@/store/workspaceStore";

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
  const selectedBrand = useWorkspaceStore((state) => state.selectedBrand);
  const setSelectedBrand = useWorkspaceStore((state) => state.setSelectedBrand);

  const brandOptions = useMemo(() => {
    const brands = new Set<string>();
    personas.forEach((persona) => {
      if (persona.brand) {
        brands.add(persona.brand);
      }
    });
    return Array.from(brands).sort((a, b) => a.localeCompare(b));
  }, [personas]);

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

      <SheetContent side="right" className="w-[520px] sm:max-w-none">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Workspace
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4">
          <Tabs value={currentTab} onValueChange={setCurrentTab}>
            <TabsList className="w-full justify-start">
              <TabsTrigger value="config" className="gap-2">
                <Settings className="h-4 w-4" />
                Configuration
              </TabsTrigger>
              <TabsTrigger value="design" className="gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Design Parameters
              </TabsTrigger>
              <TabsTrigger value="filters" className="gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </TabsTrigger>
              <TabsTrigger value="personas" className="gap-2">
                <Users className="h-4 w-4" />
                Personas
              </TabsTrigger>
              <TabsTrigger value="vehicles" className="gap-2">
                <Car className="h-4 w-4" />
                Vehicles
              </TabsTrigger>
            </TabsList>

            <TabsContent value="config" className="mt-4">
              <ConfigPage onClose={() => setIsOpen(false)} />
            </TabsContent>

            <TabsContent value="design" className="mt-4">
              <DesignParametersPanel featureCount={featureCount} />
            </TabsContent>

            <TabsContent value="filters" className="mt-4 space-y-4">
              <div>
                <Label className="text-sm font-medium">Brand filter</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Filters the persona list in the analysis workflow only. Persona Library remains unfiltered.
                </p>
                <Select
                  value={selectedBrand || "all"}
                  onValueChange={(value) => setSelectedBrand(value === "all" ? "" : value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All brands" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All brands</SelectItem>
                    {brandOptions.map((brand) => (
                      <SelectItem key={brand} value={brand}>
                        {brand}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="personas" className="mt-4">
              <PersonaLibrary />
            </TabsContent>

            <TabsContent value="vehicles" className="mt-4">
              <VehicleLibrary />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
};
