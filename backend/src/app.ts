import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { router as authRouter } from './routes/auth';
import { router as casalRouter } from './routes/casal';
import { router as configuracoesRouter } from './routes/configuracoes';
import { router as alertasRouter } from './routes/alertas';
import { router as transacoesRouter } from './routes/transacoes';
import { router as pluggyRouter } from './routes/pluggy';
import { router as whatsappRouter } from './routes/whatsapp';
import { router as webhookRouter } from './routes/webhook';
import { router as healthRouter } from './routes/health';
import { errosMiddleware } from './middlewares/erros';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/casal', casalRouter);
app.use('/api/v1/configuracoes', configuracoesRouter);
app.use('/api/v1/alertas', alertasRouter);
app.use('/api/v1/transacoes', transacoesRouter);
app.use('/api/v1/pluggy', pluggyRouter);
app.use('/api/v1/whatsapp', whatsappRouter);
app.use('/api/v1/webhook', webhookRouter);
app.use('/api/v1/health', healthRouter);
app.use(errosMiddleware);

export default app;


