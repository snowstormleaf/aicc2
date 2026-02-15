import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  PersonaSchema,
  PersonaBatchSchema,
  VehicleSchema,
  VehicleBatchSchema,
  validateRequest,
} from './schemas.js';
import {
  logger,
  successResponse,
  errorResponse,
  errorHandler,
  requestLogger,
  ValidationError,
  DatabaseError,
  createHealthCheck,
} from './errors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'aicc.db');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(requestLogger);

// Initialize database
let db;

async function initDb() {
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Create tables if they don't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS personas (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      summary TEXT,
      attributes TEXT,
      demographics TEXT,
      motivations TEXT,
      painPoints TEXT,
      buyingBehavior TEXT,
      traits TEXT,
      tags TEXT,
      goals TEXT,
      jobsToBeDone TEXT,
      decisionCriteria TEXT,
      objections TEXT,
      channels TEXT,
      preferredContent TEXT,
      meta TEXT,
      createdAt TEXT,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      manufacturer TEXT,
      model TEXT,
      year INTEGER,
      description TEXT,
      tags TEXT,
      createdAt TEXT,
      updatedAt TEXT
    );
  `);

  logger.info('Database initialized', { path: dbPath });
}

function parsePersona(p) {
  if (!p) return null;
  return {
    ...p,
    attributes: p.attributes ? JSON.parse(p.attributes) : {},
    demographics: p.demographics ? JSON.parse(p.demographics) : {},
    motivations: p.motivations ? JSON.parse(p.motivations) : [],
    painPoints: p.painPoints ? JSON.parse(p.painPoints) : [],
    buyingBehavior: p.buyingBehavior ? JSON.parse(p.buyingBehavior) : [],
    traits: p.traits ? JSON.parse(p.traits) : [],
    tags: p.tags ? JSON.parse(p.tags) : [],
    goals: p.goals ? JSON.parse(p.goals) : [],
    jobsToBeDone: p.jobsToBeDone ? JSON.parse(p.jobsToBeDone) : [],
    decisionCriteria: p.decisionCriteria ? JSON.parse(p.decisionCriteria) : [],
    objections: p.objections ? JSON.parse(p.objections) : [],
    channels: p.channels ? JSON.parse(p.channels) : [],
    preferredContent: p.preferredContent ? JSON.parse(p.preferredContent) : [],
    meta: p.meta ? JSON.parse(p.meta) : {}
  };
}

function parseVehicle(v) {
  if (!v) return null;
  return {
    ...v,
    tags: v.tags ? JSON.parse(v.tags) : []
  };
}

// ===== PERSONAS ENDPOINTS =====

app.get('/api/personas', async (req, res) => {
  try {
    const personas = await db.all('SELECT * FROM personas');
    const parsed = personas.map(parsePersona);
    res.json(successResponse(parsed, 'Personas retrieved'));
  } catch (err) {
    logger.error('GET /api/personas failed', { error: err.message });
    res.status(500).json(errorResponse(new DatabaseError(err.message), 500));
  }
});

app.post('/api/personas', async (req, res) => {
  try {
    // Validate request body
    const validation = validateRequest(req.body, PersonaSchema);
    if (!validation.success) {
      throw new ValidationError(validation.error);
    }

    const persona = validation.data;
    
    await db.run(
      `INSERT OR REPLACE INTO personas (
        id, name, summary, attributes, demographics, motivations, painPoints,
        buyingBehavior, traits, tags, goals, jobsToBeDone, decisionCriteria,
        objections, channels, preferredContent, meta, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        persona.id,
        persona.name,
        persona.summary || null,
        JSON.stringify(persona.attributes || {}),
        JSON.stringify(persona.demographics || {}),
        JSON.stringify(persona.motivations || []),
        JSON.stringify(persona.painPoints || []),
        JSON.stringify(persona.buyingBehavior || []),
        JSON.stringify(persona.traits || []),
        JSON.stringify(persona.tags || []),
        JSON.stringify(persona.goals || []),
        JSON.stringify(persona.jobsToBeDone || []),
        JSON.stringify(persona.decisionCriteria || []),
        JSON.stringify(persona.objections || []),
        JSON.stringify(persona.channels || []),
        JSON.stringify(persona.preferredContent || []),
        JSON.stringify(persona.meta || {}),
        persona.createdAt || new Date().toISOString(),
        persona.updatedAt || new Date().toISOString()
      ]
    );
    
    logger.info('Persona created/updated', { id: persona.id, name: persona.name });
    res.json(successResponse(persona, 'Persona saved'));
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json(errorResponse(err, 400));
    }
    logger.error('POST /api/personas failed', { error: err.message });
    res.status(500).json(errorResponse(new DatabaseError(err.message), 500));
  }
});

