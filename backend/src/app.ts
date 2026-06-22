import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import routes from './routes/index';
import { errorHandler, notFound } from './middlewares/errorHandler';

const parseAllowedOrigins = (): string[] => {
  const configuredOrigins = process.env.FRONTEND_URL?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return configuredOrigins && configuredOrigins.length > 0
    ? configuredOrigins
    : ['http://localhost:5173'];
};

export const createApp = () => {
  const app = express();
  app.set('trust proxy', 1);
  const allowedOrigins = parseAllowedOrigins();
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
  console.log('ALLOWED_ORIGINS:', allowedOrigins);
  app.use(helmet());
  app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
  }));
  app.options('*', cors());
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

  if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

  app.use('/api', routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
};
