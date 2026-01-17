# External Network Hosting Configuration Guide

This guide explains how to configure CarLogic for access from other systems on a network.

## Overview

The application needs to be configured so that:
1. Frontend is accessible via the system's IP address or hostname (not just localhost)
2. Backend API is accessible to the reverse proxy
3. MongoDB is accessible to the backend
4. CORS allows requests from the actual network address

## Quick Start (Docker Compose)

Docker Compose is the easiest method for network access:

```bash
# 1. Build frontend
cd frontend
npm install
npm run build
cd ..

# 2. Start services
docker-compose up --build

# 3. Access from any system on the network:
#    http://<server-ip>
#    http://<server-hostname>
#    http://localhost (from the server itself)
```

### Why Docker Compose Works for External Access

- Internal Docker DNS resolves `backend` to the backend service
- Apache uses `backend:8000` for proxying (not `localhost:8000`)
- All services are on the same Docker network
- Ports are exposed: 80 (Apache), 8000 (Backend), 27017 (MongoDB)

## Manual Setup (Linux)

### Prerequisites
- Apache 2.4 with modules: proxy, proxy_http, rewrite, headers, expires
- FastAPI backend on port 8000
- MongoDB on port 27017
- Frontend built at: `/var/www/carlogic/frontend/build`

### Configuration Steps

#### 1. Apache Configuration

Edit `/etc/apache2/sites-available/carlogic.conf`:

```apache
<VirtualHost *:80>
    ServerName carlogic.local
    ServerAlias 192.168.x.x carlogic
    DocumentRoot "/var/www/carlogic/frontend/build"
    
    <Directory "/var/www/carlogic/frontend/build">
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
        
        <IfModule mod_rewrite.c>
            RewriteEngine On
            RewriteBase /
            RewriteRule ^index\.html$ - [L]
            RewriteCond %{REQUEST_FILENAME} !-f
            RewriteCond %{REQUEST_FILENAME} !-d
            RewriteRule . /index.html [L]
        </IfModule>
    </Directory>

    # Key: Use actual backend IP/hostname here
    <Location /api>
        ProxyPass http://localhost:8000/api
        ProxyPassReverse http://localhost:8000/api
        ProxyPreserveHost On
        RequestHeader set X-Forwarded-For %{REMOTE_ADDR}s
        RequestHeader set X-Forwarded-Proto http
        RequestHeader set X-Forwarded-Host %{HTTP_HOST}s
    </Location>
</VirtualHost>
```

**Important**: Replace:
- `ServerAlias 192.168.x.x` with your actual server IP
- `ProxyPass http://localhost:8000/api` with your backend address:
  - Same machine: `localhost:8000`
  - Different machine: `192.168.x.x:8000` or `backend-hostname:8000`

#### 2. Enable Apache Configuration

```bash
sudo a2ensite carlogic
sudo a2dissite 000-default  # Optional: disable default site
sudo apache2ctl configtest  # Verify syntax
sudo systemctl restart apache2
```

#### 3. Verify Access

```bash
# From the server itself
curl http://localhost
curl http://127.0.0.1

# From another system on the network
curl http://<server-ip>
curl http://<server-hostname>
```

## Manual Setup (Windows)

### Prerequisites
- Apache 2.4 from apachelounge.com
- FastAPI backend running on port 8000
- MongoDB running on port 27017
- Frontend built at: `C:\path\to\frontend\build`

### Configuration Steps

#### 1. Edit Apache Configuration

Edit `C:\Apache24\conf\httpd.conf`:

Ensure these modules are loaded:
```apache
LoadModule proxy_module modules/mod_proxy.so
LoadModule proxy_http_module modules/mod_proxy_http.so
LoadModule rewrite_module modules/mod_rewrite.so
LoadModule headers_module modules/mod_headers.so
Include conf/extra/carlogic.conf
```

Create/edit `C:\Apache24\conf\extra\carlogic.conf`:

```apache
<VirtualHost *:80>
    ServerName localhost
    ServerAlias 127.0.0.1 <your-hostname>
    DocumentRoot "C:/path/to/frontend/build"
    
    <Directory "C:/path/to/frontend/build">
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
        
        <IfModule mod_rewrite.c>
            RewriteEngine On
            RewriteBase /
            RewriteRule ^index\.html$ - [L]
            RewriteCond %{REQUEST_FILENAME} !-f
            RewriteCond %{REQUEST_FILENAME} !-d
            RewriteRule . /index.html [L]
        </IfModule>
    </Directory>

    <Location /api>
        ProxyPass http://localhost:8000/api
        ProxyPassReverse http://localhost:8000/api
        ProxyPreserveHost On
        RequestHeader set X-Forwarded-For %{REMOTE_ADDR}s
        RequestHeader set X-Forwarded-Proto http
        RequestHeader set X-Forwarded-Host %{HTTP_HOST}s
    </Location>
</VirtualHost>
```

#### 2. Test and Start Apache

