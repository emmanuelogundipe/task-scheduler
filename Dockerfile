# ============================================================
# Odyssey Scheduler — production image
# ============================================================
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npx prisma generate && npm run build

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL="file:/data/odyssey.db"
ENV APP_TIMEZONE="Africa/Lagos"

EXPOSE 3000

# Migrations, seed defaults, then start the server (the cron
# scheduler starts automatically via instrumentation.ts).
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && npm start"]
