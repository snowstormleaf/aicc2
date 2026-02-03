import type { Vehicle } from "./models";

function nowIso() {
  return new Date().toISOString();
}

export function normalizeVehicle(v: Vehicle): Vehicle {
  const createdAt = v.createdAt ?? nowIso();
  const updatedAt = nowIso();

  return {
    ...v,
    name: String(v.name ?? "").trim() || "Untitled Vehicle",
    id: String(v.id ?? "").trim() || `vehicle_${Math.random().toString(16).slice(2)}`,
    manufacturer: String(v.manufacturer ?? "").trim() || undefined,
    model: String(v.model ?? "").trim() || undefined,
    year: v.year ? Number(v.year) : undefined,
    description: String(v.description ?? "").trim() || undefined,
    tags: Array.isArray(v.tags) ? v.tags.map(String).filter(Boolean) : [],
    createdAt,
    updatedAt,
  };
}
