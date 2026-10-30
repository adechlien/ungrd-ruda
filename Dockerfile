# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM dependencies AS development
COPY --chown=node:node . .
RUN npm run contract:build && chown node:node /app && chown -R node:node server/generated
USER node
ENV NG_CLI_ANALYTICS=false
EXPOSE 8080 4310

FROM dependencies AS build
COPY angular.json tsconfig.json tsconfig.app.json .postcssrc.json ./
COPY src ./src
COPY public ./public
COPY server ./server
RUN npm run contract:build && npm run build

FROM node:24-bookworm-slim AS production-dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

FROM node:24-bookworm-slim AS api
WORKDIR /app
ENV NODE_ENV=production API_HOST=0.0.0.0 API_PORT=4310
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=build /app/server ./server
COPY package.json ./
USER node
EXPOSE 4310
CMD ["node", "server/index.mjs"]

FROM nginx:stable-alpine AS web
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist/ruda-web/browser /usr/share/nginx/html
RUN nginx -t
USER nginx
EXPOSE 8080
ENTRYPOINT ["nginx", "-g", "daemon off;"]
