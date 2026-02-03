# Quick Reference: Database Persistence

## 🚀 Quick Start

### Windows
```cmd
setup.bat
```

### macOS/Linux
```bash
chmod +x setup.sh
./setup.sh
```

## 🎯 Running the App

**Terminal 1 - Backend:**
```bash
cd backend && npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

Then open: **http://localhost:5173**

## ✅ Verification Checklist

- [ ] Backend runs without errors
- [ ] Frontend loads at localhost:5173
- [ ] Can create personas
- [ ] Can create vehicles
- [ ] Data appears immediately
- [ ] Refresh page → data persists
- [ ] Stop backend → restart backend → data still there

## 📊 What's Stored

### Personas
- Customer profiles
- Demographics
- Traits and characteristics
- Goals and pain points
- All custom fields

### Vehicles
- Vehicle specifications
- Manufacturer/Model/Year
- Description
- Tags
- All custom fields

## 🗄️ Database Location

```
backend/aicc.db
```

This file is created automatically and stores all your data.

## 🔧 Common Commands

### Backend
```bash
cd backend
npm run dev        # Development with auto-reload
npm start          # Production mode
```

### Frontend
```bash
npm run dev        # Development
npm run build      # Production build
npm run preview    # Preview production build
```

### Database Reset
```bash
rm backend/aicc.db    # Delete database file
# Backend will recreate it on next start
```

## 🚨 Troubleshooting

| Problem | Solution |
|---------|----------|
| Backend won't start | `cd backend && npm install` |
| Port 3001 in use | Kill process on port 3001 |
| Data not saving | Check backend is running |
| Data disappeared | Check `.env` API_URL is correct |
| Need to reset | Delete `backend/aicc.db` |

## 📡 API Endpoints

```
GET  http://localhost:3001/api/personas
GET  http://localhost:3001/api/vehicles
POST http://localhost:3001/api/personas
POST http://localhost:3001/api/vehicles
DELETE http://localhost:3001/api/personas/:id
DELETE http://localhost:3001/api/vehicles/:id
```

## 📝 Configuration

**File:** `.env`

```env
VITE_API_URL=http://localhost:3001/api
```

## 📚 Documentation Files

- `IMPLEMENTATION_SUMMARY.md` - What changed
- `PERSISTENCE_GUIDE.md` - Complete guide
- `DATABASE_SETUP.md` - Setup details

## ✨ Features

✅ Persistent storage
✅ Automatic sync
✅ Data survives restarts
✅ Fallback to localStorage
✅ RESTful API
✅ SQLite database
✅ Ready for production

## 🎓 How It Works

1. **Start:** Backend loads database, frontend fetches data
2. **Create:** You create item → frontend syncs → database saves
3. **Persist:** Data stays in database even after restart ✅
4. **Retrieve:** Next startup → backend loads → frontend displays

## 🚀 Ready to Deploy?

See `PERSISTENCE_GUIDE.md` → Production Deployment section

---

**Need Help?** Check the documentation files or see Troubleshooting section.