app.delete('/api/personas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Invalid persona ID');
    }

    const result = await db.run('DELETE FROM personas WHERE id = ?', [id]);
    
    if (result.changes === 0) {
      logger.warn('Attempted to delete non-existent persona', { id });
      return res.status(404).json(errorResponse({ message: 'Persona not found', code: 'NOT_FOUND' }, 404));
    }

    logger.info('Persona deleted', { id });
    res.json(successResponse({ id }, 'Persona deleted'));
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json(errorResponse(err, 400));
    }
    logger.error('DELETE /api/personas/:id failed', { error: err.message });
    res.status(500).json(errorResponse(new DatabaseError(err.message), 500));
  }
});

// ===== VEHICLES ENDPOINTS =====

app.get('/api/vehicles', async (req, res) => {
  try {
    const vehicles = await db.all('SELECT * FROM vehicles');
    const parsed = vehicles.map(parseVehicle);
    res.json(successResponse(parsed, 'Vehicles retrieved'));
  } catch (err) {
    logger.error('GET /api/vehicles failed', { error: err.message });
    res.status(500).json(errorResponse(new DatabaseError(err.message), 500));
  }
});

app.post('/api/vehicles', async (req, res) => {
  try {
    // Validate request body
    const validation = validateRequest(req.body, VehicleSchema);
    if (!validation.success) {
      throw new ValidationError(validation.error);
    }

    const vehicle = validation.data;

    await db.run(
      `INSERT OR REPLACE INTO vehicles (
        id, name, manufacturer, model, year, description, tags, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        vehicle.id,
        vehicle.name,
        vehicle.manufacturer || null,
        vehicle.model || null,
        vehicle.year || null,
        vehicle.description || null,
        JSON.stringify(vehicle.tags || []),
        vehicle.createdAt || new Date().toISOString(),
        vehicle.updatedAt || new Date().toISOString()
      ]
    );

    logger.info('Vehicle created/updated', { id: vehicle.id, name: vehicle.name });
    res.json(successResponse(vehicle, 'Vehicle saved'));
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json(errorResponse(err, 400));
    }
    logger.error('POST /api/vehicles failed', { error: err.message });
    res.status(500).json(errorResponse(new DatabaseError(err.message), 500));
  }
});

app.delete('/api/vehicles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Invalid vehicle ID');
    }

    const result = await db.run('DELETE FROM vehicles WHERE id = ?', [id]);

    if (result.changes === 0) {
      logger.warn('Attempted to delete non-existent vehicle', { id });
      return res.status(404).json(errorResponse({ message: 'Vehicle not found', code: 'NOT_FOUND' }, 404));
    }

    logger.info('Vehicle deleted', { id });
    res.json(successResponse({ id }, 'Vehicle deleted'));
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json(errorResponse(err, 400));
    }
    logger.error('DELETE /api/vehicles/:id failed', { error: err.message });
    res.status(500).json(errorResponse(new DatabaseError(err.message), 500));
  }
});

// ===== SYNC ENDPOINTS (for batch operations) =====

app.post('/api/sync/personas', async (req, res) => {
  try {
    // Validate request body
    const validation = validateRequest(req.body, PersonaBatchSchema);
    if (!validation.success) {
      throw new ValidationError(validation.error);
    }

    const { personas } = validation.data;
    let inserted = 0;

    for (const p of personas) {
      const result = await db.run(
        `INSERT OR REPLACE INTO personas (
          id, name, summary, attributes, demographics, motivations, painPoints,
          buyingBehavior, traits, tags, goals, jobsToBeDone, decisionCriteria,
          objections, channels, preferredContent, meta, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          p.id,
          p.name,
          p.summary || null,
          JSON.stringify(p.attributes || {}),
          JSON.stringify(p.demographics || {}),
          JSON.stringify(p.motivations || []),
          JSON.stringify(p.painPoints || []),
          JSON.stringify(p.buyingBehavior || []),
          JSON.stringify(p.traits || []),
          JSON.stringify(p.tags || []),
          JSON.stringify(p.goals || []),
          JSON.stringify(p.jobsToBeDone || []),
          JSON.stringify(p.decisionCriteria || []),
          JSON.stringify(p.objections || []),
          JSON.stringify(p.channels || []),
          JSON.stringify(p.preferredContent || []),
          JSON.stringify(p.meta || {}),
          p.createdAt || new Date().toISOString(),
          p.updatedAt || new Date().toISOString()
        ]
      );
      inserted += result.changes;
    }

    logger.info('Personas batch synced', { count: personas.length, inserted });
    res.json(successResponse({ count: personas.length, inserted }, 'Personas synced'));
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json(errorResponse(err, 400));
    }
    logger.error('POST /api/sync/personas failed', { error: err.message });
    res.status(500).json(errorResponse(new DatabaseError(err.message), 500));
  }
});

