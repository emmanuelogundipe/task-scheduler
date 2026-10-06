# ============================================================
# Odyssey Scheduler — production image (PostgreSQL)
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
ENV APP_TIMEZONE="Africa/Lagos"

EXPOSE 3000

# Sync the schema, seed defaults, then start the server (the cron
# scheduler starts automatically via instrumentation.ts).
# DATABASE_URL must point to a PostgreSQL database.
CMD ["sh", "-c", "npx prisma db push --skip-generate && npx prisma db seed && npm start"]
