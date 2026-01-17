# External Network Access - Verification Checklist

Complete this checklist to verify the application is properly configured for network access.

---

## Pre-Deployment Checklist

### Configuration Files
- [ ] `carlogic.conf` - Updated with `_default_` ServerName and `*` ServerAlias
- [ ] `carlogic.conf` - ProxyPass updated to use `backend:8000` (for Docker)
- [ ] `backend/.env` - CORS_ORIGINS extended with `http://apache` and `http://0.0.0.0:*`
- [ ] `docker-compose.yml` - Backend CORS_ORIGINS environment updated
- [ ] Frontend `.env` - Present and contains `REACT_APP_BACKEND_URL`

### Dependencies
- [ ] Frontend built: `frontend/build/index.html` exists
- [ ] Backend requirements installed: `pip list | grep fastapi`
- [ ] Docker installed (if using Docker Compose): `docker --version`
- [ ] MongoDB available: `mongod --version` or Docker image ready

---

## Docker Compose Deployment

### Pre-Launch
- [ ] Frontend built: `npm run build` completed successfully
- [ ] docker-compose.yml present and valid
- [ ] Docker daemon running: `docker ps` works
- [ ] Ports 80, 8000, 27017 not in use

### Launch
```bash
docker-compose up --build
```

- [ ] All three services start without errors
- [ ] No port conflicts reported
- [ ] Services reach healthy state:
  - [ ] apache container running
  - [ ] backend container running
  - [ ] mongodb container running and healthy

### Verification

**From the server itself**:
```bash
# Frontend
curl http://localhost
# Should return HTML

# Backend
curl http://localhost:8000/docs
# Should return FastAPI documentation

# MongoDB
mongo --eval "db.adminCommand('ping')"
# Should return { ok: 1 }
```

- [ ] Frontend accessible at http://localhost
- [ ] Backend docs accessible at http://localhost:8000/docs
- [ ] MongoDB responds to ping command

**From another system on the same network**:

First, find the server IP:
```bash
# On server
hostname -I  # Linux
ipconfig     # Windows
```

Then from another system:
```bash
curl http://<server-ip>
```

- [ ] Frontend loads from server IP address
- [ ] Frontend loads from server hostname
- [ ] No "connection refused" or "timeout" errors

---

## Manual Linux Deployment

### Apache Configuration
- [ ] `/etc/apache2/sites-available/carlogic.conf` created or updated
- [ ] DocumentRoot path points to correct location: `/var/www/carlogic/frontend/build`
- [ ] ProxyPass configured: `http://localhost:8000/api` (or actual backend IP)
- [ ] Module configuration verified:
  - [ ] `a2enmod proxy`
  - [ ] `a2enmod proxy_http`
  - [ ] `a2enmod rewrite`
  - [ ] `a2enmod headers`

### Apache Startup
```bash
sudo apache2ctl configtest
```
- [ ] Output shows: "Syntax OK"

```bash
sudo systemctl restart apache2
```
- [ ] Apache restarts without errors
- [ ] No "port already in use" errors

### Services Running
- [ ] Apache running: `systemctl status apache2 | grep running`
- [ ] Backend running: `curl http://localhost:8000/docs` returns response
- [ ] MongoDB running: `systemctl status mongod | grep running`

### Firewall Configuration
```bash
sudo ufw allow 80/tcp
sudo ufw allow 8000/tcp
```
- [ ] Port 80 allowed
- [ ] Port 8000 allowed

### Network Accessibility

Find server IP:
```bash
hostname -I
```

From server:
```bash
curl http://localhost
curl http://127.0.0.1
```
- [ ] Both return HTML

From another system:
```bash
curl http://<server-ip>
```
- [ ] Returns HTML
- [ ] No connection errors

---

## Manual Windows Deployment

### Apache Configuration
- [ ] `carlogic.conf` copied to `C:\Apache24\conf\extra\carlogic.conf`
- [ ] DocumentRoot updated to absolute path (e.g., `C:/Users/Name/CarLogic/frontend/build`)
- [ ] `C:\Apache24\conf\httpd.conf` includes `carlogic.conf`
- [ ] Required modules loaded in httpd.conf:
  - [ ] LoadModule proxy_module
  - [ ] LoadModule proxy_http_module
  - [ ] LoadModule rewrite_module
  - [ ] LoadModule headers_module

### Apache Startup
```cmd
cd C:\Apache24\bin
httpd.exe -t
```
- [ ] Output shows: "Syntax OK"

```cmd
net start Apache2.4
# or
httpd.exe -k start
```
- [ ] Apache starts without errors
- [ ] Port 80 is listening