app.post('/api/sync/vehicles', async (req, res) => {
  try {
    // Validate request body
    const validation = validateRequest(req.body, VehicleBatchSchema);
    if (!validation.success) {
      throw new ValidationError(validation.error);
    }

    const { vehicles } = validation.data;
    let inserted = 0;

    for (const v of vehicles) {
      const result = await db.run(
        `INSERT OR REPLACE INTO vehicles (
          id, name, manufacturer, model, year, description, tags, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          v.id,
          v.name,
          v.manufacturer || null,
          v.model || null,
          v.year || null,
          v.description || null,
          JSON.stringify(v.tags || []),
          v.createdAt || new Date().toISOString(),
          v.updatedAt || new Date().toISOString()
        ]
      );
      inserted += result.changes;
    }

    logger.info('Vehicles batch synced', { count: vehicles.length, inserted });
    res.json(successResponse({ count: vehicles.length, inserted }, 'Vehicles synced'));
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json(errorResponse(err, 400));
    }
    logger.error('POST /api/sync/vehicles failed', { error: err.message });
    res.status(500).json(errorResponse(new DatabaseError(err.message), 500));
  }
});

// ===== HEALTH CHECK ENDPOINT =====

app.get('/api/health', createHealthCheck(() => db));

// ===== ERROR HANDLING =====

app.use(errorHandler);

// ===== INITIALIZE AND START SERVER =====

const PORT = Number(process.env.PORT) || 3001;

function logServerReady(port) {
  logger.info('🚀 AICC Backend server running', { port, url: `http://localhost:${port}` });
  logger.info('📡 API endpoints:', {
    personas_list: `GET http://localhost:${port}/api/personas`,
    personas_create: `POST http://localhost:${port}/api/personas`,
    personas_delete: `DELETE http://localhost:${port}/api/personas/:id`,
    vehicles_list: `GET http://localhost:${port}/api/vehicles`,
    vehicles_create: `POST http://localhost:${port}/api/vehicles`,
    vehicles_delete: `DELETE http://localhost:${port}/api/vehicles/:id`,
    health: `GET http://localhost:${port}/api/health`,
  });
}

function startHttpServer(port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => resolve(server));
    server.on('error', reject);
  });
}

async function isBackendHealthy(port) {
  try {
    const response = await fetch(`http://localhost:${port}/api/health`, {
      signal: AbortSignal.timeout(1500)
    });

    if (!response.ok) return false;

    const payload = await response.json().catch(() => null);
    return Boolean(payload?.success || payload?.status === 'healthy');
  } catch {
    return false;
  }
}

async function start() {
  try {
    await initDb();
    logger.info('✅ Database initialized', { path: dbPath });

    await startHttpServer(PORT);
    logServerReady(PORT);
  } catch (err) {
    if (err?.code === 'EADDRINUSE') {
      const healthyInstanceExists = await isBackendHealthy(PORT);

      if (healthyInstanceExists) {
        logger.warn('Backend already running, not starting a duplicate instance', {
          port: PORT,
          health: `http://localhost:${PORT}/api/health`
        });
        process.exit(0);
      }

      logger.error('Port is already in use by another process', {
        port: PORT,
        suggestion: `Free port ${PORT} or set PORT to another value`
      });
      process.exit(1);
    }

    logger.error('❌ Failed to start server', { error: err.message });
    process.exit(1);
  }
}

start();
