import type { Vehicle } from '@/domain/vehicles/models';

export const vehicles: Record<string, Vehicle> = {
  'ford-transit-custom': {
    id: 'ford-transit-custom',
    name: 'Ford Transit Custom',
    manufacturer: 'Ford',
    model: 'Transit Custom',
    year: 2024,
    description: 'Mid-size van suitable for commercial use',
    tags: ['van', 'commercial'],
    createdAt: 'seed',
    updatedAt: 'seed'
  },
  'ford-ranger': {
    id: 'ford-ranger',
    name: 'Ford Ranger',
    manufacturer: 'Ford',
    model: 'Ranger',
    year: 2024,
    description: 'Versatile pickup for work and leisure',
    tags: ['truck', 'pickup'],
    createdAt: 'seed',
    updatedAt: 'seed'
  },
  'ford-kuga': {
    id: 'ford-kuga',
    name: 'Ford Kuga',
    manufacturer: 'Ford',
    model: 'Kuga',
    year: 2024,
    description: 'Compact SUV with modern features',
    tags: ['suv', 'compact'],
    createdAt: 'seed',
    updatedAt: 'seed'
  },
  'ford-tourneo': {
    id: 'ford-tourneo',
    name: 'Ford Tourneo',
    manufacturer: 'Ford',
    model: 'Tourneo',
    year: 2024,
    description: 'Passenger-oriented van for crew transport',
    tags: ['van', 'passenger'],
    createdAt: 'seed',
    updatedAt: 'seed'
  }
};
