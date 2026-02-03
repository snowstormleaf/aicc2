# Installation Checklist

## ✅ Pre-Installation
- [ ] Node.js installed (v14+)
- [ ] npm installed
- [ ] Terminal/Command Prompt available
- [ ] Port 5173 available (frontend)
- [ ] Port 3001 available (backend)

## ✅ Backend Setup

### Step 1: Navigate to backend
```bash
cd backend
```
- [ ] Successfully changed to backend directory

### Step 2: Install dependencies
```bash
npm install
```
- [ ] npm installation completed without errors
- [ ] `node_modules` folder created in backend/
- [ ] `package-lock.json` created

### Step 3: Verify backend works
```bash
npm run dev
```
- [ ] No errors in startup
- [ ] See message: "Backend server running on http://localhost:3001"
- [ ] See message: "Database: .../backend/aicc.db"
- [ ] Check: `backend/aicc.db` file created

### Step 4: Stop backend
```
Ctrl+C
```
- [ ] Backend stopped cleanly
- [ ] Terminal ready for next command

### Step 5: Verify database persisted
```bash
ls -la backend/aicc.db   # macOS/Linux
dir backend\aicc.db      # Windows
```
- [ ] File exists and has size > 0

## ✅ Frontend Setup

### Step 1: Navigate to frontend
```bash
cd ..
```
- [ ] Back in project root (check you see `src/` folder)

### Step 2: Install dependencies (if not done)
```bash
npm install
```
- [ ] npm installation completed without errors
- [ ] `node_modules` folder created

### Step 3: Check .env file
```bash
cat .env    # or open in text editor
```
- [ ] File exists
- [ ] Contains: `VITE_API_URL=http://localhost:3001/api`

## ✅ Running the Application

### Terminal 1: Start Backend
```bash
cd backend
npm run dev
```
- [ ] Backend starts successfully
- [ ] No error messages
- [ ] Ready for connections

### Terminal 2: Start Frontend
```bash
npm run dev
```
- [ ] Frontend starts successfully
- [ ] Message shows local URL (http://localhost:5173)
- [ ] No error messages

### Open Browser
Go to `http://localhost:5173`
- [ ] Page loads
- [ ] No console errors (press F12)
- [ ] UI visible and responsive

## ✅ Functionality Test

### Test Personas
1. Click menu (hamburger icon) → Workspace → Personas
2. Click "New"
3. Enter persona name
4. Save
- [ ] Persona appears in list
- [ ] Check browser console (F12) → no errors
- [ ] Check Terminal 1 output → should show API calls

### Test Vehicles
1. Click menu → Workspace → Vehicles
2. Click "New"
3. Enter vehicle name
4. Save
- [ ] Vehicle appears in list
- [ ] Check browser console → no errors
- [ ] Check Terminal 1 output → should show API calls

### Test Persistence (Critical!)
1. Create a test persona or vehicle (if not done)
2. Note the name: _______________
3. Stop Backend (Terminal 1): Ctrl+C
4. Restart Backend: `cd backend && npm run dev`
5. Refresh Frontend (F5)
- [ ] Test item still appears! ✅
- [ ] This proves data persists!

### Test Workflow
1. Go to homepage
2. Select a persona
3. Select a vehicle
4. Upload features CSV (if you have one)
5. Run analysis
- [ ] No errors
- [ ] Results appear

## ✅ Verification Commands

### Check Backend API
```bash
curl http://localhost:3001/api/personas
curl http://localhost:3001/api/vehicles
```
- [ ] Returns JSON arrays
- [ ] Shows created items

### Check Database
```bash
sqlite3 backend/aicc.db
.tables
.exit
```
- [ ] Shows `personas` and `vehicles` tables
- [ ] No errors

## ✅ Common Issues - Check These First

- [ ] Both terminals running (backend & frontend)
- [ ] .env file has correct API_URL
- [ ] No firewall blocking localhost:3001
- [ ] Ports 5173 and 3001 not in use
- [ ] Node.js version is v14+
- [ ] Backend `node_modules` installed
- [ ] Frontend `node_modules` installed

## ✅ Documentation

- [ ] Read QUICK_REFERENCE.md
- [ ] Read DATABASE_SETUP.md
- [ ] Read PERSISTENCE_GUIDE.md if needed
- [ ] Bookmarked README_PERSISTENCE.md

## ✅ Production Readiness

- [ ] Data persists across restarts
- [ ] API endpoints working
- [ ] No console errors
- [ ] Database file exists and grows
- [ ] Ready for production deployment

---

## 🎉 Success!

If all checkboxes are complete, your AICC application now has:
- ✅ Persistent database storage
- ✅ Automatic data synchronization
- ✅ Professional backend API
- ✅ Production-ready setup

**Your data is safe! Even if you stop npm and restart, your data persists.** 🎉

---

## 📞 If Something Fails

1. **Note the error message**
2. **Check QUICK_REFERENCE.md → Troubleshooting**
3. **Check PERSISTENCE_GUIDE.md → Troubleshooting**
4. **Try the suggested solution**

## Next: Production Deployment

When ready to deploy, see:
**PERSISTENCE_GUIDE.md → Production Deployment**
