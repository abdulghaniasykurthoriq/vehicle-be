# --- gen (DEBIAN): generate Prisma Client dengan engine musl ---
FROM node:20-bullseye-slim AS gen
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate

# --- builder (ALPINE): build app TS, tanpa prisma generate ---
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl ca-certificates
COPY package*.json ./
RUN npm ci
COPY . .
# timpa prisma client dari stage gen (musl binaries)
COPY --from=gen /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=gen /app/node_modules/.prisma ./node_modules/.prisma
# compile TS → hasilkan dist/
RUN npm run build

# --- runtime (ALPINE) ---
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl ca-certificates

COPY package*.json ./
# bawa node_modules dari builder (sudah include prisma client & engines)
COPY --from=builder /app/node_modules ./node_modules
RUN npm prune --omit=dev

# ⬇️ PENTING: bawa dist + src (src dipakai swagger-jsdoc untuk baca anotasi)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src  ./src
COPY prisma ./prisma

EXPOSE 4000

# Sesuaikan dengan output build kamu:
# - Jika tsconfig rootDir = "src" → biasanya entry ada di dist/index.js
# - Jika rootDir = "." dan entry src/index.ts → dist/src/index.js
CMD ["node", "dist/index.js"]
# Jika perlu: CMD ["node", "dist/src/index.js"]


# # --- gen (DEBIAN): generate Prisma Client dengan engine musl ---
# FROM node:20-bullseye-slim AS gen
# WORKDIR /app
# RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl && rm -rf /var/lib/apt/lists/*
# COPY package*.json ./
# RUN npm ci
# # cukup copy folder prisma + file yang dipakai saat generate
# COPY prisma ./prisma
# # kalau client pakai env, copy .env juga (opsional)
# # COPY .env ./.env
# # generate client dgn target musl (sesuai schema.prisma)
# RUN npx prisma generate

# # --- builder (ALPINE): build app TS, tanpa prisma generate ---
# FROM node:20-alpine AS builder
# WORKDIR /app
# RUN apk add --no-cache openssl ca-certificates
# COPY package*.json ./
# RUN npm ci
# COPY . .
# # timpa hasil prisma client dari stage gen
# # ini berisi node_modules/@prisma/client + .prisma/engines dgn musl binaries
# COPY --from=gen /app/node_modules/@prisma ./node_modules/@prisma
# COPY --from=gen /app/node_modules/.prisma ./node_modules/.prisma
# # compile TS (opsi 2: rootDir ".", seed ikut dist)
# RUN npm run build

# # --- runtime (ALPINE) ---
# FROM node:20-alpine
# WORKDIR /app
# ENV NODE_ENV=production
# RUN apk add --no-cache openssl ca-certificates
# COPY package*.json ./
# # bawa semua node_modules dari builder (sudah ada prisma client & engines)
# COPY --from=builder /app/node_modules ./node_modules
# RUN npm prune --omit=dev
# COPY --from=builder /app/dist ./dist
# COPY prisma ./prisma
# EXPOSE 4000
# # kalau tsconfig rootDir "." ⇒ hasilnya dist/src/index.js
# CMD ["node", "dist/src/index.js"]
