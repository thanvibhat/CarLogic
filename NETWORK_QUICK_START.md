# Quick Start - External Network Access

## TL;DR - Just Deploy It

### Docker Compose (Recommended - 3 steps)

```bash
# Step 1: Build frontend
cd frontend && npm install && npm run build && cd ..

# Step 2: Start services
docker-compose up --build

# Step 3: Access from any system on network
http://<server-ip>
```

**That's it!** The application is now accessible from other systems.

---

## Access Points

After deployment, access from any system on the network:

| Access Type | URL |
|-------------|-----|
| Frontend | `http://<server-ip>` |
| By hostname | `http://<server-hostname>` |
| API Docs | `http://<server-ip>:8000/docs` |
| Login | `http://<server-ip>` → Login with admin@carlogic.com / admin123 |

---

## What Was Changed?

### For External Network Access

4 configuration files were modified (minimal changes):

1. **carlogic.conf** - Apache now accepts all hostnames/IPs
2. **backend/.env** - CORS extended for network access
3. **docker-compose.yml** - Backend CORS extended
4. **frontend/.env** - No change (works through proxy)

**Result**: Application accessible from network, not just localhost.

---

## Manual Setup (If Not Using Docker)

### Linux

```bash
# 1. Build frontend
cd frontend && npm install && npm run build && cd ..

# 2. Copy Apache config
sudo cp carlogic.conf /etc/apache2/sites-available/carlogic.conf

# 3. Edit config with your paths
sudo nano /etc/apache2/sites-available/carlogic.conf
# Update: DocumentRoot = /var/www/carlogic/frontend/build

# 4. Enable and restart
sudo a2ensite carlogic
sudo systemctl restart apache2

# 5. Access
http://<your-ip>
```

### Windows

```cmd
# 1. Build frontend
cd frontend
npm install
npm run build
cd ..

# 2. Copy config
copy carlogic.conf C:\Apache24\conf\extra\

# 3. Edit C:\Apache24\conf\extra\carlogic.conf
# Update DocumentRoot to your actual path

# 4. Restart Apache (Administrator)
cd C:\Apache24\bin
httpd.exe -t  (verify)
net start Apache2.4

# 5. Access
http://<your-ip>
```

---

## Files to Read

| Situation | Read This |
|-----------|-----------|
| I want detailed guide | `EXTERNAL_HOSTING_GUIDE.md` |
| I want quick reference | `NETWORK_CONFIG.md` |
| I want to understand changes | `EXTERNAL_HOSTING_SUMMARY.md` |
| I have Linux issues | Setup script: `setup_external_hosting.sh` |
| I have Windows issues | Setup script: `setup_external_hosting.bat` |

---

## Verify It Works

From another system on the network:

```bash
# Replace <server-ip> with actual IP
curl http://<server-ip>

# Should return HTML (success)
# If error, check:
# 1. Is Apache running? systemctl status apache2
# 2. Is backend running? curl http://localhost:8000/docs
# 3. Is MongoDB running? systemctl status mongod
```

---

## Find Your Server IP

**Linux/Mac**:
```bash
hostname -I
# or
ifconfig
```

**Windows**:
```cmd
ipconfig
# Look for IPv4 Address (not 127.0.0.1)
```

**Docker**:
```bash
docker inspect carlogic_apache | grep IPAddress
```

---

## Default Login

```
Email: admin@carlogic.com
Password: admin123
```

---

## Port Summary

| Service | Port | Access |
|---------|------|--------|
| Apache | 80 | http://<server-ip> |
| Backend | 8000 | http://<server-ip>:8000/docs |
| MongoDB | 27017 | Internal only (not exposed) |

---

## Troubleshooting

### "Cannot connect from other system"

**Check**:
1. Server IP: `hostname -I` (Linux) or `ipconfig` (Windows)
2. Apache running: `systemctl status apache2` or Services panel
3. Backend running: `curl http://localhost:8000/docs`
4. Firewall: Open port 80 and 8000

### "CORS error in browser console"

**Fix**: Backend CORS is already configured for network access. If still failing:
1. Check `backend/.env` CORS_ORIGINS includes your network address
2. Restart backend service

### "API requests fail with 502 Bad Gateway"

**Check**: Backend is running and Apache can reach it
```bash
curl http://localhost:8000/api
# Should respond
```

---

## Summary

✅ Application configured for external network access  
✅ Docker Compose is ready to go  
✅ Manual setup templates provided  
✅ All configuration files updated  
✅ Complete documentation available  

**Next**: Follow the Quick Start above (Docker Compose recommended).
