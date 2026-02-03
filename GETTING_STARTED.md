# 🎯 AICC Database Persistence - Complete Setup Guide

## What You'll Have After This

✅ **Persistent Data Storage** - Personas and vehicles saved permanently  
✅ **Automatic Synchronization** - Changes saved to database instantly  
✅ **Survive Restarts** - Data persists when you stop npm and restart  
✅ **Professional Backend** - Express.js + SQLite API server  
✅ **Production Ready** - Can be deployed to cloud servers  

---

## 🚀 Start Here: 5-Minute Quick Start

### For Windows Users
```cmd
setup.bat
```

### For macOS/Linux Users
```bash
chmod +x setup.sh
./setup.sh
```

This will:
1. Install backend dependencies
2. Install frontend dependencies
3. Tell you what to do next

---

## 📍 Step-by-Step Setup

### Prerequisites
- Node.js v14 or higher installed
- npm or yarn
- Two terminal windows

### Step 1: Install Backend (Terminal, any directory)

```bash
cd backend
npm install
cd ..
```

**Expected output:**
```
added XXX packages in XX seconds
```

### Step 2: Install Frontend (Terminal, same)

```bash
npm install
```

**Expected output:**
```
added XXX packages in XX seconds
```

### Step 3: Start Backend (Terminal 1)

```bash
cd backend
npm run dev
```

**Expected output:**
```
AICC Backend server running on http://localhost:3001
Database: /path/to/backend/aicc.db
```

### Step 4: Start Frontend (Terminal 2, new window)

```bash
npm run dev
```

**Expected output:**
```
Local: http://localhost:5173
```

### Step 5: Open Application

Open your browser to: **http://localhost:5173**

---

## ✅ Verify It's Working

### 1. Create a Test Item
1. Click the menu (☰)
2. Go to Workspace → Vehicles
3. Click "New"
4. Enter name: "Test Vehicle"
5. Click "Create"

### 2. Verify It Saved
- Item appears in list ✅

### 3. The Big Test - Persistence
1. Stop backend: Click Terminal 1, press `Ctrl+C`
2. Restart backend: `cd backend && npm run dev`
3. Refresh browser: `F5`
4. **Item still there?** ✅ YOU'RE DONE!

If item is still there, data persistence is working!

---

## 🗂️ What's Where

| What | Where |
|------|-------|
| **Your Data** | `backend/aicc.db` |
| **Backend API** | `backend/server.js` |
| **Backend Config** | `backend/package.json` |
| **API Client** | `src/api/persistenceApi.ts` |
| **Persona Store** | `src/personas/store.tsx` |
| **Vehicle Store** | `src/vehicles/store.tsx` |
| **Frontend Config** | `.env` |

---

## 🎮 How to Use

### Creating Items
1. Menu (☰) → Workspace
2. Choose "Personas" or "Vehicles"
3. Click "New"
4. Fill in details
5. Click "Create"
6. **Automatically saved to database** ✅

### Editing Items
1. Click the edit icon (pencil) on any item
2. Make changes
3. Click "Save"
4. **Automatically saved to database** ✅

### Deleting Items
1. Click the delete icon (trash) on any item
2. Item removed from list
3. **Automatically removed from database** ✅

### Using in Workflow
1. Homepage → Select Persona
2. Next → Select Vehicle  
3. Your selected vehicle comes from database ✅

---

## 🔄 How It Works (Technical)

```
You Create Item
    ↓
Frontend sends data to Backend API
    ↓
Backend saves to SQLite database (aicc.db)
    ↓
Response sent back to frontend
    ↓
Frontend updates UI
    ↓
Next time you restart: data loads from database ✅
```

---

## 📋 Stopping and Restarting

### Stopping Everything
```bash
# Terminal 1 (Backend)
Ctrl+C

# Terminal 2 (Frontend)  
Ctrl+C
```

Your data is safe in `backend/aicc.db`!

### Restarting Everything
```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
npm run dev
```

Data automatically loads from database ✅

---

## 🆘 Troubleshooting

### Backend says "Port 3001 already in use"

**Solution:**
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :3001
kill -9 <PID>
```

### Backend won't start after install

**Solution:**
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Data not appearing after restart

**Checklist:**
- [ ] Backend is running (`http://localhost:3001` accessible)
- [ ] .env file has `VITE_API_URL=http://localhost:3001/api`
- [ ] Browser console (F12) shows no errors
- [ ] Check `backend/aicc.db` file exists

### "Cannot find module 'express'"

**Solution:**
```bash
cd backend
npm install
npm run dev
```

### Still having issues?

