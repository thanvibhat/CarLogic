#!/bin/bash
# Setup script for CarLogic external network hosting
# This script configures the application for access from other systems on the network

set -e

echo "CarLogic External Network Hosting Setup"
echo "========================================"

# Detect the system IP address (not localhost)
SYSTEM_IP=$(hostname -I | awk '{print $1}')
if [ -z "$SYSTEM_IP" ]; then
    SYSTEM_IP="127.0.0.1"
fi

HOSTNAME_FQDN=$(hostname -f)
HOSTNAME_SHORT=$(hostname -s)

echo ""
echo "Detected System Information:"
echo "  Hostname: $HOSTNAME_FQDN"
echo "  Short Name: $HOSTNAME_SHORT"
echo "  IP Address: $SYSTEM_IP"
echo ""

# Prompt for deployment mode
echo "Select deployment mode:"
echo "  1) Docker Compose (recommended)"
echo "  2) Manual (Linux)"
echo "  3) Manual (Windows)"
read -p "Enter choice (1-3): " DEPLOYMENT_MODE

case $DEPLOYMENT_MODE in
    1)
        echo ""
        echo "Docker Compose Mode"
        echo "==================="
        echo "The application will be accessible as:"
        echo "  - http://$SYSTEM_IP"
        echo "  - http://$HOSTNAME_FQDN"
        echo "  - http://$HOSTNAME_SHORT"
        echo ""
        echo "Configuration: Using internal Docker DNS 'backend' for reverse proxy"
        echo "Frontend will access API at: http://apache/api (via Apache reverse proxy)"
        echo ""
        echo "No additional configuration needed. Run:"
        echo "  docker-compose up --build"
        ;;
    2)
        echo ""
        echo "Manual Linux Deployment"
        echo "======================="
        
        # Create or update Apache config for Linux
        APACHE_CONF="/etc/apache2/sites-available/carlogic.conf"
        
        echo "Creating Apache configuration for $SYSTEM_IP..."
        
        # Create a temporary config file
        cat > carlogic.conf.tmp <<EOF
# Apache VirtualHost Configuration for CarLogic
# Auto-generated for: $SYSTEM_IP ($HOSTNAME_FQDN)

<VirtualHost *:80>
    ServerName $HOSTNAME_FQDN
    ServerAlias $SYSTEM_IP $HOSTNAME_SHORT
    DocumentRoot "/var/www/carlogic/frontend/build"

    # Serve static frontend files
    <Directory "/var/www/carlogic/frontend/build">
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
        
        # React Router: Route all non-file requests to index.html
        <IfModule mod_rewrite.c>
            RewriteEngine On
            RewriteBase /
            RewriteRule ^index\.html$ - [L]
            RewriteCond %{REQUEST_FILENAME} !-f
            RewriteCond %{REQUEST_FILENAME} !-d
            RewriteRule . /index.html [L]
        </IfModule>
    </Directory>

    # Reverse proxy for API requests to FastAPI backend
    # Adjust 'backend_server' to the actual hostname/IP of your backend
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

    <IfModule mod_deflate.c>
        AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
    </IfModule>

    <IfModule mod_expires.c>
        ExpiresActive On
        ExpiresByType image/* "access plus 1 year"
        ExpiresByType text/css "access plus 1 year"
        ExpiresByType text/javascript "access plus 1 year"
        ExpiresByType application/javascript "access plus 1 year"
        ExpiresByType font/* "access plus 1 year"
    </IfModule>
</VirtualHost>
EOF
        
        echo ""
        echo "Created: carlogic.conf.tmp"
        echo "Review the file and run:"
        echo "  sudo cp carlogic.conf.tmp $APACHE_CONF"
        echo "  sudo a2ensite carlogic"
        echo "  sudo apache2ctl configtest"
        echo "  sudo systemctl restart apache2"
        echo ""
        echo "Frontend will be accessible at: http://$SYSTEM_IP"
        echo ""
        echo "Configuration summary:"
        echo "  Frontend serves from: /var/www/carlogic/frontend/build"
        echo "  Backend should be running on: localhost:8000"
        echo "  MongoDB should be running on: localhost:27017"
        ;;
    3)
        echo ""
        echo "Manual Windows Deployment"
        echo "========================="
        
        # Create a batch file for Windows
        cat > setup_carlogic.bat <<EOF
@echo off
REM Setup script for CarLogic on Windows
REM Run as Administrator

echo CarLogic Windows Setup
echo =====================
echo.
echo System IP: %COMPUTERNAME%
echo.
echo Configuration for external access:
echo   Hostname: %COMPUTERNAME%
echo   Backend: localhost:8000 (or actual IP if on different machine)
echo.
echo Steps to complete setup:
echo   1. Build frontend:
echo      cd frontend
echo      npm install
echo      npm run build
echo      cd ..
echo.
echo   2. Copy carlogic.conf to Apache:
echo      copy carlogic.conf "C:\Apache24\conf\extra\carlogic.conf"
echo.
echo   3. Edit carlogic.conf and update:
echo      - DocumentRoot to absolute path of frontend\build
echo      - ProxyPass to correct backend IP/hostname if not localhost
echo.
echo   4. Start services:
echo      - MongoDB: mongod --dbpath "C:\path\to\data"
echo      - Backend: cd backend && python run_server.py
echo      - Apache: httpd -k start (from C:\Apache24\bin)
echo.
echo   5. Access at:
echo      http://%COMPUTERNAME%
echo      http://127.0.0.1
echo.
pause
EOF
        
        echo "Created: setup_carlogic.bat"
        echo ""
        echo "Frontend will be accessible at:"
        echo "  http://%COMPUTERNAME%"
        echo "  http://$SYSTEM_IP"
        echo ""
        echo "Next steps:"
        echo "  1. Run setup_carlogic.bat"
        echo "  2. Edit carlogic.conf with correct paths for your Windows system"
        echo "  3. Follow instructions in the batch file"
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

echo ""
echo "Setup complete. The application is now configured for external network access."
