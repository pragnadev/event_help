# Build stage
FROM node:20-alpine AS build

WORKDIR /app

ARG GEMINI_API_KEY
ENV GEMINI_API_KEY=${GEMINI_API_KEY}

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Runtime stage
FROM node:20-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY server.mjs ./server.mjs

EXPOSE 3000
CMD ["node", "server.mjs"]

