# AICC Database Setup

This project uses a SQLite database with a Node.js/Express backend to persist personas and vehicles.

## Installation

### Backend Setup

```bash
cd backend
npm install
```

### Frontend Setup

```bash
npm install
```

## Running the Application

You need to run both the backend and frontend:

### Terminal 1 - Backend Server
```bash
cd backend
npm run dev
# or npm start for production
```

The backend will start on `http://localhost:3001`

### Terminal 2 - Frontend Development Server
```bash
npm run dev
```

The frontend will start on `http://localhost:5173`

## Database Location

The SQLite database (`aicc.db`) will be created automatically in:
```
backend/aicc.db
```

## Database Structure

### Personas Table
Stores all customer personas with fields:
- `id` (PRIMARY KEY)
- `name`
- `summary`
- `attributes` (JSON)
- `demographics` (JSON)
- `motivations` (JSON array)
- `painPoints` (JSON array)
- `traits` (JSON array)
- `tags` (JSON array)
- `goals` (JSON array)
- `jobsToBeDone` (JSON array)
- `decisionCriteria` (JSON array)
- `objections` (JSON array)
- `channels` (JSON array)
- `preferredContent` (JSON array)
- `meta` (JSON: source, createdAt, updatedAt)

### Vehicles Table
Stores all vehicles with fields:
- `id` (PRIMARY KEY)
- `name`
- `manufacturer`
- `model`
- `year`
- `description`
- `tags` (JSON array)
- `createdAt`
- `updatedAt`

## API Endpoints

### Personas
- `GET /api/personas` - Get all personas
- `POST /api/personas` - Create/update a persona
- `DELETE /api/personas/:id` - Delete a persona
- `POST /api/sync/personas` - Batch sync personas

### Vehicles
- `GET /api/vehicles` - Get all vehicles
- `POST /api/vehicles` - Create/update a vehicle
- `DELETE /api/vehicles/:id` - Delete a vehicle
- `POST /api/sync/vehicles` - Batch sync vehicles

## Data Persistence

Data is automatically synced to the database whenever you:
1. Create a new persona or vehicle
2. Update a persona or vehicle
3. Delete a persona or vehicle

The application also maintains a localStorage fallback for offline access and recovery.

## Troubleshooting

### Backend fails to start
- Make sure port 3001 is available
- Run `npm install` in the backend directory
- Check that Node.js is installed: `node --version`

### Database not persisting
- Check that `backend/aicc.db` file exists
- Verify the backend is running and accessible at `http://localhost:3001/api/personas`
- Check browser console for API errors

### Environment Variables
- Edit `.env` file to change the API URL if needed
- Frontend auto-detects `VITE_API_URL` from environment
- Default: `http://localhost:3001/api`

## Building for Production

```bash
npm run build
cd backend
npm install --production
node server.js
```

Then serve the built `dist/` folder with your preferred web server.


## OpenAI configuration

AI-powered generation and analysis now run through backend proxy endpoints. Set the key on the backend process instead of in the browser:

```bash
cd backend
export OPENAI_API_KEY="sk-..."
npm run dev
```

The frontend calls backend routes under `/api/llm/*`; no OpenAI key is stored in `localStorage`.
