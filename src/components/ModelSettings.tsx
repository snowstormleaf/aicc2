import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DEFAULT_MODEL,
  DEFAULT_SERVICE_TIER,
  formatPrice,
  getStoredModelConfig,
  MODEL_OPTIONS,
  MODEL_PRICING,
  MODEL_STORAGE_KEYS,
  SERVICE_TIERS,
  ServiceTier
} from '@/lib/model-pricing';

export const ModelSettings = () => {
  const [serviceTier, setServiceTier] = useState<ServiceTier>(DEFAULT_SERVICE_TIER);
  const [model, setModel] = useState(DEFAULT_MODEL);

  useEffect(() => {
    const stored = getStoredModelConfig();
    setServiceTier(stored.serviceTier);
    setModel(stored.model);
  }, []);

  const pricing = useMemo(() => MODEL_PRICING[serviceTier][model], [serviceTier, model]);

  const handleTierChange = (value: ServiceTier) => {
    setServiceTier(value);
    localStorage.setItem(MODEL_STORAGE_KEYS.serviceTier, value);
    window.dispatchEvent(new Event('model-config-updated'));

    if (!MODEL_PRICING[value][model]) {
      setModel(DEFAULT_MODEL);
      localStorage.setItem(MODEL_STORAGE_KEYS.model, DEFAULT_MODEL);
      window.dispatchEvent(new Event('model-config-updated'));
    }
  };

  const handleModelChange = (value: string) => {
    setModel(value);
    localStorage.setItem(MODEL_STORAGE_KEYS.model, value);
    window.dispatchEvent(new Event('model-config-updated'));
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="service-tier">Service tier</Label>
          <Select value={serviceTier} onValueChange={(value) => handleTierChange(value as ServiceTier)}>
            <SelectTrigger id="service-tier">
              <SelectValue placeholder="Select tier" />
            </SelectTrigger>
            <SelectContent>
              {SERVICE_TIERS.map((tier) => (
                <SelectItem key={tier.id} value={tier.id}>
                  {tier.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {SERVICE_TIERS.find((tier) => tier.id === serviceTier)?.description}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="model">Model</Label>
          <Select value={model} onValueChange={handleModelChange}>
            <SelectTrigger id="model">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {MODEL_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Prices per 1M tokens</Badge>
            {serviceTier === 'flex' && (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                Flex processing
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-muted/40 p-4">
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="space-y-1">
            <p className="text-muted-foreground">Input</p>
            <p className="font-medium">{formatPrice(pricing.input)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Cached input</p>
            <p className="font-medium">{formatPrice(pricing.cachedInput)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Output</p>
            <p className="font-medium">{formatPrice(pricing.output)}</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Flex processing trades latency for lower cost and may return resource unavailable errors during peak usage.
        </p>
      </div>
    </div>
  );
};
