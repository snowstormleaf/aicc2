import { ArrowLeft, Car } from "lucide-react";
import { Link } from "react-router-dom";

import { PageHeader } from "@/components/layout/PageHeader";
import { VehicleLibrary } from "@/components/vehicles/VehicleLibrary";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const VehicleLibraryPage = () => {
  return (
    <div className="page-shell">
      <PageHeader
        title="Vehicle Library"
        description="Maintain the vehicle catalog that powers feature valuation and scenario-specific simulations."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              Return to Workflow
            </Link>
          </Button>
        }
      />

      <main className="container mx-auto space-y-6 pb-16 pt-8">
        <Card id="vehicle-library-hub">
          <div
            className="h-32 border-b border-border-subtle bg-cover bg-center"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(247, 251, 248, 0.62), rgba(247, 251, 248, 0.5)), url('/vehicle-management-banner.svg')",
            }}
            aria-hidden="true"
          />
          <CardHeader>
            <p className="type-caption">Hub</p>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5 text-primary" />
              Vehicle Management
            </CardTitle>
            <CardDescription className="content-measure">
              Keep vehicle metadata clean and comparable to ensure reliable tradeoff outcomes during analysis.
            </CardDescription>
          </CardHeader>
        </Card>

        <section aria-label="Vehicle records">
          <VehicleLibrary />
        </section>
      </main>
    </div>
  );
};

export default VehicleLibraryPage;
