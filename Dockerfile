# syntax=docker/dockerfile:1
# Multi-target Dockerfile for DigitalOcean or other single-image builds.
# Default target builds the FastAPI service; specify --target web to build the Next.js frontend container.

##############################
# API image (default target) #
##############################
FROM python:3.11-slim AS api-base
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY services/api/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY services/api /app
ENV PYTHONPATH=/app
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

###############################
# Web image (opt-in target)   #
###############################
FROM node:20-alpine AS web-build
WORKDIR /app
# Install both production and dev dependencies so Tailwind and other build-time
# tools are available during the Next.js compilation step. The runtime image
# remains production-focused.
ENV NEXT_TELEMETRY_DISABLED=1

COPY services/web/package*.json ./
RUN npm install
COPY services/web ./
RUN npm run build

FROM node:20-alpine AS web
WORKDIR /app
ENV NODE_ENV=production

COPY --from=web-build /app/.next ./.next
COPY --from=web-build /app/public ./public
COPY --from=web-build /app/package.json ./package.json
COPY --from=web-build /app/next.config.js ./next.config.js
COPY --from=web-build /app/tsconfig.json ./tsconfig.json
COPY --from=web-build /app/node_modules ./node_modules

EXPOSE 3000
CMD ["npm", "run", "start", "--", "-H", "0.0.0.0", "-p", "3000"]
