export interface Vehicle {
  id: string;
  name: string;
  brand?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  year?: number | null;
  description?: string | null;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}
