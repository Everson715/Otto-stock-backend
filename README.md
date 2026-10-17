# Otto Stock Backend & Infraestrutura

Repositório principal do Backend e Orquestração Docker da Clínica.

## Subindo o projeto

1. **Configurar variáveis:**
   Copie o arquivo de exemplo e edite se necessário:
   ```bash
   cp .env.example .env
   ```

2. **Subir os containers:**
   - **Produção (sem expor a porta 3000 da API para o mundo; acesso apenas via Nginx na porta 80):**
     ```bash
     docker compose -f docker-compose.yml up -d --build
     ```
   - **Desenvolvimento local (carrega automaticamente `docker-compose.override.yml`, publicando `3000:3000`):**
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
- **Backend (API via Nginx):** http://localhost/api/
- **Documentação (Swagger):** http://localhost/api/docs/
- **Healthcheck:** http://localhost/api/health

## Configuração de Proxy Reverso e Rate Limiting

As seguintes variáveis de ambiente controlam a proteção contra força bruta, *credential stuffing* e abuso da API:

| Variável | Padrão | Descrição |
| :--- | :--- | :--- |
| `TRUST_PROXY` | `1` | Número de saltos de proxy reverso confiáveis para extração do IP real via `X-Forwarded-For`. Com apenas o Nginx do Docker Compose, mantenha `1`. Caso a aplicação fique atrás de outro balanceador/CDN (ex.: Cloudflare, AWS ALB, Traefik + Nginx), ajuste o valor para o número total de proxies confiáveis (ex.: `2`). |
| `RATE_LIMIT_MAX` | `600` (prod) / `3000` (dev) | Limite de requisições por janela de **15 minutos** por **usuário autenticado** (`user:<id>`). Validado entre `10` e `100000` (valores fora da faixa impedem o servidor de iniciar). *Fail-safe*: o limite folgado (`3000`) só é aplicado se `NODE_ENV === "development"` exatamente; qualquer outro valor ou ausência usa o limite de produção (`600`). |
| `RATE_LIMIT_ANON_MAX` | `120` (prod) / `600` (dev) | Limite de requisições por janela de **15 minutos** por **IP** para visitantes não autenticados (ou tokens inválidos/expirados). Validado entre `10` e `100000`. |
| `RATE_LIMIT_KEY_SECRET` | *(fallback para `JWT_SECRET`)* | Segredo (mínimo 10 caracteres) usado para gerar hashes `HMAC-SHA256` de e-mails e IPs nas chaves e logs do rate limit, garantindo que e-mails nunca fiquem armazenados em texto puro na memória ou em logs. |

### Regras de Proteção de Login (`POST /api/auth/login`)
Todas as três camadas abaixo usam `skipSuccessfulRequests: true` (apenas falhas de login consomem a franquia):
1. **Por IP + E-mail (HMAC-SHA256):** máx. **5 falhas / minuto**.
2. **Por IP (todos os e-mails):** máx. **20 falhas / minuto** (mitigação de *credential stuffing* a partir de um único IP).
3. **Por E-mail (todos os IPs):** máx. **10 falhas / 15 minutos** (mitigação de força bruta distribuída contra uma mesma conta).

### Armazenamento dos Contadores (In-Memory Store)
- Os contadores de rate limit são mantidos **em memória** (`MemoryStore` padrão do `express-rate-limit`) no processo da API e **zeram em caso de restart/redeploy** do container.
- Esse modelo é adequado para execução em instância única da API. Caso a arquitetura evolua para **múltiplas réplicas/instâncias horizontais** da API, recomenda-se plugar um store compartilhado (como **Redis** via `rate-limit-redis`).

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
