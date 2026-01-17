# Configuration Summary for CarLogic

## Current Setup Status

This document summarizes the configuration required for the Apache + FastAPI + MongoDB architecture.

---

## Files Created/Modified

### 1. **frontend/.env** (Modified)
- **Location**: `frontend/.env`
- **Purpose**: React environment variables
- **Content**:
  ```env
  REACT_APP_BACKEND_URL=http://localhost:8000
  ```
- **Usage**: 
  - In development: Points directly to FastAPI backend
  - In production: Can be changed to `http://localhost/api` if accessing through Apache

### 2. **backend/.env** (Modified)
- **Location**: `backend/.env`
- **Purpose**: FastAPI backend configuration
- **Changes Made**:
  - Updated `CORS_ORIGINS` from `http://localhost:3000` to include backend and Apache ports
  - Current: `http://localhost,http://127.0.0.1,http://localhost:80,http://localhost:8000`
- **Note**: Remove `http://localhost:3000` since frontend is now served by Apache, not React dev server

### 3. **carlogic.conf** (Created)
- **Location**: `carlogic.conf`
- **Purpose**: Apache VirtualHost configuration
- **Key Features**:
  - Serves static frontend files from `frontend/build/`
  - Reverse proxies `/api/*` routes to FastAPI backend on port 8000
  - Handles React Router SPA routing (404 → index.html)
  - Gzip compression enabled
  - Browser caching for static assets
  - WebSocket proxy support (for future use)
- **Deployment**:
  - Linux: Copy to `/etc/apache2/sites-available/carlogic.conf`
  - Windows: Copy to `C:\Apache24\conf\extra\carlogic.conf`

### 4. **httpd.conf** (Created)
- **Location**: `httpd.conf` (for Docker)
- **Purpose**: Apache main configuration for Docker container
- **Includes**:
  - All required module loadings
  - Virtual host include directive
  - Simplified setup for containerization

### 5. **docker-compose.yml** (Created)
- **Location**: `docker-compose.yml`
- **Purpose**: Complete containerized deployment
- **Services**:
  - `mongodb`: MongoDB 7.0 with persistent volumes
  - `backend`: FastAPI service with environment variables
  - `apache`: Apache HTTP Server serving frontend and reverse proxying
- **Networks**: Services connected via internal bridge network
- **Volumes**: MongoDB data persistence

### 6. **backend/Dockerfile** (Created)
- **Location**: `backend/Dockerfile`
- **Purpose**: Docker image for FastAPI backend
- **Base Image**: `python:3.11-slim`
- **Includes**:
  - System dependencies installation
  - Python requirements installation
  - Application code copying
  - Uvicorn startup command

### 7. **backend/.dockerignore** (Created)
- **Location**: `backend/.dockerignore`
- **Purpose**: Exclude unnecessary files from Docker build
- **Excludes**: Python cache, git files, logs, tests, etc.

### 8. **ARCHITECTURE.md** (Created)
- **Location**: `ARCHITECTURE.md`
- **Purpose**: Detailed architecture documentation
- **Includes**:
  - System diagram
  - Component descriptions
  - Deployment options
  - API communication flow
  - Configuration details
  - Scaling considerations

### 9. **DEPLOYMENT.md** (Created)
- **Location**: `DEPLOYMENT.md`
- **Purpose**: Step-by-step deployment guide
- **Covers**:
  - Docker Compose quick start
  - Manual Linux deployment
  - Manual Windows deployment
  - Production checklist
  - Troubleshooting guide
  - Update procedures

### 10. **frontend/.env.example** (Created)
- **Location**: `frontend/.env.example`
- **Purpose**: Template for frontend environment variables
- **Useful for**: New developers, environment setup reference

---

## Architecture Changes

### What Changed
1. **Frontend delivery**: From React dev server (port 3000) → Apache static files (port 80)
2. **API access**: From direct to backend (port 8000) → Through Apache reverse proxy
3. **CORS configuration**: From allowing `localhost:3000` → Allowing localhost and port 80/8000
4. **Deployment**: From manual dev setup → Docker Compose for standardization

