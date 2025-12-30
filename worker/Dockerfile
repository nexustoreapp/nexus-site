# Imagem oficial do Playwright com Chromium + libs nativas
FROM mcr.microsoft.com/playwright:v1.43.0-jammy

# Diretório de trabalho dentro do container
WORKDIR /app

# Copia apenas os manifests primeiro (melhor cache de build)
COPY package.json package-lock.json* ./

# Instala dependências (inclui google-translate-api)
RUN npm ci --omit=dev || npm install

# Copia o resto do código
COPY . .

# Garante que o Node rode em produção
ENV NODE_ENV=production

# Comando final do worker
CMD ["node", "worker.js"]