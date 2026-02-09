import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { calculateOptimalSets } from "@/lib/design-parameters";

interface DesignParametersPanelProps {
  featureCount: number;
}

export const DesignParametersPanel = ({ featureCount }: DesignParametersPanelProps) => {
  const designParams = calculateOptimalSets(featureCount);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">BIBD Design Parameters</CardTitle>
        <CardDescription>Balanced Incomplete Block Design details for this session</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {featureCount === 0 ? (
          <p className="text-muted-foreground">
            Upload features in the analysis workflow to see BIBD parameters.
          </p>
        ) : (
          <>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Features (t):</span>
          <span className="font-medium">{featureCount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Items per set (k):</span>
          <span className="font-medium">{designParams.itemsPerSet}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Sets required (b):</span>
          <span className="font-medium">{designParams.sets}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Feature frequency (r):</span>
          <span className="font-medium">{designParams.r}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Pair balance (λ):</span>
          <span className="font-medium">{designParams.lambda.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Design efficiency:</span>
          <Badge variant={designParams.efficiency > 0.8 ? "default" : "outline"} className="text-xs">
            {Math.round(designParams.efficiency * 100)}%
          </Badge>
        </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
