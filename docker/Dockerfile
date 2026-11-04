# syntax=docker/dockerfile:1
# 建置：docker build -f docker/Dockerfile -t hk-primary-learn .   （在倉庫根目錄執行）
# 支援 linux/amd64 與 linux/arm64（用 buildx，見 .github/workflows/release.yml）

FROM node:22-bookworm-slim AS deps
WORKDIR /app
# 不需要編譯工具：better-sqlite3 與 @node-rs/argon2 都自帶預編譯檔（見 apps/web/.npmrc）
COPY apps/web/package.json apps/web/package-lock.json apps/web/.npmrc ./
RUN npm ci

FROM deps AS build
COPY apps/web/ ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-bookworm-slim AS runtime
LABEL org.opencontainers.image.title="學童通 HK Primary Learn" \
      org.opencontainers.image.description="香港小學 P1–P6 開源教學與練習平台" \
      org.opencontainers.image.licenses="AGPL-3.0-only" \
      org.opencontainers.image.source="https://github.com/OWNER/hk-primary-learn"
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATA_DIR=/data \
    CONTENT_DIR=/content
WORKDIR /app
RUN mkdir -p /data /content && chown node:node /data
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/drizzle ./drizzle
COPY --from=build --chown=node:node /app/scripts/cli.mjs ./scripts/cli.mjs
COPY content /content
# 維護工具：docker compose exec app cli reset-admin
RUN printf '#!/bin/sh\nexec node /app/scripts/cli.mjs "$@"\n' > /usr/local/bin/cli && chmod +x /usr/local/bin/cli
USER node
VOLUME ["/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
