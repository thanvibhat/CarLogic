# CarLogic Setup Verification Checklist

## Quick Setup Guide

Follow these steps to set up the CarLogic application with the Apache + FastAPI + MongoDB architecture.

---

## PHASE 1: Pre-Deployment Checks

### Code Review (Already Verified ✓)
- [x] Frontend: React application with axios API client
- [x] Backend: FastAPI with all routes under `/api` prefix
- [x] Database: MongoDB connection via Motor async driver
- [x] Authentication: JWT tokens for session management
- [x] Environment: All services use `.env` files for configuration

### Current Configuration Status
- [x] `frontend/.env` exists with `REACT_APP_BACKEND_URL`
- [x] `backend/.env` exists with MongoDB and JWT configuration
- [x] CORS middleware configured to accept specified origins
- [x] API routes all use `/api` prefix (verified 20+ routes)
- [x] MongoDB connection string configured

---

## PHASE 2: Build Frontend

### Steps
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Build for production (creates static files)
npm run build

# Verify build output
ls -la build/
# Should show: index.html, static/ folder with css/ and js/
```

### Verification
- [ ] No errors during `npm install`
- [ ] No errors during `npm run build`
- [ ] `frontend/build/index.html` exists
- [ ] `frontend/build/static/` contains CSS and JavaScript

---

## PHASE 3: Prepare Backend

### Steps
```bash
# Navigate to backend directory
cd backend

# Create Python virtual environment (optional but recommended)
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Verify installation
pip list | grep fastapi
pip list | grep motor
pip list | grep pymongo
```

### Verification
- [ ] No errors during `pip install -r requirements.txt`
- [ ] FastAPI is installed
- [ ] Motor is installed
- [ ] PyMongo is installed
- [ ] Uvicorn is installed
- [ ] python-dotenv is installed

### Test Backend Startup
```bash
python run_server.py
# Should print something like: "Uvicorn running on http://0.0.0.0:8000"
```

- [ ] Backend starts without errors
- [ ] Can access `http://localhost:8000/docs` in browser (FastAPI auto-generated docs)

---

## PHASE 4: MongoDB Setup

### Requirements
- MongoDB 6.0 or higher installed and running

### Steps

#### Option A: Local MongoDB (Linux)
```bash
# Install MongoDB
sudo apt-get install -y mongodb-org

# Start service
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify it's running
mongo --eval "db.adminCommand('ping')"
```

#### Option B: Local MongoDB (Windows)
```bash
# Download and install from mongodb.com
# Start MongoDB service from Services or manually:
mongod --dbpath "C:\path\to\data"
```

#### Option C: Docker MongoDB
```bash
docker run -d -p 27017:27017 --name carlogic_mongodb mongo:7.0
```

### Verification
```bash
# Test connection
mongo --eval "db.adminCommand('ping')"
# Should respond with: {"ok": 1.0}
```

- [ ] MongoDB is running
- [ ] Connection string `mongodb://localhost:27017` works
- [ ] Database `carwash_db` will be created automatically on first insert

### Seed Initial Data (Optional)
```bash
cd scripts
python seed_data.py
```

- [ ] Database is populated with initial data (users, customers, categories, etc.)

---

## PHASE 5A: Docker Compose Deployment (Recommended)

### Prerequisites
- Docker 20.10+
- Docker Compose 2.0+
- Frontend already built (Phase 2 completed)

### Steps
```bash
# From project root
docker-compose up --build

# Wait for all services to start
# Should see: "apache | AH00094: Command line: 'httpd -D FOREGROUND'"
```

### Verification
- [ ] All three services start without errors: mongodb, backend, apache
- [ ] Frontend is accessible at `http://localhost`
- [ ] Backend API is accessible at `http://localhost:8000/docs`
- [ ] API through Apache proxy: `http://localhost/api` responds
- [ ] Can login with default credentials (admin@carlogic.com / admin123)

### Stop Services
```bash
docker-compose down
# Use -v to also remove data volumes: docker-compose down -v
```

---

## PHASE 5B: Manual Deployment (Linux)

### Step 1: Install Apache
```bash
sudo apt-get install -y apache2

# Enable required modules
sudo a2enmod rewrite
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod headers
sudo a2enmod expires
sudo a2enmod deflate
```

