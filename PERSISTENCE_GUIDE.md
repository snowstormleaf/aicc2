# Database Persistence Setup

Your AICC application now has persistent database storage for Personas and Vehicles using SQLite.

## Quick Start

### Windows
```cmd
setup.bat
```

Then in two separate terminals:
```cmd
# Terminal 1
cd backend
npm run dev

# Terminal 2
npm run dev
```

### macOS/Linux
```bash
chmod +x setup.sh
./setup.sh
```

Then in two separate terminals:
```bash
# Terminal 1
cd backend
npm run dev

# Terminal 2
npm run dev
```

## What Changed

### Frontend Changes
- **Personas Store** (`src/personas/store.tsx`) - Now syncs with database
- **Vehicles Store** (`src/vehicles/store.tsx`) - Now syncs with database
- **Persistence API** (`src/api/persistenceApi.ts`) - New API client for database calls

### Backend Addition
- **Express Server** (`backend/server.js`) - SQLite database REST API
- **Database** (`backend/aicc.db`) - SQLite database (auto-created)

## Architecture

```
┌─────────────────────┐
│  React Frontend     │
│  (Port 5173)        │
└──────────┬──────────┘
           │
           │ HTTP/JSON
           │
┌──────────▼──────────┐
│ Express Backend     │
│ (Port 3001)         │
└──────────┬──────────┘
           │
           │ SQL
           │
┌──────────▼──────────┐
│ SQLite Database     │
│ (aicc.db)           │
└─────────────────────┘
```

## How It Works

1. **Initialization**: When you open the app, it loads personas and vehicles from the SQLite database
2. **Real-time Sync**: Any changes (create, edit, delete) are automatically synced to the database
3. **Fallback**: If the database is unavailable, the app falls back to localStorage
4. **Persistence**: Data persists across npm restarts ✅

## Running the Application

### Option 1: Two Terminal Windows (Recommended)

**Terminal 1 - Backend Server:**
```bash
cd backend
npm run dev
```
Output: `Backend server running on http://localhost:3001`

**Terminal 2 - Frontend:**
```bash
npm run dev
```
Output: `Local: http://localhost:5173`

### Option 2: Using npm-run-all (if installed)

```bash
npm install -g npm-run-all
concurrently "cd backend && npm run dev" "npm run dev"
```

## Verification

✅ **Check Backend is Running:**
```bash
curl http://localhost:3001/api/personas
```
Should return: `[]` or list of personas

✅ **Check Database File:**
```bash
ls backend/aicc.db
```
File should exist and grow as you add data

✅ **Create a Test Entry:**
1. Open http://localhost:5173
2. Go to Workspace → Vehicles
3. Create a new vehicle
4. Stop the backend
5. Restart the backend
6. Refresh the page
7. Vehicle should still be there! ✅

## Environment Variables

Edit `.env` to customize:
```env
VITE_API_URL=http://localhost:3001/api
```

## Troubleshooting

### Backend fails to start
```bash
# Make sure you're in the backend directory
cd backend

# Install dependencies
npm install

# Check Node version (requires 14+)
node --version

# Try running directly
node server.js
```

### Port already in use
```bash
# Change port in .env
VITE_API_URL=http://localhost:3002/api

# Or find and kill the process using the port
# Windows:
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# macOS/Linux:
lsof -i :3001
kill -9 <PID>
```

### Database corruption
```bash
# Simply delete the database file
rm backend/aicc.db

# It will be recreated on next backend start
```

### Data not syncing
1. Check browser console (F12) for errors
2. Check terminal where backend is running for errors
3. Verify API is accessible: `curl http://localhost:3001/api/personas`
4. Check `.env` has correct `VITE_API_URL`

## API Endpoints

All endpoints are prefixed with `/api`:

### Personas
- `GET /personas` - Retrieve all personas
- `POST /personas` - Create/update persona
- `DELETE /personas/:id` - Delete persona
- `POST /sync/personas` - Batch sync (used internally)

### Vehicles
- `GET /vehicles` - Retrieve all vehicles
- `POST /vehicles` - Create/update vehicle
- `DELETE /vehicles/:id` - Delete vehicle
- `POST /sync/vehicles` - Batch sync (used internally)

## Production Deployment

### Build Frontend
```bash
npm run build
```
This creates `dist/` folder

### Install Backend Production Dependencies
```bash
cd backend
npm install --production
```

### Run in Production
```bash
# Set environment
export VITE_API_URL=https://your-api-domain.com/api

# Start backend
NODE_ENV=production node backend/server.js

# Serve frontend from dist/
# Use nginx, Apache, or Node.js static server
```

## Data Backup

To backup your data:
```bash
# Copy the database file
cp backend/aicc.db backend/aicc.db.backup

# Or export as JSON (programmatically via API):
curl http://localhost:3001/api/personas > personas.json
curl http://localhost:3001/api/vehicles > vehicles.json
```

## Database Schema

### Personas Table
```sql
CREATE TABLE personas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  summary TEXT,
  attributes TEXT,           -- JSON
  demographics TEXT,         -- JSON
  motivations TEXT,          -- JSON array
  painPoints TEXT,           -- JSON array
  buyingBehavior TEXT,       -- JSON array
  traits TEXT,               -- JSON array
  tags TEXT,                 -- JSON array
  goals TEXT,                -- JSON array
  jobsToBeDone TEXT,         -- JSON array
  decisionCriteria TEXT,     -- JSON array
  objections TEXT,           -- JSON array
  channels TEXT,             -- JSON array
  preferredContent TEXT,     -- JSON array
  meta TEXT,                 -- JSON: source, createdAt, updatedAt
  createdAt TEXT,
  updatedAt TEXT
);
```

### Vehicles Table
```sql
CREATE TABLE vehicles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  manufacturer TEXT,
  model TEXT,
  year INTEGER,
  description TEXT,
  tags TEXT,                 -- JSON array
  createdAt TEXT,
  updatedAt TEXT
);
```

## Support

For issues:
1. Check terminal output for error messages
2. Check browser console (F12) for client errors
3. Verify both backend and frontend are running
4. Check `.env` configuration
5. Try deleting database and recreating data

Happy development! 🚀
