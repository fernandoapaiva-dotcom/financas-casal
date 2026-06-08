import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { router as authRouter } from './routes/auth';
import { router as casalRouter } from './routes/casal';
import { errosMiddleware } from './middlewares/erros';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/casal', casalRouter);
app.use(errosMiddleware);

export default app;
