# --- builder ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# prisma generate kadang gagal download engine di Alpine; jangan blok build
RUN npx prisma generate || echo "skip prisma"
RUN npm run build

# --- runtime ---
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
RUN npm prune --omit=dev
COPY --from=builder /app/dist ./dist
COPY prisma ./prisma
EXPOSE 4000
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
