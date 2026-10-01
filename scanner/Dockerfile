FROM node:22-bookworm-slim
WORKDIR /app
COPY scanner/server.mjs ./server.mjs
USER node
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
CMD ["node","server.mjs"]