### Step 2: Configure Apache VirtualHost
```bash
# Copy configuration
sudo cp carlogic.conf /etc/apache2/sites-available/

# Edit the file to set correct DocumentRoot path:
sudo nano /etc/apache2/sites-available/carlogic.conf
# Change: DocumentRoot "/path/to/CarLogic/frontend/build"

# Enable the site
sudo a2ensite carlogic
sudo a2dissite 000-default  # Optional: disable default site

# Verify configuration
sudo apache2ctl configtest
# Should output: Syntax OK

# Restart Apache
sudo systemctl restart apache2
```

### Step 3: Start MongoDB
```bash
sudo systemctl start mongod
sudo systemctl enable mongod
```

### Step 4: Start Backend
```bash
cd backend
python run_server.py
# Keep this running in a terminal or use systemd/supervisor
```

### Verification
- [ ] Apache configuration is valid (Syntax OK)
- [ ] Apache service is running: `systemctl status apache2`
- [ ] MongoDB service is running: `systemctl status mongod`
- [ ] Backend is running: `http://localhost:8000/docs` accessible
- [ ] Frontend accessible at `http://localhost`
- [ ] API reverse proxy working: `http://localhost/api/auth/me` 
- [ ] Login works with default credentials

---

## PHASE 5C: Manual Deployment (Windows)

### Step 1: Install Apache
1. Download Apache 2.4 from apachelounge.com
2. Extract to `C:\Apache24`
3. Open Command Prompt as Administrator:
   ```cmd
   cd C:\Apache24\bin
   httpd.exe -k install
   ```

### Step 2: Configure Apache
```cmd
# Copy configuration file
copy carlogic.conf C:\Apache24\conf\extra\

# Edit to set correct paths:
# DocumentRoot "C:\Users\DELL\Downloads\CarLogic\frontend\build"
# <Directory "C:\Users\DELL\Downloads\CarLogic\frontend\build">
```

### Step 3: Update Apache httpd.conf
Open `C:\Apache24\conf\httpd.conf`:
- Uncomment or add: `Include conf/extra/carlogic.conf`
- Ensure all required modules are loaded

### Step 4: Start MongoDB
```cmd
mongod --dbpath "C:\path\to\data"
# Keep this window open or use MongoDB as service
```

### Step 5: Start Backend
```cmd
cd backend
python run_server.py
# Keep this window open
```

### Step 6: Start Apache
```cmd
# From C:\Apache24\bin as Administrator
httpd.exe -k start
```

### Verification
- [ ] Apache started without errors
- [ ] MongoDB is running
- [ ] Backend is running
- [ ] Frontend accessible at `http://localhost`
- [ ] API accessible at `http://localhost/api`
- [ ] Can login with default credentials

---

## PHASE 6: Testing

### API Endpoint Tests
```bash
# Test login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@carlogic.com","password":"admin123"}'

# Should return JWT token

# Test protected endpoint with token
curl -X GET http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Should return user data
```

### Frontend Tests
- [ ] Load page: `http://localhost`
- [ ] See login form
- [ ] Login with admin@carlogic.com / admin123
- [ ] Redirect to dashboard
- [ ] Navigate to Customers page
- [ ] Navigate to Products page
- [ ] Navigate to other sections
- [ ] Check browser console for errors (press F12)
- [ ] Check browser Network tab - API requests should go to `/api/*`

### Reverse Proxy Tests
```bash
# Direct to backend
curl -X GET http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer TOKEN"

# Through Apache reverse proxy
curl -X GET http://localhost/api/auth/me \
  -H "Authorization: Bearer TOKEN"

# Both should return same result
```

- [ ] Direct API calls work
- [ ] Reverse proxy API calls work
- [ ] Both return identical responses

---

## PHASE 7: Production Setup (Checklist)

### Security
- [ ] Change `JWT_SECRET` in `backend/.env` to a unique random string
- [ ] Enable MongoDB authentication and update connection string
- [ ] Configure SSL/TLS certificates in Apache
- [ ] Set `CORS_ORIGINS` to only your domain
- [ ] Remove debug mode if enabled
- [ ] Keep all dependencies updated: `pip list --outdated`

