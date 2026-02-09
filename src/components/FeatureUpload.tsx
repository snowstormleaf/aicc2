import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { parseXlsxRows } from "@/lib/xlsx-utils";

interface Feature {
  id: string;
  name: string;
  description: string;
  materialCost: number;
}

interface FeatureUploadProps {
  features: Feature[];
  onFeaturesUploaded: (features: Feature[]) => void;
}

export const FeatureUpload = ({ features, onFeaturesUploaded }: FeatureUploadProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [manualCost, setManualCost] = useState("");
  const { toast } = useToast();

  const downloadTemplate = () => {
    const csvContent = "Feature Name,Description,Material Cost (USD)\n" +
      "Adaptive Cruise Control,Automatically adjusts vehicle speed to maintain safe distance,450\n" +
      "Panoramic Sunroof,Large glass roof panel for enhanced natural light,890\n" +
      "Heated Seats,Front seat heating for enhanced comfort,320\n" +
      "Wireless Charging Pad,Qi-compatible wireless phone charging,180";
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'feature-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const normalizeFeatures = (items: Feature[]) => {
    const counts = new Map<string, number>();
    const seenIds = new Set<string>();

    return items.reduce<Feature[]>((acc, item) => {
      const name = item.name.trim();
      const description = item.description.trim();
      const cost = item.materialCost;

      if (!name || !description || Number.isNaN(cost)) {
        return acc;
      }

      const key = name.toLowerCase();
      const nextCount = (counts.get(key) ?? 0) + 1;
      counts.set(key, nextCount);

      const finalName = nextCount > 1 ? `${name} (${nextCount})` : name;
      let baseId = finalName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      if (!baseId) baseId = `feature-${acc.length + 1}`;
      let id = baseId;
      let suffix = 1;
      while (seenIds.has(id)) {
        id = `${baseId}-${suffix++}`;
      }
      seenIds.add(id);

      acc.push({
        id,
        name: finalName,
        description,
        materialCost: cost,
      });
      return acc;
    }, []);
  };

  const parseCSV = (text: string): Feature[] => {
    // Normalize line endings and split into non-empty lines
    const lines = text.replace(/\r\n/g, '\n').split('\n').filter(line => line.trim());

    // Robust CSV line splitter that handles quoted fields
    const splitLine = (line: string) => {
      const cols: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            cur += '"';
            i++; // skip escaped quote
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === ',' && !inQuotes) {
          cols.push(cur);
          cur = '';
        } else {
          cur += ch;
        }
      }
      cols.push(cur);
      return cols.map(c => c.trim());
    };

    const headers = splitLine(lines[0]).map(h => h.trim().toLowerCase());

    // Validate headers
    const nameIndex = headers.findIndex(h => h.includes('feature') || h.includes('name'));
    const descIndex = headers.findIndex(h => h.includes('description'));
    const costIndex = headers.findIndex(h => h.includes('cost') || h.includes('price'));

    if (nameIndex === -1 || descIndex === -1 || costIndex === -1) {
      throw new Error('CSV must contain columns: Feature Name, Description, Material Cost (USD)');
    }

    const parsed = lines.slice(1).map((line, index) => {
      const cols = splitLine(line);

      const name = cols[nameIndex]?.trim();
      const description = cols[descIndex]?.trim();
      const costStr = cols[costIndex]?.trim();

      if (!name || !description || !costStr) {
        return null;
      }

      const materialCost = parseFloat(costStr.replace(/[^0-9.-]/g, ''));
      if (isNaN(materialCost)) {
        throw new Error(`Row ${index + 2}: Invalid cost value "${costStr}"`);
      }

      return { id: name, name, description, materialCost };
    }).filter((row): row is Feature => row !== null);

    return normalizeFeatures(parsed);
  };

  const parseXlsx = async (data: ArrayBuffer): Promise<Feature[]> => {
    const rows = await parseXlsxRows(data);
    if (rows.length === 0) {
      return [];
    }

    const headers = rows[0].map((h) => h.trim().toLowerCase());
    const nameIndex = headers.findIndex((h) => h.includes("feature") || h.includes("name"));
    const descIndex = headers.findIndex((h) => h.includes("description"));
    const costIndex = headers.findIndex((h) => h.includes("cost") || h.includes("price"));

    if (nameIndex === -1 || descIndex === -1 || costIndex === -1) {
      throw new Error("XLSX must contain columns: Feature Name, Description, Material Cost (USD)");
    }

    const parsed = rows.slice(1).map((row) => {
      const name = row[nameIndex]?.trim();
      const description = row[descIndex]?.trim();
      const costRaw = row[costIndex]?.trim();
      if (!name || !description || !costRaw) {
        return null;
      }
      const materialCost = parseFloat(costRaw.replace(/[^0-9.-]/g, ""));
      if (Number.isNaN(materialCost)) {
        throw new Error(`Invalid cost value "${costRaw}"`);
      }
      return { id: name, name, description, materialCost };
    }).filter((row): row is Feature => row !== null);

    return normalizeFeatures(parsed);
  };

  const handleFileUpload = async (file: File) => {
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.csv') && !lower.endsWith('.xlsx') && !lower.endsWith('.xls')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV or XLSX file",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      const parsedFeatures = lower.endsWith('.csv')
        ? parseCSV(await file.text())
        : await parseXlsx(await file.arrayBuffer());
      
      if (parsedFeatures.length === 0) {
        throw new Error('No features found in the file');
      }
      
      onFeaturesUploaded(parsedFeatures);
      toast({
        title: "Features uploaded successfully",
        description: `${parsedFeatures.length} features processed`,
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to process file",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleManualAdd = () => {
    const name = manualName.trim();
    const description = manualDescription.trim();
    const cost = parseFloat(manualCost.trim());

    if (!name || !description || Number.isNaN(cost)) {
      toast({
        title: "Incomplete feature",
        description: "Provide a name, description, and valid material cost before adding.",
        variant: "destructive",
      });
      return;
    }

    const nextFeatures = normalizeFeatures([
      ...features,
      { id: name, name, description, materialCost: cost },
    ]);
    onFeaturesUploaded(nextFeatures);
    setManualName("");
    setManualDescription("");
    setManualCost("");
  };

  const handleFeatureChange = (index: number, key: keyof Feature, value: string) => {
    const next = features.map((feature, idx) => {
      if (idx !== index) return feature;
      if (key === "materialCost") {
        return { ...feature, materialCost: parseFloat(value) || 0 };
      }
      return { ...feature, [key]: value };
    });
    onFeaturesUploaded(normalizeFeatures(next));
  };

  const handleRemoveFeature = (index: number) => {
    const next = features.filter((_, idx) => idx !== index);
    onFeaturesUploaded(next);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">Upload Feature Data</h2>
        <p className="text-muted-foreground">Upload a CSV file with feature names, descriptions, and material costs</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Download Template
            </CardTitle>
            <CardDescription>
              Get a CSV template with the correct format and sample data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={downloadTemplate} variant="outline" className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Download CSV Template
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Upload Features
            </CardTitle>
            <CardDescription>
              Upload your feature data CSV or XLSX file
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                isDragOver 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
            >
              <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop your CSV/XLSX file here, or click to browse
              </p>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
                disabled={isProcessing}
              />
              <Button 
                asChild 
                variant="outline" 
                disabled={isProcessing}
                className="mt-2"
              >
                <label htmlFor="file-upload" className="cursor-pointer">
                  {isProcessing ? 'Processing...' : 'Choose File'}
                </label>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Manual Entry
          </CardTitle>
          <CardDescription>Add feature rows directly, then run analysis when ready.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="md:col-span-1">
              <label className="text-xs text-muted-foreground">Feature name</label>
              <input
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="Adaptive Cruise Control"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Description</label>
              <input
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={manualDescription}
                onChange={(e) => setManualDescription(e.target.value)}
                placeholder="Automatically adjusts vehicle speed to maintain safe distance"
              />
            </div>
            <div className="md:col-span-1">
              <label className="text-xs text-muted-foreground">Material cost (USD)</label>
              <input
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={manualCost}
                onChange={(e) => setManualCost(e.target.value)}
                placeholder="450"
                type="number"
                min="0"
              />
            </div>
          </div>
          <Button onClick={handleManualAdd} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add feature
          </Button>
        </CardContent>
      </Card>

      {features.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Parsed Features</CardTitle>
            <CardDescription>
              {features.length} features loaded. Review or adjust before running analysis.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-3 py-2 text-left">Feature</th>
                    <th className="border border-gray-300 px-3 py-2 text-left">Description</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">Material cost</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {features.map((feature, index) => (
                    <tr key={feature.id}>
                      <td className="border border-gray-300 px-3 py-2">
                        <input
                          className="w-full bg-transparent text-sm"
                          value={feature.name}
                          onChange={(e) => handleFeatureChange(index, "name", e.target.value)}
                        />
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        <input
                          className="w-full bg-transparent text-sm"
                          value={feature.description}
                          onChange={(e) => handleFeatureChange(index, "description", e.target.value)}
                        />
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-right">
                        <input
                          className="w-full bg-transparent text-right text-sm"
                          value={feature.materialCost}
                          type="number"
                          min="0"
                          onChange={(e) => handleFeatureChange(index, "materialCost", e.target.value)}
                        />
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveFeature(index)}
                          aria-label="Remove feature"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>CSV/XLSX Format Requirements</AlertTitle>
        <AlertDescription>
          Your file must include these columns: <strong>Feature Name</strong>, <strong>Description</strong>, and <strong>Material Cost (USD)</strong>. 
          The first row should contain column headers.
        </AlertDescription>
      </Alert>
    </div>
  );
};
