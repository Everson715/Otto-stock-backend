# Estágio 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl

# Instalar dependências para o build (incluindo devDependencies)
COPY package*.json ./
RUN npm ci --fetch-retries=5 --fetch-retry-factor=2 --fetch-retry-maxtimeout=120000

# Copiar código fonte e schema
COPY . .

# Gerar Prisma Client e compilar TypeScript
RUN npx prisma generate
RUN npx tsc

# Remover devDependencies mantendo apenas dependencias de producao
RUN npm prune --omit=dev

# Estágio 2: Produção
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

# Copiar arquivos necessários do builder
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist

# Copiar entrypoint
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

# Ajustar permissões para usuário não root
RUN chown -R node:node /app
USER node

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
