---
sidebar_position: 4
title: Reverse Proxy & TLS
---

# Reverse Proxy & TLS

Tab Pilot runs on port `3000` internally. In production you should put a reverse proxy in front of it to:

- Terminate TLS (HTTPS)
- Use a clean domain name
- Enable compression and caching of static assets

:::warning WebSocket support is required
Tab Pilot uses **Socket.io** for all real-time communication. Your proxy **must** forward WebSocket upgrade headers. Missing the `Upgrade` and `Connection` headers will cause participants to fail to connect.
:::

---

## Nginx

### Basic Configuration

```nginx
server {
    listen 443 ssl;
    server_name tabpilot.example.com;

    # TLS certificates (e.g. from Certbot/Let's Encrypt)
    ssl_certificate     /etc/letsencrypt/live/tabpilot.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tabpilot.example.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;

        # WebSocket upgrade headers — required for Socket.io
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Standard proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Keep long-lived WebSocket connections open
        proxy_read_timeout 86400;
    }
}

# Redirect HTTP → HTTPS
server {
    listen 80;
    server_name tabpilot.example.com;
    return 301 https://$host$request_uri;
}
```

### Install with Certbot (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate and auto-configure Nginx
sudo certbot --nginx -d tabpilot.example.com

# Test automatic renewal
sudo certbot renew --dry-run
```

---

## Caddy

Caddy is the simplest option — it handles TLS automatically via Let's Encrypt with zero extra configuration:

```
tabpilot.example.com {
    reverse_proxy localhost:3000
}
```

That is the entire config. Caddy automatically:
- Obtains and renews a Let's Encrypt certificate
- Forwards WebSocket upgrade headers
- Redirects HTTP to HTTPS

### Install Caddy

```bash
# Debian/Ubuntu
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy
```

Edit `/etc/caddy/Caddyfile` with the config above, then:

```bash
sudo systemctl reload caddy
```

---

## Traefik (Docker Label-Based)

If you are already running Traefik in your Docker environment, add these labels to the `app` service in your `compose.yml`:

```yaml
  app:
    image: ghcr.io/gautamkrishnar/tabpilot:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.tabpilot.rule=Host(`tabpilot.example.com`)"
      - "traefik.http.routers.tabpilot.entrypoints=websecure"
      - "traefik.http.routers.tabpilot.tls.certresolver=letsencrypt"
      - "traefik.http.services.tabpilot.loadbalancer.server.port=3000"
```

---

## Setting FRONTEND_URL

After configuring your reverse proxy, update the `FRONTEND_URL` environment variable in your `compose.yml` to match the public domain:

```yaml
    environment:
      - FRONTEND_URL=https://tabpilot.example.com
```

:::warning CORS mismatch
`FRONTEND_URL` is used as the allowed CORS origin. If it does not match the domain your users access, all WebSocket connections and API calls will be blocked by the browser's CORS policy. Always set this to the exact public URL, including the protocol (`https://`).
:::

Restart the app container after changing this value:

```bash
docker compose up -d --no-deps app
```

---

## Port Exposure

When running behind a reverse proxy, you can remove the `ports` mapping from the `app` service so port `3000` is not exposed directly to the internet:

```yaml
  app:
    image: ghcr.io/gautamkrishnar/tabpilot:latest
    # Remove or comment out the ports section
    # ports:
    #   - "3000:3000"
    expose:
      - "3000"
```

The reverse proxy connects to port `3000` on the Docker network internally. Only ports `80` and `443` on your proxy host need to be open to the public.
