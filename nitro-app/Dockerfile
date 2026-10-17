FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.13.1 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build && pnpm build:migrate && pnpm prune --prod

FROM node:22-alpine
ENV NODE_ENV=production NITRO_HOST=0.0.0.0 NITRO_PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /app/.output ./.output
COPY --from=build --chown=node:node /app/database/migrations ./.output/migrations
COPY --from=build --chown=node:node /app/node_modules ./node_modules
RUN mkdir -p /app/private-files && chown node:node /app/private-files
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