```cmd
# Test configuration
C:\Apache24\bin\httpd.exe -t

# Start Apache (as Administrator)
C:\Apache24\bin\httpd.exe -k start

# Or install as service
C:\Apache24\bin\httpd.exe -k install
C:\Apache24\bin\httpd.exe -k start
```

#### 3. Verify Access

From another system on the network:
```
http://<your-system-ip>
http://<your-computer-name>
```

## Backend Configuration for External Access

### Python Backend (.env)

The backend's `backend/.env` needs to include all possible origins:

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=carwash_db
CORS_ORIGINS=http://localhost,http://127.0.0.1,http://localhost:80,http://localhost:8000,http://apache,http://<server-ip>,http://<server-hostname>
```

### Docker Compose Backend

In `docker-compose.yml`, the backend service CORS is already configured for internal Docker DNS:

```yaml
environment:
  CORS_ORIGINS: http://localhost,http://127.0.0.1,http://localhost:80,http://localhost:8000,http://apache,http://0.0.0.0:80,http://0.0.0.0:8000
```

## Frontend Configuration for External Access

### Frontend .env File

The frontend `frontend/.env` determines how the browser contacts the backend:

#### For Docker Compose (recommended)
```env
REACT_APP_BACKEND_URL=http://localhost:8000
```
The frontend will contact `http://localhost:8000/api`, and Apache's reverse proxy will handle routing.

#### For Manual Setup on Same Machine
```env
REACT_APP_BACKEND_URL=http://localhost:8000
```

#### For Manual Setup on Different Machines
```env
REACT_APP_BACKEND_URL=http://<backend-ip>:8000
```

#### For Access via Hostname
```env
REACT_APP_BACKEND_URL=http://<backend-hostname>:8000
```

## Network Access Flow

```
External Client
    ↓ HTTP to :80
System's Apache Server
    ├─ Static Files: frontend/build/*
    ├─ SPA Routes: Fallback to index.html
    └─ /api Routes: ProxyPass to :8000
        ↓ HTTP to :8000
Backend Service (Uvicorn)
    └─ API Endpoints
        ↓ Connect to
MongoDB :27017
```

## Troubleshooting

### Cannot Connect to Frontend from Another System

**Check**:
1. Is Apache running? `systemctl status apache2` or Services panel
2. Is port 80 open? `netstat -an | grep :80`
3. Can you access from localhost? `curl http://localhost`
4. Is the firewall blocking port 80?

**Fix**:
```bash
# Linux: Open firewall
sudo ufw allow 80/tcp
sudo ufw allow 8000/tcp

# Windows: Firewall should auto-prompt when Apache starts
```

### API Requests Fail

**Check**:
1. Is backend running? `curl http://localhost:8000/docs`
2. Is Apache reverse proxy configured? Check `ProxyPass` line
3. Are CORS origins correct? Check `CORS_ORIGINS` in backend/.env

**Fix**:
- Update `CORS_ORIGINS` to include the client's address
- Update `ProxyPass` to point to correct backend address
- Verify backend is listening on correct port: `netstat -an | grep :8000`

### Hostname Not Resolving

**Check**:
1. Can you ping the hostname? `ping <hostname>`
2. Is it in DNS or hosts file?

**Fix**:
- Add to hosts file:
  - Linux/Mac: `/etc/hosts` → `192.168.x.x carlogic.local`
  - Windows: `C:\Windows\System32\drivers\etc\hosts`
- Or use IP address directly: `http://192.168.x.x`

### Port Already in Use

**Check**:
- `netstat -an | grep :80` (port 80)
- `netstat -an | grep :8000` (port 8000)

**Fix**:
- Kill the process using the port
- Or configure to use different port

## Security Considerations

### For Production Network Access

1. **Firewall**: Only expose necessary ports (80 for HTTP)
2. **SSL/TLS**: Use HTTPS in production (port 443)
3. **CORS**: Restrict to known origins, not wildcard
4. **Authentication**: JWT tokens already implemented
5. **MongoDB**: Should not be exposed publicly (port 27017)
6. **Network Segmentation**: Place database on separate network

### CORS Configuration

**Do NOT use**:
```env
CORS_ORIGINS=*  # Accepts requests from anywhere
```

**Do use**:
```env
CORS_ORIGINS=http://192.168.1.100,http://myapp.example.com
```

## Verification Checklist

- [ ] Frontend loads from system IP/hostname
- [ ] API endpoints respond from client system
- [ ] No CORS errors in browser console
- [ ] No "localhost" in network requests (DevTools Network tab)
- [ ] Database has data and backend is using it
- [ ] All three services (Apache, Backend, MongoDB) are running
- [ ] Firewall allows ports 80 and 8000

## Files Modified for External Access

1. **carlogic.conf** - Updated hostname and proxy configuration
2. **frontend/.env** - Backend URL (may need updating per deployment)
3. **backend/.env** - CORS origins extended
4. **docker-compose.yml** - Backend CORS configuration

## Setup Scripts

Two helper scripts are provided:

- **setup_external_hosting.sh** (Linux) - Interactive setup wizard
- **setup_external_hosting.bat** (Windows) - Interactive setup wizard

Run either script for guided configuration.
