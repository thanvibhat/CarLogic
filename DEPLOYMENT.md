# CarLogic Deployment Guide

This guide covers how to deploy the CarLogic application using the Apache + FastAPI + MongoDB architecture.

## Quick Start with Docker Compose

### Requirements
- Docker 20.10+
- Docker Compose 2.0+

### Steps

1. **Clone/Navigate to project**
   ```bash
   cd /path/to/CarLogic
   ```

2. **Build frontend**
   ```bash
   cd frontend
   npm install
   npm run build
   cd ..
   ```

3. **Start all services**
   ```bash
   docker-compose up --build
   ```

4. **Access application**
   - Frontend: http://localhost
   - Backend API: http://localhost/api (or direct: http://localhost:8000/api)
   - API Docs: http://localhost:8000/docs

5. **Default login credentials**
   - Email: admin@carlogic.com
   - Password: admin123

### Stop services
```bash
docker-compose down
```

### Stop and remove data
```bash
docker-compose down -v
```

---

## Manual Deployment (Linux)

### Prerequisites
```bash
# Install Python
sudo apt-get install python3.11 python3.11-venv python3-pip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MongoDB
curl -fsSL https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Install Apache
sudo apt-get install -y apache2
sudo a2enmod rewrite
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod headers
sudo a2enmod expires
sudo a2enmod deflate
```

### MongoDB Setup
```bash
# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify it's running
mongo --eval "db.adminCommand('ping')"
```

### Backend Setup
```bash
cd backend

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run backend (in background or separate terminal)
python run_server.py
# Or use systemd/supervisor for production
```

### Frontend Build
```bash
cd frontend

# Install dependencies
npm install

# Build for production
npm run build

# This creates optimized files in frontend/build/
```

### Apache Configuration
```bash
# Copy configuration file
sudo cp carlogic.conf /etc/apache2/sites-available/carlogic.conf

# Edit carlogic.conf to set correct DocumentRoot path:
# DocumentRoot "/path/to/CarLogic/frontend/build"

# Enable the site
sudo a2ensite carlogic

# Disable default site (optional)
sudo a2dissite 000-default

# Test Apache config
sudo apache2ctl configtest
# Should output: Syntax OK

# Restart Apache
sudo systemctl restart apache2
```

### Environment Configuration

**Backend `.env`**
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=carwash_db
JWT_SECRET=change-this-to-random-string-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
CORS_ORIGINS=http://localhost,http://127.0.0.1,http://yourdomain.com
RESEND_API_KEY=your-resend-api-key
SENDER_EMAIL=your-sender@email.com
```

**Frontend `.env`**
```env
REACT_APP_BACKEND_URL=http://localhost:8000
```

Or if accessing through Apache (recommended):
```env
REACT_APP_BACKEND_URL=http://localhost/api
```

### Verify Everything Works

```bash
# Check MongoDB
curl http://localhost:27017

# Check Backend
curl http://localhost:8000/docs

# Check Frontend
curl http://localhost

# Test API endpoint
curl -X GET http://localhost/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Manual Deployment (Windows)

### Prerequisites
1. **Python 3.11+**: Download from python.org
2. **Node.js 18+**: Download from nodejs.org
3. **MongoDB**: Download from mongodb.com
4. **Apache 2.4**: Download from apachelounge.com

### MongoDB Setup
```cmd
# Run MongoDB service
mongod --dbpath "C:\path\to\data"
```

### Backend Setup
```cmd
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run backend
python run_server.py
```

### Frontend Build
```cmd
cd frontend

# Install dependencies
npm install

# Build
npm run build
```

### Apache Configuration
1. Extract Apache to `C:\Apache24`
2. Copy `carlogic.conf` to `C:\Apache24\conf\extra\`
3. Copy `httpd.conf` to `C:\Apache24\conf\`
4. Edit paths in both files to match your installation
5. Run: `C:\Apache24\bin\httpd.exe`

Or install as Windows service:
```cmd
C:\Apache24\bin\httpd.exe -k install
C:\Apache24\bin\httpd.exe -k start
```

### Verify
- Frontend: http://localhost
- Backend: http://localhost:8000/docs
- API: http://localhost/api

---

## Production Checklist

### Security
- [ ] Change `JWT_SECRET` to a secure random string
- [ ] Enable MongoDB authentication
- [ ] Configure firewall to only allow HTTP/HTTPS
- [ ] Use HTTPS (get SSL certificate, configure in Apache)
- [ ] Set strong passwords for admin users
- [ ] Enable CORS only for your domain

### Performance
- [ ] Enable gzip compression in Apache (done in carlogic.conf)
- [ ] Configure browser caching headers (done in carlogic.conf)
- [ ] Set up CDN for static assets (optional)
- [ ] Use production-grade WSGI server (consider Gunicorn with multiple workers)

### Monitoring
- [ ] Set up log rotation for Apache/Backend logs
- [ ] Monitor MongoDB disk space
- [ ] Set up alerting for service failures
- [ ] Monitor CPU and memory usage

### Backups
- [ ] Schedule daily MongoDB backups
- [ ] Store backups in separate location/cloud
- [ ] Test backup restoration regularly

### Maintenance
- [ ] Keep dependencies updated
- [ ] Monitor error logs regularly
- [ ] Plan for scale (load balancing, replication)

---

## Troubleshooting

### Backend won't start
```bash
# Check MongoDB is running
mongo --eval "db.adminCommand('ping')"

# Check port 8000 is not in use
lsof -i :8000

# Check dependencies
pip list | grep -E "fastapi|motor|pydantic"
```

### Frontend shows 404 errors
```bash
# Verify frontend/build/ exists and is not empty
ls -la frontend/build/

# Check Apache DocumentRoot in carlogic.conf
grep DocumentRoot carlogic.conf

# Test Apache syntax
apache2ctl configtest
```

### API requests failing
```bash
# Check backend is running
curl -i http://localhost:8000/docs

# Check Apache reverse proxy is working
curl -v http://localhost/api/

# Check CORS_ORIGINS in backend/.env
grep CORS_ORIGINS backend/.env
```

### MongoDB connection issues
```bash
# Check MongoDB is running
systemctl status mongod

# Test connection
mongo --host localhost:27017

# Check connection string in .env
grep MONGO_URL backend/.env
```

---

## Updating the Application

### Update Frontend
```bash
cd frontend

# Get latest code
git pull

# Rebuild
npm install
npm run build

# Apache will serve the new build automatically
```

### Update Backend
```bash
cd backend

# Get latest code
git pull

# Update dependencies
pip install -r requirements.txt --upgrade

# Restart backend service
systemctl restart carlogic-backend
# OR kill and restart Python process
```

### Database Migrations
```bash
cd scripts

# Run migration scripts as needed
python migrate_*.py
```

---

## Support

For issues or questions:
1. Check application logs: `backend/logs/` and Apache logs
2. Verify all services are running
3. Test API endpoint directly: `curl http://localhost:8000/docs`
4. Review environment variables in `.env` files
