# stage 1: build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev=false
COPY . .
RUN npm run build

# stage 2: runtime
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
# kalau butuh prisma client (copy prisma schema)
COPY prisma ./prisma
# generate prisma client (opsional; atau lakukan di builder & copy node_modules)
# RUN npx prisma generate

EXPOSE 4000
CMD ["node", "dist/index.js"]
