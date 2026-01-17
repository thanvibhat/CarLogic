# Network Access Configuration Template
# Instructions for enabling external network access to CarLogic

## Quick Setup

### If Using Docker Compose:

No additional configuration needed beyond what's already in docker-compose.yml.
The application is ready for network access.

Access points:
- http://<server-ip>
- http://<server-hostname>

### If Using Manual Setup:

Follow the steps below based on your operating system.

---

## Linux Configuration

### 1. Update Apache Configuration

Replace the content of `/etc/apache2/sites-available/carlogic.conf` with:

```apache
<VirtualHost *:80>
    ServerName _default_
    ServerAlias *
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

    <Location /api>
        ProxyPass http://localhost:8000/api
        ProxyPassReverse http://localhost:8000/api
        ProxyPreserveHost On
        RequestHeader set X-Forwarded-For %{REMOTE_ADDR}s
        RequestHeader set X-Forwarded-Proto http
        RequestHeader set X-Forwarded-Host %{HTTP_HOST}s
    </Location>

    <Location /ws>
        ProxyPass ws://localhost:8000/ws
        ProxyPassReverse ws://localhost:8000/ws
        ProxyPreserveHost On
    </Location>

    ErrorLog /var/log/apache2/carlogic_error.log
    CustomLog /var/log/apache2/carlogic_access.log common
</VirtualHost>
```

### 2. Enable and Test

```bash
sudo a2ensite carlogic
sudo apache2ctl configtest  # Should output: Syntax OK
sudo systemctl restart apache2
```

### 3. Verify

```bash
# Get your system IP
hostname -I

# Test from localhost
curl http://localhost

# Test from the IP address (replace with your actual IP)
curl http://<your-ip>

# Test from another system on the network
# From another computer: curl http://<server-ip>
```

### 4. Firewall Configuration

If using UFW:
```bash
sudo ufw allow 80/tcp   # Apache
sudo ufw allow 8000/tcp # Backend API
sudo ufw allow 27017/tcp # MongoDB (only if needed from other systems)
```

---

## Windows Configuration

### 1. Copy Configuration File

Copy `carlogic.conf` to Apache:
```cmd
copy carlogic.conf "C:\Apache24\conf\extra\carlogic.conf"
```

### 2. Update Paths in carlogic.conf

Open `C:\Apache24\conf\extra\carlogic.conf` and update:
- Change `DocumentRoot` from `/var/www/carlogic/frontend/build` to your actual path
- Example: `C:/Users/YourName/CarLogic/frontend/build`

### 3. Configure Apache httpd.conf

Edit `C:\Apache24\conf\httpd.conf`:

Add/uncomment these modules:
```apache
LoadModule proxy_module modules/mod_proxy.so
LoadModule proxy_http_module modules/mod_proxy_http.so
LoadModule rewrite_module modules/mod_rewrite.so
LoadModule headers_module modules/mod_headers.so
```

Add this line at the end:
```apache
Include conf/extra/carlogic.conf
```

### 4. Test Apache Configuration

Open Command Prompt as Administrator:
```cmd
cd C:\Apache24\bin
httpd.exe -t
```

Should output: `Syntax OK`

### 5. Start Apache

```cmd
# As service (if installed)
net start Apache2.4

# Or directly
cd C:\Apache24\bin
httpd.exe
```

### 6. Verify from Another System

Get your system's IP:
```cmd
ipconfig
```

From another system on the network:
```
http://<your-ip>
```

### 7. Firewall Configuration

Windows Firewall should auto-prompt to allow Apache and Python.
If not, manually allow:
- Port 80 (Apache)
- Port 8000 (Backend)

---

## Docker Compose Network Access

The docker-compose.yml already supports network access:

1. Services are on the same Docker network: `carlogic_network`
2. Apache proxies to `backend:8000` (Docker DNS resolution)
3. All ports are exposed: 80, 8000, 27017

Just run:
```bash
docker-compose up --build
```

Then access from any system:
```
http://<server-ip>
http://<server-hostname>
```

---

## Verify All Components

### Check Apache is Running

**Linux**:
```bash
systemctl status apache2
# Or
sudo apache2ctl -v
```

**Windows**:
```cmd
tasklist | findstr apache
```

### Check Backend is Running

```bash
curl http://localhost:8000/docs
```

Should return FastAPI documentation page.

### Check MongoDB is Running

```bash
# Linux
systemctl status mongod

# Windows - check if port is listening
netstat -ano | findstr :27017
```

### Check Network Access from Another System

```bash
# Replace <server-ip> with actual IP
curl http://<server-ip>
```

Should return HTML (the React app).

### Check API Access

```bash
curl http://<server-ip>/api/health
# Or login:
curl -X POST http://<server-ip>/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@carlogic.com","password":"admin123"}'
```

---

## Environment Variables for Network Access

### frontend/.env

Should use one of:

**For Docker Compose (best)**:
```env
REACT_APP_BACKEND_URL=http://localhost:8000
```

**For manual setup on same machine**:
```env
REACT_APP_BACKEND_URL=http://localhost:8000
```

**For manual setup on different machines**:
```env
REACT_APP_BACKEND_URL=http://<backend-ip>:8000
```

### backend/.env

CORS_ORIGINS should include all access methods:
```env
CORS_ORIGINS=http://localhost,http://127.0.0.1,http://localhost:80,http://localhost:8000,http://apache,http://0.0.0.0:80,http://0.0.0.0:8000
```

Add your system's IP if manual setup:
```env
CORS_ORIGINS=http://localhost,http://127.0.0.1,http://localhost:80,http://localhost:8000,http://apache,http://<your-ip>
```

---

## File Modifications Summary

**Modified files** (for external network access):
- `carlogic.conf` - Hostname and proxy configuration
- `frontend/.env` - Backend URL
- `backend/.env` - CORS origins
- `docker-compose.yml` - Backend CORS configuration

**New files** (for guidance):
- `EXTERNAL_HOSTING_GUIDE.md` - This guide
- `carlogic.conf.external` - Reference configuration
- `setup_external_hosting.sh` - Linux setup script
- `setup_external_hosting.bat` - Windows setup script
- `frontend/.env.production` - Production environment template

---

## Verification Checklist

After configuration:

- [ ] Frontend loads from system IP address
- [ ] Frontend loads from system hostname
- [ ] API endpoints work from the frontend (check DevTools Network tab)
- [ ] No CORS errors in browser console
- [ ] Can login with admin credentials
- [ ] Dashboard displays correctly
- [ ] Can access from another system on the network

---

## Next Steps

1. Choose your deployment method (Docker Compose or Manual)
2. Follow the appropriate section above
3. Run the verification steps
4. Access the application from another system on the network

For detailed troubleshooting, see `EXTERNAL_HOSTING_GUIDE.md`.
