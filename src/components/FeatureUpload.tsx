import { type ChangeEvent, type DragEvent, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, FileSpreadsheet, AlertCircle, Download, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { parseXlsxRows } from "@/lib/xlsx-utils";

interface Feature {
  id: string;
  name: string;
  description: string;
  materialCost: number;
}

interface EditableFeatureRow {
  id: string;
  name: string;
  description: string;
  materialCost: string;
}

interface FeatureUploadProps {
  features: Feature[];
  onFeaturesUploaded: (features: Feature[]) => void;
}

const EMPTY_ROW: EditableFeatureRow = { id: "", name: "", description: "", materialCost: "" };

const toEditableRows = (items: Feature[]): EditableFeatureRow[] =>
  items.map((feature) => ({
    id: feature.id,
    name: feature.name,
    description: feature.description,
    materialCost: String(feature.materialCost),
  }));

const withTrailingEmptyRow = (rows: EditableFeatureRow[]): EditableFeatureRow[] => {
  if (rows.length === 0) {
    return [{ ...EMPTY_ROW }];
  }
  const last = rows[rows.length - 1];
  if (!last.name && !last.description && !last.materialCost) {
    return rows;
  }
  return [...rows, { ...EMPTY_ROW }];
};

const serializeFeatures = (items: Feature[]) =>
  JSON.stringify(items.map((item) => [item.name, item.description, item.materialCost]));

export const FeatureUpload = ({ features, onFeaturesUploaded }: FeatureUploadProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editorRows, setEditorRows] = useState<EditableFeatureRow[]>(() =>
    withTrailingEmptyRow(toEditableRows(features))
  );
  const editorRowsRef = useRef<EditableFeatureRow[]>(withTrailingEmptyRow(toEditableRows(features)));
  const lastPersistedFeaturesRef = useRef<string>(serializeFeatures(features));
  const { toast } = useToast();

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
    const lines = text.replace(/\r\n/g, '\n').split('\n').filter(line => line.trim());

    const splitLine = (line: string) => {
      const cols: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            cur += '"';
            i++;
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

      if (!name || !description || !costStr) return null;
      const materialCost = parseFloat(costStr.replace(/[^0-9.-]/g, ''));
      if (isNaN(materialCost)) throw new Error(`Row ${index + 2}: Invalid cost value "${costStr}"`);

      return { id: name, name, description, materialCost };
    }).filter((row): row is Feature => row !== null);

    return normalizeFeatures(parsed);
  };

  const parseXlsx = async (data: ArrayBuffer): Promise<Feature[]> => {
    const rows = await parseXlsxRows(data);
    if (rows.length === 0) return [];

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
      if (!name || !description || !costRaw) return null;
      const materialCost = parseFloat(costRaw.replace(/[^0-9.-]/g, ""));
      if (Number.isNaN(materialCost)) return null;
      return { id: name, name, description, materialCost };
    }).filter((row): row is Feature => row !== null);

    return normalizeFeatures(parsed);
  };

  const handleFileUpload = async (file: File) => {
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.csv') && !lower.endsWith('.xlsx') && !lower.endsWith('.xls')) {
      toast({ title: "Invalid file type", description: "Please upload a CSV or XLSX file", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      const parsedFeatures = lower.endsWith('.csv')
        ? parseCSV(await file.text())
        : await parseXlsx(await file.arrayBuffer());

      const nextRows = withTrailingEmptyRow(toEditableRows(parsedFeatures));
      setEditorRows(nextRows);
      editorRowsRef.current = nextRows;
      lastPersistedFeaturesRef.current = serializeFeatures(parsedFeatures);
      onFeaturesUploaded(parsedFeatures);
      toast({ title: "Features parsed", description: `${parsedFeatures.length} feature rows loaded.` });
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

  const persistRows = (rows: EditableFeatureRow[]) => {
    const parsed = rows
      .map((row) => ({
        id: row.id || row.name,
        name: row.name.trim(),
        description: row.description.trim(),
        materialCost: parseFloat(row.materialCost.trim()),
      }))
      .filter((item) => item.name || item.description || !Number.isNaN(item.materialCost))
      .filter((item) => item.name && item.description && !Number.isNaN(item.materialCost));

    const normalized = normalizeFeatures(parsed);
    const nextKey = serializeFeatures(normalized);
    if (nextKey !== lastPersistedFeaturesRef.current) {
      lastPersistedFeaturesRef.current = nextKey;
      onFeaturesUploaded(normalized);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) handleFileUpload(files[0]);
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) handleFileUpload(files[0]);
  };

  const updateRow = (index: number, key: keyof EditableFeatureRow, value: string) => {
    const current = editorRowsRef.current;
    const next = withTrailingEmptyRow(
      current.map((row, idx) => (idx === index ? { ...row, [key]: value } : row))
    );
    editorRowsRef.current = next;
    setEditorRows(next);
    persistRows(next);
  };

  const removeRow = (index: number) => {
    const next = withTrailingEmptyRow(editorRowsRef.current.filter((_, idx) => idx !== index));
    setEditorRows(next);
    editorRowsRef.current = next;
    persistRows(next);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">Upload Feature Data</h2>
        <p className="text-muted-foreground">Upload CSV/XLSX and edit all features in one place before continuing.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                Upload Features
              </CardTitle>
              <CardDescription>Import features from CSV or XLSX. This does not run analysis automatically.</CardDescription>
            </div>
            <Button onClick={() => {
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
            }} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download template
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <p className="text-sm text-muted-foreground mb-2">Drag and drop your CSV/XLSX file here, or click to browse</p>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
              disabled={isProcessing}
            />
            <Button asChild variant="outline" disabled={isProcessing} className="mt-2">
              <label htmlFor="file-upload" className="cursor-pointer">
                {isProcessing ? 'Processing...' : 'Choose file'}
              </label>
            </Button>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>CSV/XLSX format requirements</AlertTitle>
            <AlertDescription>
              Include columns <strong>Feature Name</strong>, <strong>Description</strong>, and <strong>Material Cost (USD)</strong>. Blank rows are ignored.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Feature List Editor</CardTitle>
          <CardDescription>
            Parsed and manual features live in one editable panel. Changes are saved automatically as you type.
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
                {editorRows.map((feature, index) => {
                  const isEmptyRow = index === editorRows.length - 1 && !feature.name && !feature.description && !feature.materialCost;
                  return (
                    <tr key={`${feature.id || 'new'}-${index}`}>
                      <td className="border border-gray-300 px-3 py-2">
                        <input
                          className="w-full bg-transparent text-sm"
                          value={feature.name}
                          onChange={(e) => updateRow(index, "name", e.target.value)}
                          onBlur={() => persistRows(editorRowsRef.current)}
                          placeholder={isEmptyRow ? "Add another feature..." : "Feature name"}
                        />
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        <input
                          className="w-full bg-transparent text-sm"
                          value={feature.description}
                          onChange={(e) => updateRow(index, "description", e.target.value)}
                          onBlur={() => persistRows(editorRowsRef.current)}
                          placeholder={isEmptyRow ? "Description" : "Feature description"}
                        />
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-right">
                        <input
                          className="w-full bg-transparent text-right text-sm"
                          value={feature.materialCost}
                          type="number"
                          min="0"
                          onChange={(e) => updateRow(index, "materialCost", e.target.value)}
                          onBlur={() => persistRows(editorRowsRef.current)}
                          placeholder="0"
                        />
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-right">
                        {!isEmptyRow && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeRow(index)}
                            aria-label="Remove feature"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
