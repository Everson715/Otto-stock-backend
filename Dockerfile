# Estágio 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependências para o build (incluindo devDependencies)
COPY package*.json ./
RUN npm ci

# Copiar código fonte e schema
COPY . .

# Gerar Prisma Client e compilar TypeScript
RUN npx prisma generate
RUN npx tsc

# Estágio 2: Produção
FROM node:20-alpine

WORKDIR /app

# Instalar dependências de produção apenas
COPY package*.json ./
RUN npm ci --omit=dev

# Copiar schema prisma para geração e pasta dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist

# Gerar Prisma Client de produção
RUN npx prisma generate

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
