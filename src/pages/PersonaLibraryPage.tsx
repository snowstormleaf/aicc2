import { ArrowLeft, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PersonaLibrary } from '@/components/PersonaLibrary';
import { Link } from 'react-router-dom';

const PersonaLibraryPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-foreground">Persona Library</h1>
              <p className="text-sm text-muted-foreground">Browse, create, edit, and maintain personas</p>
            </div>
            <Button asChild variant="outline" className="shrink-0">
              <Link to="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return to Analysis Workflow
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Persona Management
            </CardTitle>
            <CardDescription>
              Changes made here are available in the analysis workflow immediately.
            </CardDescription>
          </CardHeader>
        </Card>

        <PersonaLibrary />
      </div>
    </div>
  );
};

export default PersonaLibraryPage;
