# StayEase — Production Deployment & Operations Guide

This guide provides end-to-end instructions for deploying and operating the **StayEase** platform in production environments.

---

## 1. System Architecture Overview

```text
       [ Mobile Clients (Android / iOS) ]       [ Admin Web Dashboard ]
                      │                                    │
                      ▼                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │             Nginx / Cloudflare (SSL / TLS)              │
       │               Rate Limiting & Reverse Proxy             │
       └──────────────────────────┬──────────────────────────────┘
                                  │
                                  ▼
       ┌─────────────────────────────────────────────────────────┐
       │             Express.js REST API (Node.js 20+)           │
       │              PM2 Cluster Mode (4-8 Instances)           │
       └──────────────────────────┬──────────────────────────────┘
                                  │
            ┌─────────────────────┴─────────────────────┐
            ▼                                           ▼
┌───────────────────────────────┐           ┌───────────────────────┐
│     MySQL 8.0 Primary DB      │           │  Local / S3 Storage   │
│  Connection Pool (20-50 max)  │           │   Encrypted Uploads   │
│   InnoDB Row-Level Locking    │           └───────────────────────┘
└───────────────────────────────┘
```

---

## 2. Prerequisites & Infrastructure Sizing

| Component | Minimum Specification | Recommended Production |
| :--- | :--- | :--- |
| **API Server (Node.js)** | 2 vCPU, 4 GB RAM | 4 vCPU, 8 GB RAM (or autoscaling ECS/K8s) |
| **Database (MySQL 8)** | 2 vCPU, 4 GB RAM, SSD | 4 vCPU, 16 GB RAM, Provisioned IOPS SSD |
| **Web Server (Admin)** | Static CDN (Cloudflare / Netlify) | AWS S3 + CloudFront CDN |
| **OS** | Ubuntu 22.04 LTS / Debian 12 | Ubuntu 24.04 LTS |

---

## 3. Database Deployment (MySQL 8)

### Step 1: Install MySQL 8 & Secure Installation
```bash
sudo apt update && sudo apt install -y mysql-server
sudo mysql_secure_installation
```

### Step 2: Configure Performance & Character Set
Add to `/etc/mysql/mysql.conf.d/mysqld.cnf`:
```ini
[mysqld]
character-set-server = utf8mb4
collation-server     = utf8mb4_unicode_ci
default_authentication_plugin = mysql_native_password
max_connections      = 200
innodb_buffer_pool_size = 8G # Set to 50-70% of server RAM
innodb_log_file_size    = 512M
innodb_flush_log_at_trx_commit = 1 # Ensures ACID durability
```
Restart MySQL:
```bash
sudo systemctl restart mysql
```

### Step 3: Initialize Database & Run Schema
```bash
mysql -u root -p -e "CREATE DATABASE stayease_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p stayease_db < database/schema.sql
mysql -u root -p stayease_db < database/seed.sql
```

---

## 4. Backend API Deployment

### Step 1: Production Environment File (`.env`)
Create `/var/www/stayease/backend/.env`:
```env
PORT=5000
NODE_ENV=production
FRONTEND_ORIGIN=https://admin.stayease.com,https://stayease.com

# Database Connection Pool
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=stayease_db
DB_USER=stayease_app_user
DB_PASSWORD=YourStrongProductionPassword_99#
DB_CONNECTION_LIMIT=25

# JWT Secrets (Generate using openssl rand -base64 48)
JWT_SECRET=PROD_JWT_SECRET_REPLACE_WITH_ENTROPY
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=PROD_JWT_REFRESH_SECRET_REPLACE_WITH_ENTROPY
JWT_REFRESH_EXPIRES_IN=30d

# File Storage
STORAGE_DRIVER=local
STORAGE_LOCAL_PATH=uploads
MAX_FILE_SIZE_MB=5

# Payment Gateway & Webhook Signature
PAYMENT_GATEWAY_PROVIDER=stripe
PAYMENT_CURRENCY=USD
PAYMENT_WEBHOOK_SECRET=whsec_prod_stayease_webhook_secret_key_84920
```

### Step 2: Process Manager (PM2 Cluster)
Install PM2 globally:
```bash
sudo npm install -g pm2
```
Create `ecosystem.config.cjs`:
```javascript
module.exports = {
  apps: [{
    name: 'stayease-api',
    script: 'src/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    max_memory_restart: '1G',
    autorestart: true
  }]
};
```
Launch and persist on reboot:
```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

---

## 5. Nginx Reverse Proxy & SSL Configuration

Install Nginx and Certbot:
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

Configure `/etc/nginx/sites-available/stayease.conf`:
```nginx
server {
    server_name api.stayease.com;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /uploads/ {
        alias /var/www/stayease/backend/uploads/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
```
Enable site and obtain SSL certificate:
```bash
sudo ln -s /etc/nginx/sites-available/stayease.conf /etc/nginx/sites-enabled/
sudo certbot --nginx -d api.stayease.com
```

---

## 6. React Admin Web Dashboard Deployment

### Step 1: Build Production Assets
```bash
cd admin-web
npm install
npm run build
```
This generates the optimized bundle in `admin-web/dist`.

### Step 2: Serve via Nginx
```nginx
server {
    server_name admin.stayease.com;
    root /var/www/stayease/admin-web/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass https://api.stayease.com/api/;
    }
}
```

---

## 7. Flutter Mobile App Release (Android & iOS)

### Android Release Preparation

1. **Keystore Generation**:
   ```bash
   keytool -genkey -v -keystore stayease-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias stayease
   ```
2. **Create `key.properties`** in `mobile/android/key.properties`:
   ```properties
   storePassword=YourKeyPassword
   keyPassword=YourKeyPassword
   keyAlias=stayease
   storeFile=path/to/stayease-release-key.jks
   ```
3. **Configure API Endpoint**:
   Update `ApiConfig.baseUrl` in `mobile/lib/core/config/api_config.dart` or pass during build:
   ```bash
   flutter build appbundle --release --dart-define=API_URL=https://api.stayease.com/api/v1
   ```
4. **Android App Bundle (.aab)**:
   The compiled `.aab` file ready for the Google Play Console is generated at:
   `build/app/outputs/bundle/release/app-release.aab`

---

## 8. Automated Backup & Monitoring Strategy

### Automated MySQL Daily Backups
Add a cron job using `crontab -e`:
```bash
0 3 * * * mysqldump -u root -p'YourPassword' stayease_db | gzip > /var/backups/stayease_db_$(date +\%F).sql.gz
```

### Healthcheck Endpoint
Configure your monitoring tool (UptimeRobot, Datadog, Prometheus) to check:
`https://api.stayease.com/api/v1/health`
Expected response:
```json
{
  "success": true,
  "message": "Service Health Check",
  "data": {
    "status": "UP",
    "database": "CONNECTED"
  }
}
```
