import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Briefcase, ShoppingCart } from "lucide-react";

const personas = [
  {
    id: 'fleet-manager',
    name: 'Fleet Manager',
    description: 'Corporate fleet decision-maker focused on total cost of ownership and operational efficiency',
    icon: Briefcase,
    characteristics: ['Cost-conscious', 'Data-driven', 'Long-term thinking', 'Risk-averse'],
    demographics: 'Age 35-55, Corporate environment, Budget responsibility'
  },
  {
    id: 'small-business-owner',
    name: 'Small Business Owner',
    description: 'Entrepreneur seeking reliable, versatile vehicles that support business growth',
    icon: Users,
    characteristics: ['Value-focused', 'Practical', 'Growth-oriented', 'Multi-functional needs'],
    demographics: 'Age 30-50, Self-employed, Growth mindset'
  },
  {
    id: 'individual-buyer',
    name: 'Individual Buyer',
    description: 'Personal vehicle purchaser prioritizing comfort, style, and personal utility',
    icon: ShoppingCart,
    characteristics: ['Emotion-driven', 'Style-conscious', 'Comfort-focused', 'Technology-aware'],
    demographics: 'Age 25-45, Personal use, Lifestyle-oriented'
  }
];

interface PersonaSelectorProps {
  selectedPersonas: string[];
  onPersonaSelect: (personaIds: string[]) => void;
}

export const PersonaSelector = ({ selectedPersonas, onPersonaSelect }: PersonaSelectorProps) => {
  const handlePersonaToggle = (personaId: string) => {
    if (selectedPersonas.includes(personaId)) {
      onPersonaSelect(selectedPersonas.filter(p => p !== personaId));
    } else {
      onPersonaSelect([...selectedPersonas, personaId]);
    }
  };
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">Select Target Personas</h2>
        <p className="text-muted-foreground">Choose one or more customer personas. Multiple personas enable comparison analysis.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {personas.map((persona) => {
          const Icon = persona.icon;
          const isSelected = selectedPersonas.includes(persona.id);
          
          return (
            <Card 
              key={persona.id} 
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                isSelected 
                  ? 'ring-2 ring-primary shadow-lg bg-primary/5' 
                  : 'hover:shadow-md'
              }`}
              onClick={() => handlePersonaToggle(persona.id)}
            >
              <CardHeader className="text-center">
                <div className={`mx-auto p-3 rounded-full w-fit ${
                  isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}>
                  <Icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl">{persona.name}</CardTitle>
                <CardDescription className="text-sm">
                  {persona.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-2">Key Characteristics</h4>
                  <div className="flex flex-wrap gap-1">
                    {persona.characteristics.map((trait) => (
                      <Badge key={trait} variant="secondary" className="text-xs">
                        {trait}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-sm mb-1">Demographics</h4>
                  <p className="text-xs text-muted-foreground">{persona.demographics}</p>
                </div>
                
                <Button 
                  variant={isSelected ? "analytics" : "outline"} 
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePersonaToggle(persona.id);
                  }}
                >
                  {isSelected ? 'Selected' : 'Select Persona'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {selectedPersonas.length > 0 && (
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <p className="text-sm font-medium">Selected Personas: {selectedPersonas.map(id => personas.find(p => p.id === id)?.name).join(', ')}</p>
        </div>
      )}
    </div>
  );
};