# Otto Stock Backend & Infraestrutura

Repositório principal do Backend e Orquestração Docker da Clínica.

## Subindo o projeto (Produção Local com Docker)

1. **Configurar variáveis:**
   Copie o arquivo de exemplo e edite se necessário:
   ```bash
   cp .env.example .env
   ```

2. **Subir os containers:**
   ```bash
   docker compose up -d --build
   ```
   *Isso irá subir o PostgreSQL, o Backend (API) e o Nginx servindo o Frontend.*

3. **Criar o usuário Admin (Seed):**
   ```bash
   docker compose exec api npx prisma db seed
   ```

4. **Ver os logs:**
   ```bash
   docker compose logs -f
   ```

## Acessando o Sistema

- **Frontend:** http://localhost/
- **Backend (API):** http://localhost/api/
- **Documentação (Swagger):** http://localhost/api/docs/
- **Healthcheck:** http://localhost/api/health

## Parando o sistema

Para parar os containers sem perder os dados:
```bash
docker compose stop
```

Para derrubar tudo e **APAGAR** o banco de dados (Cuidado!):
```bash
docker compose down -v
```

## Backup e Restauração

**Backup:**
```bash
docker compose exec db pg_dump -U postgres -d clinica > backup.sql
```

**Restaurar:**
```bash
cat backup.sql | docker compose exec -T db psql -U postgres -d clinica
```
