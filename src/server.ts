import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import router from './routes';
import { errorHandler } from './middlewares/error-handler';
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

// Rate Limiting global (100 reqs / 15 min por IP)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100, 
    message: { error: true, message: 'Muitas requisições deste IP, tente novamente mais tarde.' }
});
app.use(limiter);

// Limite do tamanho do corpo da requisição para evitar ataques
app.use(express.json({ limit: '1mb' })); 

// Rota de Health Check
app.get('/api/health', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.status(200).json({ status: 'ok', database: 'connected' });
    } catch (err) {
        res.status(500).json({ status: 'error', database: 'disconnected' });
    }
});

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