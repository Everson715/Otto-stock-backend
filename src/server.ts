import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import router from './routes';
import { errorHandler } from './middlewares/error-handler';
import { createGeneralLimiter } from './middlewares/rate-limit.middleware';
import { env } from './env';
import { prisma } from './database/prisma';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';

const app = express();

// Confiar no proxy reverso (Nginx) para ler IP corretamente
app.set('trust proxy', 1);

// Segurança HTTP
app.use(helmet());

// CORS
app.use(cors({
    origin: env.CORS_ORIGINS === '*' ? '*' : env.CORS_ORIGINS.split(',')
}));

// Limite do tamanho do corpo da requisição para evitar ataques
app.use(express.json({ limit: '1mb' })); 

// Rate Limiting geral por usuário autenticado (ou IP se anônimo), configurável por RATE_LIMIT_MAX
const limiter = createGeneralLimiter({
    rateLimitMax: env.RATE_LIMIT_MAX,
    nodeEnv: env.NODE_ENV
});
app.use(limiter);

// Rota de Health Check (pública, leve)
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