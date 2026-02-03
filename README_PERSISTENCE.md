# AICC Database Persistence - Documentation Index

## 📋 Quick Navigation

### 🚀 Just Getting Started?
→ **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Start here! Copy-paste commands.

### 🔧 Need Setup Help?
→ **[DATABASE_SETUP.md](DATABASE_SETUP.md)** - Step-by-step installation guide.

### 📚 Want Full Details?
→ **[PERSISTENCE_GUIDE.md](PERSISTENCE_GUIDE.md)** - Comprehensive documentation.

### 📝 What Changed?
→ **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - Technical overview.

---

## 🎯 Your Situation

### "I just want it to work"
1. Run `setup.bat` (Windows) or `./setup.sh` (macOS/Linux)
2. In Terminal 1: `cd backend && npm run dev`
3. In Terminal 2: `npm run dev`
4. Open http://localhost:5173
5. ✅ Data now persists!

### "How do I stop and restart?"
Simply stop both terminals (Ctrl+C) and run the start commands again. Your data is safe in `backend/aicc.db`.

### "Where is my data?"
`backend/aicc.db` - This is your SQLite database file. Keep it safe!

### "Can I backup my data?"
Yes! Copy `backend/aicc.db` to a safe location.

### "What if the backend crashes?"
Just restart it. Your data in `backend/aicc.db` is safe.

### "Do I need two terminals?"
Yes. The backend (Terminal 1) and frontend (Terminal 2) run separately. Each needs its own terminal.

### "Can I run it on production?"
Yes! See PERSISTENCE_GUIDE.md → Production Deployment

---

## 📁 File Structure

```
project-root/
├── backend/                    # Backend server
│   ├── package.json           # Backend dependencies
│   ├── server.js              # Express server
│   ├── aicc.db                # SQLite database (created on first run)
│   └── node_modules/          # Backend packages
│
├── src/                        # Frontend source
│   ├── api/
│   │   └── persistenceApi.ts   # Database API client
│   ├── personas/
│   │   └── store.tsx           # Updated with DB sync
│   └── vehicles/
│       └── store.tsx           # Updated with DB sync
│
├── .env                        # API configuration
├── package.json                # Frontend dependencies
└── Documentation/
    ├── QUICK_REFERENCE.md      # 👈 START HERE
    ├── DATABASE_SETUP.md        # Setup guide
    ├── PERSISTENCE_GUIDE.md     # Full documentation
    └── IMPLEMENTATION_SUMMARY.md # Technical details
```

---

## ⚡ Common Commands Quick Reference

```bash
# Setup (run once)
cd backend && npm install && cd ..
npm install
./setup.sh   # or setup.bat on Windows

# Running
cd backend && npm run dev        # Terminal 1 - Backend
npm run dev                      # Terminal 2 - Frontend

# Development
npm run lint                     # Check code
npm run build                    # Build for production

# Database management
rm backend/aicc.db              # Reset database
sqlite3 backend/aicc.db         # Browse database directly
```

---

## 🔄 Data Flow Architecture

```
React Components
        ↓
    Context Stores
    (Personas, Vehicles)
        ↓
  Persistence API
  (persistenceApi.ts)
        ↓
   Express Backend
   (server.js)
        ↓
SQLite Database (aicc.db)
```

---

## ✨ What You Get

| Feature | Before | After |
|---------|--------|-------|
| Data Persistence | ❌ localStorage only | ✅ SQLite database |
| Survive Restart | ❌ No | ✅ Yes |
| Professional | ❌ Basic | ✅ Production-ready |
| Scalability | ❌ Limited | ✅ Unlimited |
| API Ready | ❌ No | ✅ RESTful |
| Multi-device Ready | ❌ No | ✅ Yes (with deployment) |

---

## 🆘 Troubleshooting Quick Links

**Backend won't start?**
→ See PERSISTENCE_GUIDE.md → Troubleshooting → Backend fails to start

**Data not saving?**
→ See PERSISTENCE_GUIDE.md → Troubleshooting → Database not persisting

**Port already in use?**
→ See PERSISTENCE_GUIDE.md → Troubleshooting → Port already in use

**Need to reset?**
→ Run: `rm backend/aicc.db` then restart backend

---

## 🚀 Next Steps

1. **Read** → QUICK_REFERENCE.md or DATABASE_SETUP.md
2. **Run** → Follow the setup commands
3. **Test** → Create a persona/vehicle and restart
4. **Learn** → Read PERSISTENCE_GUIDE.md for full details
5. **Deploy** → When ready, see production section

---

## 📞 Support

- **Setup Issues?** → Check DATABASE_SETUP.md
- **How to use?** → Check PERSISTENCE_GUIDE.md  
- **What changed?** → Check IMPLEMENTATION_SUMMARY.md
- **Quick help?** → Check QUICK_REFERENCE.md

---

**You're all set!** Choose a documentation file above to get started. 🎉
