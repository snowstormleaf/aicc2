import { useState } from "react";
import { Menu, Settings, Users, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfigPage } from "./ConfigPage";
import { PersonaLibrary } from "./PersonaLibrary";
import { VehicleLibrary } from "@/components/vehicles/VehicleLibrary";

export const BurgerMenu = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
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
          <Tabs defaultValue="config">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="config" className="gap-2">
                <Settings className="h-4 w-4" />
                Configuration
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