### Services Running
- [ ] Apache service running (Services panel)
- [ ] Backend running: `curl http://localhost:8000/docs` or `python run_server.py`
- [ ] MongoDB running: `mongod --dbpath "C:\path\to\data"` or service

### Firewall Configuration
Windows Firewall should auto-prompt. If not:
- [ ] Port 80 (HTTP) allowed
- [ ] Port 8000 (Backend API) allowed

### Network Accessibility

Find server IP:
```cmd
ipconfig
# Look for IPv4 Address (not 127.0.0.1)
```

From server:
```cmd
curl http://localhost
curl http://127.0.0.1
```
- [ ] Both return HTML

From another system on network:
```bash
curl http://<server-ip>
```
- [ ] Returns HTML
- [ ] No connection errors

---

## Functional Testing

### Frontend Access
- [ ] Page loads without JavaScript errors (check browser console - F12)
- [ ] All images and styles load correctly
- [ ] Navigation menu is visible

### Authentication
- [ ] Can access login page
- [ ] Login with default credentials works:
  - Email: `admin@carlogic.com`
  - Password: `admin123`
- [ ] Redirects to dashboard after login

### Dashboard
- [ ] Dashboard loads
- [ ] Shows user information
- [ ] Shows system data (if any)

### API Access

Check browser DevTools Network tab:
- [ ] API calls go to `/api/*` routes
- [ ] Responses have correct status codes (200, 201, 400, etc.)
- [ ] No CORS errors in console
- [ ] No "mixed content" warnings (HTTP on HTTPS page)

### Database
- [ ] Data displays in dashboard
- [ ] No database connection errors
- [ ] MongoDB shows data: `mongo` → `db.users.find()`

---

## Performance Checks

### Response Times
- [ ] Frontend loads in < 3 seconds
- [ ] API calls respond in < 1 second
- [ ] No timeout errors

### Browser Console (F12)
- [ ] No JavaScript errors (red X's)
- [ ] No CORS warnings
- [ ] No 404 errors for resources
- [ ] No "mixed content" warnings

### Network Tab (DevTools)
- [ ] Static files cached (200 from cache)
- [ ] No failed requests
- [ ] No 502/503 errors from reverse proxy

---

## Security Verification

### CORS Configuration
```bash
curl -H "Origin: http://<external-system>" http://<server-ip>/api/auth/me
```
- [ ] Response includes Access-Control-Allow-Origin header (or appropriate error)
- [ ] No wildcard CORS (*) in production

### Authentication
- [ ] JWT tokens are in Authorization headers
- [ ] Logout works (token is cleared)
- [ ] Protected routes return 401 without token

### Ports
```bash
netstat -an | grep LISTEN
```
- [ ] Port 80 listening (Apache)
- [ ] Port 8000 listening (Backend)
- [ ] Port 27017 NOT exposed to internet

---

## External System Verification (From Different Computer)

```bash
# Get server hostname/IP
ping <server-hostname>
curl http://<server-hostname>
```

- [ ] Server is reachable
- [ ] Application loads
- [ ] No firewall blocking

```bash
# Test API through Apache proxy
curl http://<server-ip>/api/auth/me
# Or after login:
curl http://<server-ip>/api/auth/me \
  -H "Authorization: Bearer <jwt-token>"
```

- [ ] API calls work through reverse proxy
- [ ] Authentication works
- [ ] Data is returned correctly

### From Mobile/Tablet (Same Network)
- [ ] Access `http://<server-ip>` from mobile
- [ ] Page is responsive
- [ ] Touch interface works
- [ ] API calls succeed

---

## Troubleshooting Results

If any step fails, document:

**Issue**: ______________________
**Error Message**: ______________________
**Solution Applied**: ______________________
**Result**: ______________________

---

## Final Sign-Off

- [ ] All tests above completed
- [ ] All checks passed
- [ ] Application is accessible from network
- [ ] No critical errors
- [ ] Ready for production use

---

## Additional Verification Commands

**Check all services**:
```bash
systemctl status apache2 mongod  # Linux
# or for Docker:
docker-compose ps
```

**Check ports listening**:
```bash
netstat -an | grep LISTEN | grep -E ':80|:8000|:27017'
```

**Check logs**:
```bash
# Apache logs
tail -f /var/log/apache2/carlogic_error.log
tail -f /var/log/apache2/carlogic_access.log

# Backend logs (if running in terminal)
# Check console output

# MongoDB logs
# Check MongoDB service logs
```

**Test connectivity**:
```bash
# From server
nc -zv localhost 80     # Apache
nc -zv localhost 8000   # Backend
nc -zv localhost 27017  # MongoDB

# From client
nc -zv <server-ip> 80
nc -zv <server-ip> 8000
```

---

**Date Completed**: _____________  
**Completed By**: _____________  
**System IP**: _____________  
**Notes**: _____________
