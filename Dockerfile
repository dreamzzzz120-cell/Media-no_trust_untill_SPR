FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV PORT=8080
ENV UPLOAD_DIR=/tmp/spr-media-uploads
WORKDIR /app
RUN useradd --system --uid 10001 appuser && mkdir -p /tmp/spr-media-uploads && chown -R appuser:appuser /tmp/spr-media-uploads /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY db ./db
COPY public ./public
COPY package.json ./
USER appuser
EXPOSE 8080
CMD ["node", "dist/server.js"]
