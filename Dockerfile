# HF Spaces 部署：Express 后端代理 DeepSeek API
FROM node:20-slim

WORKDIR /app

COPY web/package.json web/package-lock.json ./
RUN npm install --production

COPY web/server/ ./server/

ENV PORT=7860
EXPOSE 7860

CMD ["npx", "tsx", "server/index.ts"]