### Performance
- [ ] Gzip compression is enabled in Apache (in carlogic.conf)
- [ ] Browser caching headers are set (in carlogic.conf)
- [ ] Database indexes are created on frequently queried fields
- [ ] Consider setting up CDN for static assets

### Monitoring
- [ ] Configure log rotation for Apache error/access logs
- [ ] Set up monitoring for service availability
- [ ] Monitor disk space (especially MongoDB data)
- [ ] Monitor CPU and memory usage
- [ ] Set up alerts for critical errors

### Backups
- [ ] MongoDB backups scheduled daily
- [ ] Backups stored in separate location
- [ ] Test backup restoration process
- [ ] Document recovery procedures

### Maintenance
- [ ] Document deployment procedures
- [ ] Document rollback procedures
- [ ] Plan for scaling (load balancing, replication)
- [ ] Keep administrative documentation updated

---

## PHASE 8: Troubleshooting

### Issue: "Cannot GET /api/customers"
**Cause**: Apache reverse proxy not working or backend not running

**Solution**:
```bash
# Check backend is running
curl http://localhost:8000/docs

# Check Apache configuration
apache2ctl configtest

# Check Apache is proxying
curl -v http://localhost/api/customers
# Look for X-Forwarded headers in output
```

### Issue: "CORS error" in browser console
**Cause**: Frontend origin not in CORS_ORIGINS

**Solution**:
1. Check current origin: Open browser DevTools → look at request headers
2. Add to `backend/.env`: `CORS_ORIGINS=http://your-origin,...`
3. Restart backend service

### Issue: Frontend shows "Cannot find module"
**Cause**: Frontend not built or wrong path

**Solution**:
```bash
cd frontend
npm install
npm run build
# Verify build/ folder exists and has index.html
```

### Issue: MongoDB "connection refused"
**Cause**: MongoDB not running or wrong connection string

**Solution**:
```bash
# Check if MongoDB is running
# Linux: sudo systemctl status mongod
# Windows: Check Services or run: mongod

# Check connection string in backend/.env
grep MONGO_URL backend/.env
# Should be: mongodb://localhost:27017
```

### Issue: "Port already in use"
**Cause**: Service already running on that port

**Solution**:
```bash
# Linux: Find process using port 8000
lsof -i :8000
# Kill it: kill -9 <PID>

# Windows: Find process using port 8000
netstat -ano | findstr :8000
# Kill it: taskkill /PID <PID> /F

# For Apache port 80: check if another service is using it
```

---

## Verification Checklist - Final

- [ ] Frontend builds without errors
- [ ] Frontend static files exist in `frontend/build/`
- [ ] Backend starts without errors
- [ ] Backend API docs accessible at `http://localhost:8000/docs`
- [ ] MongoDB is running and accessible
- [ ] Database connection works
- [ ] Apache is configured and running
- [ ] Apache reverse proxy routes `/api/*` to backend
- [ ] Frontend is accessible at `http://localhost`
- [ ] Can login with default credentials
- [ ] Can navigate between pages
- [ ] API requests work through Apache reverse proxy
- [ ] No errors in browser console
- [ ] No errors in Apache logs
- [ ] No errors in backend logs
- [ ] All three services (MongoDB, Backend, Apache) are running

---

## Quick Reference - URLs

- **Frontend**: `http://localhost`
- **Backend API**: `http://localhost:8000/api`
- **API Documentation**: `http://localhost:8000/docs`
- **MongoDB**: `mongodb://localhost:27017`

## Quick Reference - Default Credentials

- **Admin**: `admin@carlogic.com` / `admin123`
- **Manager**: `manager@carlogic.com` / `manager123`
- **Staff**: `staff@carlogic.com` / `staff123`

## Quick Reference - Important Files

- **Frontend config**: `frontend/.env`
- **Backend config**: `backend/.env`
- **Apache config**: `carlogic.conf`
- **Docker compose**: `docker-compose.yml`
- **Architecture docs**: `ARCHITECTURE.md`
- **Deployment guide**: `DEPLOYMENT.md`
- **Configuration guide**: `CONFIGURATION.md`
