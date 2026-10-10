import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import router from './routes';
import { errorHandler } from './middlewares/error-handler';

const app = express();

// Segurança HTTP
app.use(helmet());

// CORS
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : '*'
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

// Rotas da API
app.use(router);

// Handler global de erros (deve ser o último)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});