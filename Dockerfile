# Z&Z — Luxury Bridals & Formals
# Works on any free Docker host (Render, Koyeb, Hugging Face Spaces, Fly.io …)
FROM node:20-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

# install only what runs the site
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund || npm install --omit=dev --no-audit --no-fund

COPY . .

# the host tells us the port; 3000 locally
ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
