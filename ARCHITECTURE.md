# CarLogic Architecture

## Overview

The CarLogic application follows a three-tier architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT BROWSER                            │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/HTTPS
┌─────────────────────▼────────────────────────────────────────┐
│              APACHE HTTP SERVER (Port 80)                     │
│  ┌──────────────────────────────────────────────────────────┤
│  │ Frontend Static Files (/usr/local/apache2/htdocs)        │
│  │ - Serves HTML, CSS, JavaScript (React build)            │
│  │ - Routes: /*, /dashboard, /customers, etc.              │
│  └──────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┤
│  │ Reverse Proxy                                             │
│  │ - Routes /api/* → http://localhost:8000/api/*           │
│  └──────────────────────────────────────────────────────────┘
└────────────┬────────────────────────────────────────────────┘
             │ HTTP (Port 8000)
┌────────────▼────────────────────────────────────────────────┐
│         FASTAPI BACKEND (Uvicorn)                           │
│ - REST API endpoints at /api/*                             │
│ - JWT Authentication                                        │
│ - Connected to MongoDB                                      │
└────────────┬────────────────────────────────────────────────┘
             │ TCP (Port 27017)
┌────────────▼────────────────────────────────────────────────┐
│              MONGODB DATABASE                               │
│ - Collections: users, customers, products, etc.             │
│ - Stores application data                                   │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. Frontend (React)
- **Location**: `./frontend/`
- **Build**: Static HTML, CSS, JavaScript files
- **Built to**: `./frontend/build/`
- **Served by**: Apache HTTP Server
- **Environment**: `.env` file with `REACT_APP_BACKEND_URL`
- **API Access**: Via `/api` (reverse proxied to backend)

### 2. Backend (FastAPI)
- **Location**: `./backend/`
- **Framework**: FastAPI with Uvicorn
- **Port**: 8000
- **Entry Point**: `run_server.py` → `server.py`
- **Database**: MongoDB (asynchronous via Motor)
- **Routes**: All under `/api` prefix (e.g., `/api/auth/login`, `/api/customers`)
- **Authentication**: JWT tokens

### 3. Apache HTTP Server
- **Role**: Static file server + reverse proxy
- **Port**: 80
- **Configuration**: `carlogic.conf`
- **Functions**:
  - Serves frontend static files from `./frontend/build/`
  - Routes `/api/*` requests to backend on `localhost:8000`
  - Handles React client-side routing (SPA)
  - Gzip compression for static assets
  - Cache headers for optimal performance

### 4. MongoDB
- **Role**: Data persistence
- **Connection**: `mongodb://localhost:27017`
- **Database**: `carwash_db`
- **Access**: From backend only (not exposed to frontend)

## Deployment Options

### Option 1: Docker Compose (Recommended)
All services in containers, easy to deploy:
```bash
docker-compose up --build
```

Services:
- `mongodb`: Standalone MongoDB container
- `backend`: FastAPI backend
- `apache`: Apache HTTP Server

### Option 2: Manual Installation

#### Prerequisites
- Python 3.11+
- Node.js 18+
- MongoDB 6.0+
- Apache 2.4+

#### Steps

1. **Build Frontend**
```bash
cd frontend
npm install
npm run build
```

2. **Setup Backend**
```bash
cd backend
pip install -r requirements.txt
python run_server.py
```

3. **Configure Apache**
- Copy `carlogic.conf` to Apache conf/extra/
- Update DocumentRoot path in `carlogic.conf`
- Enable required modules (rewrite, proxy, proxy_http, headers)
- Restart Apache

4. **Start MongoDB**
```bash
mongod --dbpath /path/to/data
```

## API Communication Flow

1. **Client Request**: Browser sends request to `http://localhost/`
2. **Apache Decision**:
   - If path is `/api/*` → reverse proxy to `http://localhost:8000/api/*`
   - Otherwise → serve static file from `./frontend/build/`
3. **Backend Processing**: FastAPI processes request and returns JSON
4. **Response**: Apache returns response to client
5. **Client-side Routing**: React Router handles navigation (via `/index.html` fallback)

## Configuration Files

### `backend/.env`
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=carwash_db
JWT_SECRET=your-secret-key-change-in-production
CORS_ORIGINS=http://localhost,http://127.0.0.1,http://localhost:80,http://localhost:8000
```

### `frontend/.env`
```env
REACT_APP_BACKEND_URL=http://localhost:8000
```
(Changed to `/api` base URL when going through Apache reverse proxy)

### `carlogic.conf` (Apache VirtualHost)
- Serves frontend from `frontend/build/`
- Proxies `/api/*` to backend
- Handles React Router SPA routing
- Compression and caching enabled

## Key Architectural Decisions

1. **Apache as Reverse Proxy**: Separates frontend delivery from backend logic, allows for:
   - Efficient static file serving
   - Load balancing (future)
   - SSL/TLS termination (future)
   - Unified domain entry point

2. **FastAPI Backend**: Modern async Python framework
   - Built-in OpenAPI documentation
   - Async support for MongoDB operations
   - JWT authentication
   - Pydantic validation

3. **MongoDB**: Document database
   - Flexible schema
   - Horizontal scaling capability
   - Async support via Motor driver

4. **React SPA**: Client-side routing with server-side fallback
   - Fast navigation between pages
   - Apache fallback to `index.html` for all non-file routes

## Development vs Production

### Development
- **Frontend**: `npm start` on port 3000 (hot reload)
- **Backend**: `python run_server.py` on port 8000
- **Apache**: Not needed (direct API access in frontend `.env`)
- **MongoDB**: Local instance

### Production
- **Frontend**: Built and served by Apache
- **Backend**: Uvicorn running on port 8000 (behind Apache)
- **Apache**: Reverse proxy on port 80
- **MongoDB**: Production instance with authentication
- **HTTPS**: Apache handles SSL/TLS termination

## Database Schema

Collections in MongoDB:
- `users` - Application users (admin, manager, staff)
- `customers` - Car wash customers
- `products` - Services/products offered
- `categories` - Product categories
- `taxes` - Tax rates
- `zones` - Car wash zones/bays
- `bookings` - Customer bookings/appointments
- `invoices` - Payment invoices

## Security Notes

1. **JWT Secret**: Change `JWT_SECRET` in production
2. **MongoDB**: Enable authentication in production
3. **CORS**: Limited to localhost/Apache server origin
4. **API Routes**: All protected with JWT authentication (except login)
5. **HTTPS**: Configure Apache with SSL certificates in production

## Scaling Considerations

Future improvements:
- Multiple backend instances behind Apache load balancing
- MongoDB replica set for high availability
- Redis caching layer
- CDN for static assets
- API rate limiting
- Request logging and monitoring
