import { Vehicle } from "@/types/vehicle";

const BASE = "/api/vehicles";

export async function listVehicles(): Promise<Vehicle[]> {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error("Failed to list vehicles");
  return res.json();
}

export async function createVehicle(payload: Partial<Vehicle>): Promise<Vehicle> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create vehicle");
  return res.json();
}

export async function updateVehicle(id: string, payload: Partial<Vehicle>): Promise<Vehicle> {
  const res = await fetch(`${BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update vehicle");
  return res.json();
}

export async function deleteVehicle(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete vehicle");
}

export async function generateVehicleAI(prompt: string): Promise<Partial<Vehicle>> {
  const res = await fetch(`${BASE}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new Error("Failed to generate vehicle");
  return res.json();
}