# AWS EC2 Deployment Guide — Copilot AI

This guide details the step-by-step instructions for deploying the containerized **Copilot AI** application onto an AWS EC2 virtual machine, configuring persistent storage volumes, and exposing the application securely over HTTP/HTTPS using Nginx as a reverse proxy.

---

## 1. AWS EC2 Setup

### Launch Instance
1. Sign in to your AWS Management Console.
2. Navigate to **EC2** and click **Launch Instance**.
3. Configure the following details:
   - **Name**: `copilot-ai-production`
   - **AMI**: Ubuntu Server 22.04 LTS (HVM), SSD Volume Type.
   - **Instance Type**: `t2.micro` or `t3.micro` (Free Tier eligible; see Swap File setup below) or `t3.medium` for higher native performance.
   - **Key Pair**: Select or create a key pair (`.pem`) to securely SSH into the host.
4. Expand **Network Settings** and configure the **Security Group**:
   - Add inbound rules:
     - **SSH** (Port 22) -> Restricted to `My IP` or public range.
     - **HTTP** (Port 80) -> Source `0.0.0.0/0` (Anywhere).
     - **HTTPS** (Port 443) -> Source `0.0.0.0/0` (Anywhere).
     - **Custom TCP** (Port 7860) -> Source `0.0.0.0/0` (Only if you wish to access the raw port directly without Nginx).
5. Choose storage size (20GB+ gp3 recommended) and launch.

---

## 2. Docker & Docker Compose Installation

Once the instance is running, SSH into it:
```bash
ssh -i "your-key.pem" ubuntu@your-ec2-public-ip
```

### Configure Swap File (Required for Free Tier `t2.micro` / `t3.micro`)
Because Free Tier instances only have 1GB of RAM, you must configure a swap space using SSD storage as virtual memory to prevent container or package install crashes:
```bash
# Allocate 4GB swap space
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make swap permanent across reboots
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Confirm swap is active
free -h
```


Run the following script to install Docker and Docker Compose on the host:
```bash
# Update local packages
sudo apt-get update -y
sudo apt-get upgrade -y

# Install Docker dependencies
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# Add Docker’s official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up stable repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine & Compose
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Enable and start Docker service
sudo systemctl enable docker
sudo systemctl start docker

# Add your user to the docker group (to run commands without sudo)
sudo usermod -aG docker $USER
newgrp docker
```

To verify the installation:
```bash
docker compose version
```

---

## 3. Clone and Configure Project

Clone your project repository on the EC2 host:
```bash
git clone https://github.com/DevilRK23/AI_Operations_copilot.git
cd AI_Operations_copilot
```

Create a production environment file `.env` in the root directory:
```bash
nano .env
```

Add your production keys:
```env
GROQ_API_KEY=gsk_your_actual_key_here
HF_TOKEN=your_huggingface_token_here (optional, for embedding rate limits)
JWT_SECRET=your_long_random_jwt_secret_key_here
```
Press `CTRL+O` and `Enter` to save, and `CTRL+X` to exit nano.

---

## 4. Run Application with Docker Compose

Deploy the container using the orchestrated config:
```bash
docker compose up -d --build
```

This command will:
- Build the frontend bundle in a node multi-stage environment.
- Install backend python requirements.
- Set up SQLite and ChromaDB persistence in `./backend/database` and `./backend/vector_db`.
- Map port `7860` of the container to port `7860` of the host EC2 virtual machine.

You can verify that the container is healthy by checking the logs:
```bash
docker compose logs -f
```

---

## 5. Reverse Proxy with Nginx & Let's Encrypt SSL

To secure the application with HTTPS and route normal port 80/443 traffic, configure Nginx.

### Install Nginx
```bash
sudo apt-get install -y nginx
```

### Configure Nginx Server Block
Create a config file for your app:
```bash
sudo nano /etc/nginx/sites-available/copilot-ai
```

Add the following reverse-proxy structure (replace `copilot.yourdomain.com` with your public DNS record or EC2 IP if domain is unavailable):
```nginx
server {
    listen 80;
    server_name copilot.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:7860;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the configuration and reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/copilot-ai /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### Install Certbot SSL/TLS Certificates
```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d copilot.yourdomain.com
```
Follow the interactive prompts to get your certificate and auto-renew rule established. Your application will now be securely available over `https://copilot.yourdomain.com`.
