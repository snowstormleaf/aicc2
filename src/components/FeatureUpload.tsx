import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

    return lines.slice(1).map((line, index) => {
      const cols = splitLine(line);

      const name = cols[nameIndex]?.trim();
      const description = cols[descIndex]?.trim();
      const costStr = cols[costIndex]?.trim();

      if (!name || !description || !costStr) {
        throw new Error(`Row ${index + 2}: Missing required data`);
      }

      const materialCost = parseFloat(costStr.replace(/[^0-9.-]/g, ''));
      if (isNaN(materialCost)) {
        throw new Error(`Row ${index + 2}: Invalid cost value "${costStr}"`);
      }

      return {
        id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name,
        description,
        materialCost,
      };
    });
  };

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      const text = await file.text();
      const parsedFeatures = parseCSV(text);
      
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
  }, [onFeaturesUploaded, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
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
              Upload your feature data CSV file
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
                Drag and drop your CSV file here, or click to browse
              </p>
              <input
                type="file"
                accept=".csv"
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

      {features.length > 0 && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Features Loaded Successfully</AlertTitle>
          <AlertDescription>
            {features.length} features ready for MaxDiff analysis. 
            Features range from ${Math.min(...features.map(f => f.materialCost))} to ${Math.max(...features.map(f => f.materialCost))} in material cost.
          </AlertDescription>
        </Alert>
      )}
      
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>CSV Format Requirements</AlertTitle>
        <AlertDescription>
          Your CSV file must include these columns: <strong>Feature Name</strong>, <strong>Description</strong>, and <strong>Material Cost (USD)</strong>. 
          The first row should contain column headers.
        </AlertDescription>
      </Alert>
    </div>
  );
};