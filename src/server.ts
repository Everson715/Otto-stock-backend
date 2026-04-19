import express from 'express';
import router from './routes';
import { errorHandler } from './middlewares/error-handler';

const app = express();
app.use(express.json());
app.use(router);

// Middleware de erro deve ser o último
app.use(errorHandler);

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});