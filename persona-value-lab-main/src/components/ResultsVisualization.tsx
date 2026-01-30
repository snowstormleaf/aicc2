import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell } from 'recharts';
import { TrendingUp, Download, DollarSign, Target } from "lucide-react";

import { PerceivedValue } from "@/lib/maxdiff-engine";

interface ResultsVisualizationProps {
  results: Map<string, PerceivedValue[]>;
}

interface ChartDatum {
  feature: string;
  materialCost: number;
  perceivedValue: number;
  netScore: number;
  persona: string;
  featureName: string;
  featureId: string;
}

interface TooltipPayloadItem {
  payload: ChartDatum;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

const personas = {
  'fleet-manager': 'Fleet Manager',
  'small-business-owner': 'Small Business Owner', 
  'individual-buyer': 'Individual Buyer'
};

const vehicles = {
  'ford-transit-custom': 'Ford Transit Custom',
  'ford-ranger': 'Ford Ranger',
  'ford-kuga': 'Ford Kuga',
  'ford-tourneo': 'Ford Tourneo'
};

export const ResultsVisualization = ({ results }: ResultsVisualizationProps) => {
  if (results.size === 0) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">
          No results to display. Please run the analysis first.
        </p>
      </Card>
    );
  }

  const personas = Array.from(results.keys());
  const allData: ChartDatum[] = [];
  
  // Prepare data for scatter plot
  for (const [persona, perceivedValues] of results.entries()) {
    for (const result of perceivedValues) {
      allData.push({
        feature: result.featureId,
        materialCost: result.materialCost,
        perceivedValue: result.perceivedValue,
        netScore: result.netScore,
        persona: persona,
        featureName: result.featureName,
        featureId: result.featureId,
      });
    }
  }

  const maxValue = Math.max(...allData.map(d => Math.max(d.materialCost, d.perceivedValue))) * 1.1;

  // Calculate 60-degree reference line
  const minCost = Math.min(...allData.map(d => d.materialCost));
  const maxCost = Math.max(...allData.map(d => d.materialCost));
  const slope = Math.tan(Math.PI / 3); // 60 degrees
  const referenceLine = [
    { x: minCost, y: minCost * slope },
    { x: maxCost, y: maxCost * slope }
  ];

  // Prepare difference data for comparison (if exactly 2 personas)
  const differenceData = personas.length === 2 ? (() => {
    const persona1Results = results.get(personas[0])!;
    const persona2Results = results.get(personas[1])!;
    
    return persona1Results.map(p1 => {
      const p2 = persona2Results.find(p => p.featureId === p1.featureId);
      return {
        feature: p1.featureId,
        difference: p1.perceivedValue - (p2?.perceivedValue || 0),
      };
    }).sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
  })() : [];

  // Get first persona data for basic categorization
  const firstPersonaResults = results.get(personas[0]) || [];
  const winners = firstPersonaResults.filter(r => r.perceivedValue > r.materialCost * 1.2);
  const losers = firstPersonaResults.filter(r => r.perceivedValue < r.materialCost * 0.8);
  const neutral = firstPersonaResults.filter(r => r.perceivedValue >= r.materialCost * 0.8 && r.perceivedValue <= r.materialCost * 1.2);

  const downloadResults = () => {
    let csvContent = "Persona,Feature Name,Description,Material Cost (USD),Perceived Value (USD),Value Ratio,Category\n";
    
    for (const [persona, perceivedValues] of results.entries()) {
      csvContent += perceivedValues.map(r => {
        const ratio = r.perceivedValue / r.materialCost;
        const category = ratio > 1.2 ? 'High Value' : ratio < 0.8 ? 'Low Value' : 'Fair Value';
        return `"${persona}","${r.featureName}","Feature ${r.featureId}",${r.materialCost},${r.perceivedValue.toFixed(2)},${ratio.toFixed(2)},${category}`;
      }).join('\n') + '\n';
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'maxdiff-analysis-results.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const ratio = data.perceivedValue / data.materialCost;
      return (
        <div className="bg-card border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-sm">{data.featureName}</p>
          <p className="text-xs text-muted-foreground mb-2">Feature ID: {data.featureId}</p>
          <div className="space-y-1 text-xs">
            <p>Material Cost: <span className="font-medium">${data.materialCost}</span></p>
            <p>Perceived Value: <span className="font-medium">${data.perceivedValue.toFixed(0)}</span></p>
            <p>Value Ratio: <span className={`font-medium ${ratio > 1.2 ? 'text-data-positive' : ratio < 0.8 ? 'text-data-negative' : 'text-muted-foreground'}`}>
              {ratio.toFixed(2)}x
            </span></p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">Perceived Feature Values</h2>
        <p className="text-muted-foreground">
          Material cost vs. perceived customer value from MaxDiff analysis
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-data-positive">
              <TrendingUp className="h-5 w-5" />
              High Value Features
            </CardTitle>
            <CardDescription>Perceived value exceeds cost by 20%+</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-data-positive mb-1">{winners.length}</div>
            <p className="text-sm text-muted-foreground">
              {winners.length > 0 ? `Avg ratio: ${(winners.reduce((sum, w) => sum + w.perceivedValue / w.materialCost, 0) / winners.length).toFixed(1)}x` : 'No high-value features'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5" />
              Fair Value Features
            </CardTitle>
            <CardDescription>Perceived value matches cost ±20%</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-1">{neutral.length}</div>
            <p className="text-sm text-muted-foreground">
              {neutral.length > 0 ? `Avg ratio: ${(neutral.reduce((sum, n) => sum + n.perceivedValue / n.materialCost, 0) / neutral.length).toFixed(1)}x` : 'No fair-value features'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-data-negative">
              <DollarSign className="h-5 w-5" />
              Low Value Features
            </CardTitle>
            <CardDescription>Perceived value below cost by 20%+</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-data-negative mb-1">{losers.length}</div>
            <p className="text-sm text-muted-foreground">
              {losers.length > 0 ? `Avg ratio: ${(losers.reduce((sum, l) => sum + l.perceivedValue / l.materialCost, 0) / losers.length).toFixed(1)}x` : 'No low-value features'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Feature Value vs Cost Analysis
              </CardTitle>
              <CardDescription>
                Scatter plot showing perceived value (Y-axis) vs material cost (X-axis)
              </CardDescription>
            </div>
            <Button onClick={downloadResults} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Results
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart data={allData} margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  type="number" 
                  dataKey="materialCost" 
                  name="Material Cost"
                  domain={[0, maxValue]}
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Feature material cost (USD)', position: 'insideBottom', offset: -10 }}
                />
                <YAxis 
                  type="number" 
                  dataKey="perceivedValue" 
                  name="Perceived Value"
                  domain={[0, maxValue]}
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Perceived customer feature value (USD)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<CustomTooltip />} />
                
                {/* 60-degree reference line */}
                <ReferenceLine 
                  segment={referenceLine.map(point => ({ x: point.x, y: point.y }))} 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeDasharray="4 4"
                />
                
                {personas.map((persona, index) => (
                  <Scatter 
                    key={persona}
                    data={allData.filter(d => d.persona === persona)}
                    dataKey="perceivedValue" 
                    fill={index === 0 ? "#8884d8" : "#82ca9d"}
                    fillOpacity={0.7}
                    stroke={index === 0 ? "#8884d8" : "#82ca9d"}
                    strokeWidth={2}
                    name={persona}
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-4 flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-muted-foreground"></div>
              <span>60° reference line</span>
            </div>
            {personas.map((persona, index) => (
              <div key={persona} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: index === 0 ? "#8884d8" : "#82ca9d" }}></div>
                <span>{persona}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {personas.length === 2 && differenceData.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Difference in Perceived Value: {personas[0]} vs {personas[1]}
                </CardTitle>
                <CardDescription>
                  Features where personas differ most in perceived value
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={differenceData.slice(0, 10)} margin={{ top: 20, right: 20, bottom: 20, left: 120 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    type="number" 
                    label={{ value: `${personas[0]} minus ${personas[1]} ($)`, position: 'insideBottom', offset: -10 }}
                  />
                  <YAxis dataKey="feature" type="category" width={120} />
                  <Tooltip 
                    formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Difference']}
                  />
                  <Bar dataKey="difference">
                    {differenceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.difference > 0 ? "#8884d8" : "#ff7c7c"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Results */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detailed Results</CardTitle>
          <CardDescription>Feature analysis by persona</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {personas.map(persona => {
              const personaResults = results.get(persona)!;
              return (
                <div key={persona} className="space-y-2">
                  <h4 className="font-semibold text-lg">{persona}</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-4 py-2 text-left">Feature</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">Material Cost</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">Perceived Value</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">Net Score</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">Value Ratio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {personaResults
                          .sort((a, b) => b.perceivedValue - a.perceivedValue)
                          .map((result) => (
                            <tr key={result.featureId}>
                              <td className="border border-gray-300 px-4 py-2">{result.featureName}</td>
                              <td className="border border-gray-300 px-4 py-2 text-right">
                                ${result.materialCost.toFixed(2)}
                              </td>
                              <td className="border border-gray-300 px-4 py-2 text-right">
                                ${result.perceivedValue.toFixed(2)}
                              </td>
                              <td className="border border-gray-300 px-4 py-2 text-right">
                                {result.netScore}
                              </td>
                              <td className="border border-gray-300 px-4 py-2 text-right">
                                {(result.perceivedValue / result.materialCost).toFixed(2)}x
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
