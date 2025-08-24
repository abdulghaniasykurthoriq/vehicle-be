# --- builder ---
FROM node:20-alpine AS builder
WORKDIR /app

# tools yang dibutuhkan prisma di alpine
RUN apk add --no-cache openssl ca-certificates

COPY package*.json ./
RUN npm ci

COPY . .

# prisma generate: retry 3x biar gak gagal karena jaringan
# kalau tetap gagal, lanjutkan build (nanti generate di runtime)
RUN for i in 1 2 3; do npx prisma generate && exit 0 || echo "prisma generate retry $i"; sleep 3; done; \
    echo "skip prisma in builder"

# compile TS (opsi 2: rootDir ".", seed ikut ke dist)
RUN npm run build

# --- runtime ---
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# prisma runtime butuh openssl & CA juga
RUN apk add --no-cache openssl ca-certificates

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
RUN npm prune --omit=dev

COPY --from=builder /app/dist ./dist
COPY prisma ./prisma

# (opsional) mirror engine kalau binaries.prisma.sh sering lemot/blok
# ENV PRISMA_ENGINES_MIRROR=https://prisma-builds.vercel.app

EXPOSE 4000
# tsconfig kamu opsi 2 (rootDir "."): hasilnya dist/src/index.js
CMD ["node", "dist/src/index.js"]


# # --- builder ---
# FROM node:20-alpine AS builder
# WORKDIR /app
# COPY package*.json ./
# RUN npm ci
# COPY . .
# # generate prisma client dulu
# RUN npx prisma generate || echo "skip prisma"
# # compile TS (ESM)
# RUN npm run build

# # --- runtime ---
# FROM node:20-alpine
# WORKDIR /app
# ENV NODE_ENV=production
# # optional: biar stacktrace rapi ke TS
# ENV NODE_OPTIONS=--enable-source-maps
# COPY package*.json ./
# COPY --from=builder /app/node_modules ./node_modules
# RUN npm prune --omit=dev
# COPY --from=builder /app/dist ./dist
# COPY prisma ./prisma
# EXPOSE 4000
# CMD ["node", "dist/index.js"]
