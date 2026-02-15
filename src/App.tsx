import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import PersonaLibraryPage from "./pages/PersonaLibraryPage";
import VehicleLibraryPage from "./pages/VehicleLibraryPage";
import { PersonasProvider } from "@/personas/store";
import { VehiclesProvider } from "@/vehicles/store";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <PersonasProvider>
      <VehiclesProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/persona-library" element={<PersonaLibraryPage />} />
              <Route path="/vehicle-library" element={<VehicleLibraryPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </VehiclesProvider>
    </PersonasProvider>
  </QueryClientProvider>
);

export default App;
