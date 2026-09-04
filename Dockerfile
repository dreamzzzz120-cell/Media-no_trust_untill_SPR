FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV PORT=8080
ENV UPLOAD_DIR=/data/uploads
WORKDIR /app
RUN useradd --system --uid 10001 appuser && mkdir -p /data/uploads && chown -R appuser:appuser /data /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY public ./public
COPY package.json ./
USER appuser
EXPOSE 8080
VOLUME ["/data"]
CMD ["node", "dist/server.js"]
