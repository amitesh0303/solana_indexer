# ─── Build stage ─────────────────────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ─── Runtime stage ────────────────────────────────────────────────────────────
FROM node:20-slim

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "dist/index.js"]
