import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import router from './routes';
import { errorHandler } from './middlewares/error-handler';
import { createGeneralLimiter, logRateLimitStartupConfig } from './middlewares/rate-limit.middleware';
import { env } from './env';
import { prisma } from './database/prisma';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';

const app = express();

// Confiar no número configurado de proxies reversos (padrão 1 = Nginx; ajustar se houver balanceador adicional)
app.set('trust proxy', env.TRUST_PROXY);

// Segurança HTTP
app.use(helmet());

// CORS
app.use(cors({
    origin: env.CORS_ORIGINS === '*' ? '*' : env.CORS_ORIGINS.split(',')
}));

// Limite do tamanho do corpo da requisição para evitar ataques
app.use(express.json({ limit: '1mb' })); 

// Rate Limiting geral por usuário autenticado (RATE_LIMIT_MAX) e por IP para visitantes (RATE_LIMIT_ANON_MAX)
const limiter = createGeneralLimiter({
    rateLimitMax: env.RATE_LIMIT_MAX,
    rateLimitAnonMax: env.RATE_LIMIT_ANON_MAX,
    nodeEnv: env.NODE_ENV,
    keySecret: env.RATE_LIMIT_KEY_SECRET
});
app.use(limiter);

// Rota de Health Check (pública, leve, isenta de rate limit)
const healthHandler = async (_req: express.Request, res: express.Response) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.status(200).json({ status: 'ok', database: 'connected' });
    } catch (err) {
        res.status(500).json({ status: 'error', database: 'disconnected' });
    }
};
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// Documentação
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Rotas principais prefixadas
app.use('/api', router);

// Erros global
app.use(errorHandler);

const server = app.listen(env.PORT, () => {
    console.log(`Server is running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    logRateLimitStartupConfig({
        nodeEnv: env.NODE_ENV,
        trustProxy: env.TRUST_PROXY,
        rateLimitMax: env.RATE_LIMIT_MAX,
        rateLimitAnonMax: env.RATE_LIMIT_ANON_MAX,
        hasCustomKeySecret: Boolean(env.RATE_LIMIT_KEY_SECRET)
    });
});

// Graceful Shutdown
const gracefulShutdown = async () => {
    console.log('SIGTERM recebido, encerrando servidor graciosamente...');
    server.close(async () => {
        console.log('Servidor HTTP fechado.');
        await prisma.$disconnect();
        console.log('Conexões com banco encerradas.');
        process.exit(0);
    });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);