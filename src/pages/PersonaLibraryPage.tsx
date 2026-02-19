import { ArrowLeft, Users } from "lucide-react";
import { Link } from "react-router-dom";

import { PageHeader } from "@/components/layout/PageHeader";
import { PersonaLibrary } from "@/components/PersonaLibrary";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import bgPersonaLibrary from "@/data/bg_persona-library.jpg";

const PersonaLibraryPage = () => {
  return (
    <div className="page-shell">
      <PageHeader
        title="Persona Library"
        description="Browse, create, and evolve persona definitions used across every MaxDiff analysis run."
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
        <Card id="persona-library-hub">
          <div
            className="h-32 border-b border-border-subtle bg-cover bg-center"
            style={{
              backgroundImage:
                `linear-gradient(to right, rgba(248, 252, 249, 0.6), rgba(248, 252, 249, 0.45)), url('${bgPersonaLibrary}')`,
            }}
            aria-hidden="true"
          />
          <CardHeader>
            <p className="type-caption">Hub</p>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Persona Management
            </CardTitle>
            <CardDescription className="content-measure">
              Updates made here are immediately available in workflow selection modules and analysis execution.
            </CardDescription>
          </CardHeader>
        </Card>

        <section aria-label="Persona records">
          <PersonaLibrary />
        </section>
      </main>
    </div>
  );
};

export default PersonaLibraryPage;
