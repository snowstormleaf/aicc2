import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Truck, Car, Users } from "lucide-react";

const vehicles = [
  {
    id: 'ford-transit-custom',
    name: 'Ford Transit Custom',
    category: 'Commercial Van',
    icon: Truck,
    description: 'Mid-size commercial van perfect for businesses and fleet operations',
    segments: ['Commercial', 'Fleet', 'Business'],
    specifications: {
      type: 'Commercial Van',
      capacity: '6-9 seats',
      payload: 'Up to 1,400kg',
      engine: '2.0L EcoBlue Diesel'
    }
  },
  {
    id: 'ford-ranger',
    name: 'Ford Ranger',
    category: 'Pickup Truck',
    icon: Truck,
    description: 'Versatile pickup truck for work and lifestyle applications',
    segments: ['Commercial', 'Lifestyle', 'Adventure'],
    specifications: {
      type: 'Pickup Truck',
      capacity: '5 seats',
      payload: 'Up to 1,252kg',
      engine: '2.0L EcoBlue Twin Turbo'
    }
  },
  {
    id: 'ford-kuga',
    name: 'Ford Kuga',
    category: 'SUV',
    icon: Car,
    description: 'Family-oriented SUV with advanced technology and comfort features',
    segments: ['Family', 'Lifestyle', 'Urban'],
    specifications: {
      type: 'Mid-size SUV',
      capacity: '5-7 seats',
      payload: 'Up to 660kg',
      engine: '1.5L EcoBoost / Hybrid'
    }
  },
  {
    id: 'ford-tourneo',
    name: 'Ford Tourneo',
    category: 'People Carrier',
    icon: Users,
    description: 'Premium people carrier for families and group transportation',
    segments: ['Family', 'Luxury', 'Group Travel'],
    specifications: {
      type: 'People Carrier',
      capacity: '8-9 seats',
      payload: 'Up to 750kg',
      engine: '2.0L EcoBlue Diesel'
    }
  }
];

interface VehicleSelectorProps {
  selectedVehicle: string | null;
  onSelectVehicle: (vehicleId: string) => void;
}

export const VehicleSelector = ({ selectedVehicle, onSelectVehicle }: VehicleSelectorProps) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">Select Target Vehicle</h2>
        <p className="text-muted-foreground">Choose the vehicle model for feature analysis</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {vehicles.map((vehicle) => {
          const Icon = vehicle.icon;
          const isSelected = selectedVehicle === vehicle.id;
          
          return (
            <Card 
              key={vehicle.id} 
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                isSelected 
                  ? 'ring-2 ring-primary shadow-lg bg-primary/5' 
                  : 'hover:shadow-md'
              }`}
              onClick={() => onSelectVehicle(vehicle.id)}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{vehicle.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{vehicle.category}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {vehicle.category}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{vehicle.description}</p>
                
                <div>
                  <h4 className="font-medium text-sm mb-2">Market Segments</h4>
                  <div className="flex flex-wrap gap-1">
                    {vehicle.segments.map((segment) => (
                      <Badge key={segment} variant="secondary" className="text-xs">
                        {segment}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="font-medium">Type:</span>
                    <p className="text-muted-foreground">{vehicle.specifications.type}</p>
                  </div>
                  <div>
                    <span className="font-medium">Capacity:</span>
                    <p className="text-muted-foreground">{vehicle.specifications.capacity}</p>
                  </div>
                  <div>
                    <span className="font-medium">Payload:</span>
                    <p className="text-muted-foreground">{vehicle.specifications.payload}</p>
                  </div>
                  <div>
                    <span className="font-medium">Engine:</span>
                    <p className="text-muted-foreground">{vehicle.specifications.engine}</p>
                  </div>
                </div>
                
                <Button 
                  variant={isSelected ? "analytics" : "outline"} 
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectVehicle(vehicle.id);
                  }}
                >
                  {isSelected ? 'Selected' : 'Select Vehicle'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};