### What Stayed the Same
1. **Backend**: Still FastAPI with Uvicorn on port 8000
2. **Database**: Still MongoDB connection via Motor
3. **API endpoints**: All routes still use `/api` prefix
4. **Authentication**: JWT tokens still used
5. **Business logic**: No changes to existing code

---

## Key Architectural Points

### 1. Static File Serving
- Frontend is built once with `npm run build`
- Apache serves these static files directly (no hot reload)
- All non-file requests fall back to `index.html` for React Router

### 2. Reverse Proxy
- All requests to `/api/*` are forwarded to FastAPI backend
- Backend doesn't need to serve static files
- Apache handles transparent proxying with proper headers

### 3. MongoDB Connection
- Backend connects directly to MongoDB (not exposed)
- Connection string in `backend/.env`
- No frontend access to database

### 4. Environment Configuration
- Each service reads from its own `.env` file
- Docker Compose can override with environment variables
- Production: Use `.env` or environment variables (never hardcode)

---

## Pre-Deployment Verification Checklist

### Frontend
- [ ] `npm run build` completes successfully
- [ ] `frontend/build/` directory exists and contains `index.html`
- [ ] `.env` file exists with `REACT_APP_BACKEND_URL` set

### Backend
- [ ] `pip install -r requirements.txt` completes without errors
- [ ] `.env` file exists with all required variables
- [ ] `python run_server.py` starts without errors
- [ ] API is accessible at `http://localhost:8000/docs`

### MongoDB
- [ ] MongoDB service is running
- [ ] Connection string in `.env` is correct
- [ ] Database `carwash_db` can be accessed

### Apache
- [ ] Apache modules are installed: rewrite, proxy, proxy_http, headers, expires, deflate
- [ ] `carlogic.conf` has correct paths for DocumentRoot
- [ ] Apache config syntax is valid: `apache2ctl configtest` returns OK
- [ ] Apache can access `frontend/build/` directory

### Docker (if using Docker Compose)
- [ ] Docker and Docker Compose are installed
- [ ] Frontend is built before running compose
- [ ] Ports 80, 8000, 27017 are available (or mapped)
- [ ] `docker-compose up` starts all services successfully

---

## Production Considerations

### Security
1. Change `JWT_SECRET` in `backend/.env` to a strong random string
2. Enable MongoDB authentication and update connection string
3. Configure SSL/TLS in Apache (use Let's Encrypt)
4. Restrict `CORS_ORIGINS` to your domain only
5. Keep all dependencies updated

### Performance
1. Enable gzip compression (done in `carlogic.conf`)
2. Set browser caching headers (done in `carlogic.conf`)
3. Use HTTPS/HTTP2 in Apache
4. Consider CDN for static assets
5. Monitor and optimize database queries

### Reliability
1. Use process manager for backend (systemd, supervisor, or similar)
2. Enable MongoDB backup and replication
3. Set up health checks and monitoring
4. Configure log rotation
5. Test disaster recovery procedures

---

## Common Tasks

### Rebuild Frontend
```bash
cd frontend
npm run build
# Apache will serve the new files
```

### Restart Backend
```bash
# If running manually
pkill -f "uvicorn server"
python backend/run_server.py

# If using Docker
docker-compose restart backend
```

### View Logs
```bash
# Docker Compose
docker-compose logs -f backend
docker-compose logs -f apache
docker-compose logs -f mongodb

# Manual Apache logs
tail -f /var/log/apache2/carlogic_access.log
tail -f /var/log/apache2/carlogic_error.log
```

### Test API Endpoint
```bash
curl -X GET http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Or through Apache reverse proxy
curl -X GET http://localhost/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Notes

- All paths in `carlogic.conf` should be absolute paths
- MongoDB data is persisted in Docker volumes or local directory
- Frontend must be built before deploying (static files required)
- CORS middleware in backend is still active for API protection
- All three services must be running for the application to work
