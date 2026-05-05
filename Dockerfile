FROM node:24-slim AS deps
WORKDIR /app

COPY package*.json ./
# Include prisma schema if needed for postinstall scripts
COPY prisma ./prisma/ 
RUN npm ci --no-audit --no-fund

FROM node:24-slim AS builder
WORKDIR /app

ARG DATABASE_URL=postgresql://postgres:postgres@localhost:5432/smallholder_hub
ENV DATABASE_URL=${DATABASE_URL}

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# CRITICAL: Generate the Prisma Client before building
RUN npx prisma generate

RUN npm run build

FROM node:24-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "run", "start"]
