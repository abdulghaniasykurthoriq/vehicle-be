Vehicle API

Express + TypeScript + Prisma + PostgreSQL.
Fitur: Auth (JWT, refresh token), User, Vehicle, Swagger UI, Testing.

✨ Tech Stack

Runtime: Node.js (TS) dengan tsx

Web: Express

ORM: Prisma

DB: PostgreSQL

Docs: Swagger (OpenAPI) di /docs

Test: Vitest / Jest (sesuaikan)

Lint/Format: ESLint + Prettier

CI/CD: GitHub Actions (contoh disertakan)

Deploy: Docker + Nginx (reverse proxy) + SSL (Let’s Encrypt)

🧱 Arsitektur Singkat
src/
  routes/        # Definisi route (auth, users, vehicles, dll.)
  controllers/   # HTTP controller (req/res handling)
  services/      # Logika bisnis
  repositories/  # Query ke DB via Prisma Client
  middleware/    # Validasi, auth guard, error handler, dll.
  schemas/       # Zod schemas untuk request validation
  utils/         # Helper
  app.ts         # Inisialisasi Express, middleware, routing
  index.ts       # Entrypoint (start server)
prisma/
  schema.prisma  # Skema Prisma
  seed.ts        # Seeder (jalan via `npx prisma db seed`)


Alur request: Route -> Controller -> Service -> Repository (Prisma) -> DB
Docs: Swagger UI di GET /docs
Auth: JWT Access & Refresh (HTTP-only cookie opsional)

🔧 Prasyarat

Node.js 20+ (disarankan)

PostgreSQL 14+ (local atau remote)

PNPM/NPM (sesuai preferensi)

Git, Docker (untuk deploy)

🚀 Setup Dev Environment (Local)

Clone & install deps

git clone <repo-url>
cd vehicle-be
npm install


Environment variables
Buat file .env (atau sesuaikan) berisi:

# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/vehicledb?schema=public"

# App
PORT=4000
NODE_ENV=development
JWT_SECRET="supersecret"            # ganti ke secret kuat
JWT_EXPIRES_IN="15m"
REFRESH_JWT_SECRET="supersecret2"   # ganti ke secret kuat
REFRESH_JWT_EXPIRES_IN="7d"
CORS_ORIGIN="http://localhost:5173" # ubah sesuai frontend


Prisma migrate & generate

npx prisma migrate dev --name init
npx prisma generate


Seeding (opsional)

Jika project ini memakai ESM + TS, gunakan tsx untuk seed.

npm i -D tsx
# di package.json:
# "prisma": { "seed": "tsx prisma/seed.ts" }
npx prisma db seed


Run dev

npm run dev
# output:
# 🚗 Vehicle API listening on http://localhost:4000
# 📚 Swagger UI at http://localhost:4000/docs


Testing

npm run test
# atau coverage
npm run test:cov


Lint & format

npm run lint
npm run format


Script contoh (package.json):

{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "lint": "eslint .",
    "format": "prettier --write .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:cov": "vitest run --coverage"
  }
}

🗄️ Prisma & Database

Migrate: npx prisma migrate dev --name <name>

Generate client: npx prisma generate

Sync schema dari DB existing: npx prisma db pull

Studio (GUI): npx prisma studio

Catatan: Prisma v6 memberi warning deprecation untuk config package.json#prisma. Untuk v7 nanti, pindah ke prisma.config.ts. Untuk saat ini aman lanjut.

🧪 API Documentation

Swagger UI: GET http://localhost:4000/docs

JSON spec: GET http://localhost:4000/docs-json

Tambahkan anotasi OpenAPI di controller/route (jika pakai swagger-jsdoc atau tsoa, sesuaikan).

🐳 Jalankan dengan Docker (Local)

Dockerfile (contoh ringkas):

FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY .env .env
EXPOSE 4000
CMD ["node", "dist/index.js"]


docker-compose.yml (local):

services:
  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: vehicledb
    ports: ["5432:5432"]
    volumes: [dbdata:/var/lib/postgresql/data]

  api:
    build: .
    env_file: .env
    environment:
      DATABASE_URL: postgres://postgres:postgres@db:5432/vehicledb?schema=public
      PORT: 4000
    ports: ["4000:4000"]
    depends_on: [db]

volumes:
  dbdata:

☁️ Deployment ke VPS (Ubuntu) + Nginx + SSL
1) Siapkan server
sudo apt update && sudo apt install -y docker.io docker-compose nginx
sudo usermod -aG docker $USER
# re-login agar grup docker aktif

2) Push image ke registry

Di lokal/CI:

docker build -t <registry>/<namespace>/vehicle-be:latest .
docker push <registry>/<namespace>/vehicle-be:latest

3) Compose di server

/opt/vehicle-be/docker-compose.yml:

services:
  api:
    image: <registry>/<namespace>/vehicle-be:latest
    container_name: vehicle-be
    restart: unless-stopped
    environment:
      DATABASE_URL: "postgresql://<user>:<pass>@<db-host>:5432/vehicledb?schema=public"
      PORT: 4000
      NODE_ENV: production
      JWT_SECRET: "change-me"
      REFRESH_JWT_SECRET: "change-me-too"
      CORS_ORIGIN: "https://your-domain.com"
    networks: [web]
    expose:
      - "4000"

networks:
  web:
    external: true


Catatan: Untuk DB, gunakan Cloud SQL/managed DB atau container terpisah; jangan simpan data di container app.

4) Nginx reverse proxy

/etc/nginx/sites-available/vehicle-be.conf:

server {
  listen 80;
  server_name your-domain.com;

  location / {
    proxy_pass http://vehicle-be:4000; # jika pakai docker network + nginx-proxy, sesuaikan
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}


Aktifkan:

sudo ln -s /etc/nginx/sites-available/vehicle-be.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

5) SSL (Let’s Encrypt)
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com

6) Jalankan container
cd /opt/vehicle-be
docker network create web || true
docker compose up -d

🤖 Contoh GitHub Actions (CI/CD)

.github/workflows/ci.yml:

name: CI

on:
  push:
    branches: [ main ]

jobs:
  test-and-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx prisma generate
      - run: npm run test
      - run: npm run build

  docker:
    needs: test-and-build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          push: true
          tags: ghcr.io/<owner>/vehicle-be:latest


(Opsional job deploy via SSH/rsync kalau server self-managed.)

🧩 Troubleshooting (Sering Muncul)

ESM import error:
Jika moduleResolution: node16/nodenext, import relatif butuh ekstensi:

import { seedVehicles } from "./seeders/vehicles.js";


Seeding TS error:
Gunakan tsx:
"prisma": { "seed": "tsx prisma/seed.ts" }

req.query getter-only (Express v5):
Jangan assign ke req.query. Simpan hasil validasi ke res.locals atau req.validated.

Prisma P2003 (FK constraint) saat delete user:
Hapus child dulu (deleteMany) atau set onDelete: Cascade di relasi schema.

🗂️ Konvensi Commit (Conventional Commits)

feat(auth): add JWT login and refresh token

feat(user): add CRUD endpoints

feat(vehicle): add pagination & filters

fix(validation): avoid overwriting req.query

chore(prisma): add initial migration

test(vehicle): add integration tests

docs: update API usage in README