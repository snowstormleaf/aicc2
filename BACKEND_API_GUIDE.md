# Backend API Usage Guide

## Overview

The AICC backend is an Express.js server with SQLite persistence. It provides RESTful endpoints for managing Personas and Vehicles with Zod validation, structured logging, and health monitoring.

## Getting Started

### Installation

```bash
cd backend
npm install
```

### Running the Server

**Development (watch mode):**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

The server starts on `http://localhost:3001` by default. Set `PORT` environment variable to change.

## API Endpoints

### Health Check

Check server and database status:

```
GET /api/health
```

**Response (200 - Healthy):**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-02-03T12:00:00.000Z",
  "uptime": 3600.123,
  "database": "connected",
  "checks": {
    "database": true
  }
}
```

**Response (503 - Unhealthy):**
```json
{
  "success": false,
  "status": "unhealthy",
  "timestamp": "2026-02-03T12:00:00.000Z",
  "uptime": 3600.123,
  "database": "disconnected",
  "checks": {
    "database": false
  },
  "error": "Connection failed"
}
```

### Personas

#### List All Personas
```
GET /api/personas
```

**Response:**
```json
{
  "success": true,
  "message": "Personas retrieved",
  "data": [
    {
      "id": "fleet-manager",
      "name": "Fleet Manager",
      "summary": "Corporate fleet decision-maker",
      "attributes": { "role": "Manager", "company_size": "Large" },
      "demographics": { "age": "45-55", "location": "USA" },
      "traits": ["Cost-conscious", "Data-driven"],
      "tags": ["B2B", "Fleet"],
      "motivations": [...],
      "painPoints": [...],
      "buyingBehavior": [...],
      "goals": [...],
      "jobsToBeDone": [...],
      "decisionCriteria": [...],
      "objections": [...],
      "channels": [...],
      "preferredContent": [...],
      "meta": { "source": "seed" },
      "createdAt": "2026-02-03T12:00:00.000Z",
      "updatedAt": "2026-02-03T12:00:00.000Z"
    }
  ],
  "timestamp": "2026-02-03T12:00:00.000Z"
}
```

#### Create or Update Persona
```
POST /api/personas
Content-Type: application/json
```

**Request:**
```json
{
  "id": "custom-persona-1",
  "name": "Tech Enthusiast",
  "summary": "Early adopter interested in latest technology",
  "attributes": {
    "role": "Individual",
    "company_size": "Self-employed",
    "responsibility": "Full",
    "decision_authority": "Full"
  },
  "demographics": {
    "age": "25-35",
    "income": "$60K-$100K",
    "family": "Single",
    "location": "USA"
  },
  "traits": ["Tech-savvy", "Innovation-focused", "Early adopter"],
  "tags": ["B2C", "Technology", "Premium"],
  "motivations": ["Latest features", "Performance"],
  "painPoints": ["High cost", "Learning curve"],
  "buyingBehavior": ["Online research", "Reviews"],
  "goals": ["Stay ahead of trends"],
  "jobsToBeDone": ["Be productive"],
  "decisionCriteria": ["Features", "Reviews"],
  "objections": ["Price", "Complexity"],
  "channels": ["Tech blogs", "YouTube", "Reddit"],
  "preferredContent": ["Tutorials", "Reviews", "Specifications"]
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Persona saved",
  "data": {
    "id": "custom-persona-1",
    "name": "Tech Enthusiast",
    ...
  },
  "timestamp": "2026-02-03T12:00:00.000Z"
}
```

**Response (400 - Validation Error):**
```json
{
  "success": false,
  "message": "name: Persona name is required",
  "code": "VALIDATION_ERROR",
  "statusCode": 400,
  "timestamp": "2026-02-03T12:00:00.000Z"
}
```

#### Delete Persona
```
DELETE /api/personas/:id
```

**Response (200):**
```json
{
  "success": true,
  "message": "Persona deleted",
  "data": {
    "id": "custom-persona-1"
  },
  "timestamp": "2026-02-03T12:00:00.000Z"
}
```

**Response (404 - Not Found):**
```json
{
  "success": false,
  "message": "Persona not found",
  "statusCode": 404,
  "timestamp": "2026-02-03T12:00:00.000Z"
}
```

### Vehicles

#### List All Vehicles
```
GET /api/vehicles
```

**Response:**
```json
{
  "success": true,
  "message": "Vehicles retrieved",
  "data": [
    {
      "id": "tesla-model-s",
      "name": "Tesla Model S",
      "manufacturer": "Tesla",
      "model": "Model S",
      "year": 2024,
      "description": "Electric luxury sedan with advanced autopilot",
      "tags": ["Electric", "Luxury", "Autonomous"],
      "createdAt": "2026-02-03T12:00:00.000Z",
      "updatedAt": "2026-02-03T12:00:00.000Z"
    }
  ],
  "timestamp": "2026-02-03T12:00:00.000Z"
}
```

#### Create or Update Vehicle
```
POST /api/vehicles
Content-Type: application/json
```

**Request:**
```json
{
  "id": "custom-vehicle-1",
  "name": "Ford F-150 Lightning",
  "manufacturer": "Ford",
  "model": "F-150 Lightning",
  "year": 2024,
  "description": "Electric pickup truck with up to 480 miles range",
  "tags": ["Electric", "Truck", "Work"]
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Vehicle saved",
  "data": {
    "id": "custom-vehicle-1",
    "name": "Ford F-150 Lightning",
    ...
  },
  "timestamp": "2026-02-03T12:00:00.000Z"
}
```

**Response (400 - Validation Error):**
```json
{
  "success": false,
  "message": "year: Number must be less than or equal to 2100",
  "code": "VALIDATION_ERROR",
  "statusCode": 400,
  "timestamp": "2026-02-03T12:00:00.000Z"
}
```

#### Delete Vehicle
```
DELETE /api/vehicles/:id
```

**Response (200):**
```json
{
  "success": true,
  "message": "Vehicle deleted",
  "data": {
    "id": "custom-vehicle-1"
  },
  "timestamp": "2026-02-03T12:00:00.000Z"
}
```

### Batch Operations

#### Sync Multiple Personas
```
POST /api/sync/personas
Content-Type: application/json
```

**Request:**
```json
{
  "personas": [
    {
      "id": "persona-1",
      "name": "Persona 1",
      ...
    },
    {
      "id": "persona-2",
      "name": "Persona 2",
      ...
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Personas synced",
  "data": {
    "count": 2,
    "inserted": 2
  },
  "timestamp": "2026-02-03T12:00:00.000Z"
}
```

#### Sync Multiple Vehicles
```
POST /api/sync/vehicles
Content-Type: application/json
```

**Request:**
```json
{
  "vehicles": [
    {
      "id": "vehicle-1",
      "name": "Vehicle 1",
      ...
    },
    {
      "id": "vehicle-2",
      "name": "Vehicle 2",
      ...
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Vehicles synced",
  "data": {
    "count": 2,
    "inserted": 2
  },
  "timestamp": "2026-02-03T12:00:00.000Z"
}
```

## Validation Rules

### Persona
- `id`: Required, min 1 character
- `name`: Required, 1-255 characters
- `summary`: Optional, max 1000 characters
- `attributes`: Optional object with role, company_size, responsibility, decision_authority (all optional strings)
- `demographics`: Optional object with age, income, family, location (all optional strings)
- `motivations`, `painPoints`, `buyingBehavior`, `traits`, `tags`, `goals`, `jobsToBeDone`, `decisionCriteria`, `objections`, `channels`, `preferredContent`: Optional string arrays

### Vehicle
- `id`: Required, min 1 character
- `name`: Required, 1-255 characters
- `manufacturer`: Optional, max 255 characters
- `model`: Optional, max 255 characters
- `year`: Optional, integer between 1900-2100
- `description`: Optional, max 5000 characters
- `tags`: Optional string array

## Error Codes

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `VALIDATION_ERROR` | 400 | Request body validation failed |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict (not currently used) |
| `DATABASE_ERROR` | 500 | Database operation failed |
| `INTERNAL_ERROR` | 500 | Unhandled server error |

## Logging

All operations are logged with timestamps and metadata:

```
[2026-02-03T12:00:00.000Z] [INFO] Persona created/updated {"id": "custom-persona-1", "name": "Tech Enthusiast"}
[2026-02-03T12:00:05.000Z] [INFO] POST /api/personas {"statusCode": 200, "duration": "45ms"}
[2026-02-03T12:00:10.000Z] [WARN] Attempted to delete non-existent persona {"id": "invalid"}
[2026-02-03T12:00:15.000Z] [ERROR] POST /api/sync/personas failed {"error": "database connection lost"}
```

## Testing with cURL

### Create a Persona
```bash
curl -X POST http://localhost:3001/api/personas \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-persona",
    "name": "Test Persona",
    "summary": "A test persona",
    "tags": ["test"]
  }'
```

### List Personas
```bash
curl http://localhost:3001/api/personas
```

### Check Health
```bash
curl http://localhost:3001/api/health
```

### Delete a Persona
```bash
curl -X DELETE http://localhost:3001/api/personas/test-persona
```

## Database

The backend uses SQLite with the following schema:

**personas table:**
- id (TEXT PRIMARY KEY)
- name (TEXT NOT NULL)
- summary (TEXT)
- attributes (TEXT - JSON stringified)
- demographics (TEXT - JSON stringified)
- motivations (TEXT - JSON stringified)
- ... (other fields)
- createdAt (TEXT)
- updatedAt (TEXT)

**vehicles table:**
- id (TEXT PRIMARY KEY)
- name (TEXT NOT NULL)
- manufacturer (TEXT)
- model (TEXT)
- year (INTEGER)
- description (TEXT)
- tags (TEXT - JSON stringified)
- createdAt (TEXT)
- updatedAt (TEXT)

Database file: `backend/aicc.db` (created automatically on first run)

## Frontend Integration

The frontend connects to this backend via the `HttpClient` and repositories:

```typescript
// Example from frontend
const client = new HttpClient('http://localhost:3001');
const personaRepo = new PersonaApiRepository(client);
const personas = await personaRepo.getAll();
```

All responses are automatically parsed from JSON, and data is validated at boundaries.

---

**API Version**: 1.0.0  
**Last Updated**: 2026-02-03  
**Status**: Production Ready ✅