See **[PERSISTENCE_GUIDE.md](PERSISTENCE_GUIDE.md)** → Troubleshooting section

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| **QUICK_REFERENCE.md** | Copy-paste commands |
| **DATABASE_SETUP.md** | Installation guide |
| **PERSISTENCE_GUIDE.md** | Complete reference |
| **INSTALLATION_CHECKLIST.md** | Step-by-step verification |
| **IMPLEMENTATION_SUMMARY.md** | What changed |
| **This file** | Master guide |

---

## 🌐 API Endpoints (Optional - for developers)

```bash
# Get all personas
curl http://localhost:3001/api/personas

# Get all vehicles
curl http://localhost:3001/api/vehicles

# Create persona (POST your data)
curl -X POST http://localhost:3001/api/personas ...

# Delete persona
curl -X DELETE http://localhost:3001/api/personas/ID
```

See **[PERSISTENCE_GUIDE.md](PERSISTENCE_GUIDE.md)** for full API reference.

---

## 💾 Database Backup

### Backup Your Data
```bash
# Create backup
cp backend/aicc.db backend/aicc.db.backup

# Restore if needed
cp backend/aicc.db.backup backend/aicc.db
```

### Export as JSON
```bash
# Get all personas as JSON
curl http://localhost:3001/api/personas > personas.json

# Get all vehicles as JSON
curl http://localhost:3001/api/vehicles > vehicles.json
```

---

## 🚀 Production Deployment (When Ready)

### Build for Production
```bash
npm run build
cd backend
npm install --production
```

### Deploy
- Upload `dist/` folder to web server
- Deploy backend to cloud (AWS, Heroku, Azure, etc.)
- Update `.env` with production API URL
- Set up database backup strategy

See **[PERSISTENCE_GUIDE.md](PERSISTENCE_GUIDE.md)** → Production Deployment

---

## ✨ Features

✅ Real-time synchronization  
✅ Automatic backups to database  
✅ Fallback to localStorage  
✅ No data loss on restart  
✅ RESTful API  
✅ Production-ready  
✅ Easy to understand  
✅ Easy to maintain  

---

## 📊 Architecture

```
┌─────────────────────────────┐
│   React Application         │
│  (Frontend Port 5173)       │
├─────────────────────────────┤
│  - Personas Context         │
│  - Vehicles Context         │
│  - Persistence API Client   │
└──────────────┬──────────────┘
               │ HTTP/JSON
               ↓
┌─────────────────────────────┐
│   Express Backend           │
│   (API Port 3001)           │
├─────────────────────────────┤
│  - REST API Endpoints       │
│  - Database Sync            │
│  - Transaction Support      │
└──────────────┬──────────────┘
               │ SQL
               ↓
┌─────────────────────────────┐
│   SQLite Database           │
│   (aicc.db)                 │
├─────────────────────────────┤
│  - Personas Table           │
│  - Vehicles Table           │
└─────────────────────────────┘
```

---

## 🎓 Learning Path

1. **Just want to use it?** → Follow "5-Minute Quick Start" above ✅
2. **Want to understand it?** → Read [DATABASE_SETUP.md](DATABASE_SETUP.md)
3. **Need full reference?** → Read [PERSISTENCE_GUIDE.md](PERSISTENCE_GUIDE.md)
4. **Need to troubleshoot?** → See Troubleshooting section above
5. **Ready for production?** → See [PERSISTENCE_GUIDE.md](PERSISTENCE_GUIDE.md) → Production

---

## 🎉 Summary

Your AICC application now has:

| Feature | Status |
|---------|--------|
| Persistent Storage | ✅ SQLite Database |
| Auto Sync | ✅ Real-time |
| Survives Restarts | ✅ Yes |
| Professional API | ✅ Express.js |
| Production Ready | ✅ Yes |

**Data persists even when you stop npm and restart!** 🎉

---

## 📞 Quick Support

**Q: Where is my data?**  
A: `backend/aicc.db`

**Q: How do I backup?**  
A: Copy `backend/aicc.db` to safe location

**Q: Will data be lost if I close terminal?**  
A: No! Data is in database, not in memory

**Q: Can I run on production?**  
A: Yes! See Production Deployment section

**Q: What if database gets corrupted?**  
A: Delete `backend/aicc.db`, it recreates on restart

**Q: Do I always need two terminals?**  
A: Yes, one for backend, one for frontend

---

## 🏁 You're Ready!

1. Run setup script (`setup.bat` or `setup.sh`)
2. Start backend: `cd backend && npm run dev`
3. Start frontend: `npm run dev`
4. Open http://localhost:5173
5. **Enjoy persistent data!** 🚀

---

**Questions?** Check the [Documentation Index](README_PERSISTENCE.md) for more guides.

**Ready to deploy?** See [PERSISTENCE_GUIDE.md](PERSISTENCE_GUIDE.md) → Production Deployment

**Happy coding! 🎉**
