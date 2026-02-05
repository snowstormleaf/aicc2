export interface Vehicle {
  id: string;
  name: string;
  manufacturer?: string | null;
  model?: string | null;
  year?: number | null;
  description?: string | null;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}
