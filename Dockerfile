FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npx vite build
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npx", "tsx", "server/index.ts"]
