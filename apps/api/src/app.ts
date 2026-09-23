import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { buildOpenApi } from './docs/openapi';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { routes } from './routes';

export const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

/**
 * API баримт бичиг: http://localhost:4000/api/docs
 * Production-д зөвхөн API_DOCS=true үед нээгдэнэ. Helmet CSP-ээс өмнө холбоно (Swagger UI inline script ашигладаг).
 */
if (!env.isProd || process.env.API_DOCS === 'true') {
  let spec: ReturnType<typeof buildOpenApi> | null = null;
  const getSpec = () => (spec ??= buildOpenApi(routes));
  app.get('/api/openapi.json', (_req, res) => res.json(getSpec()));
  app.use('/api/docs', swaggerUi.serve, (req: express.Request, res: express.Response, next: express.NextFunction) =>
    swaggerUi.setup(getSpec(), { customSiteTitle: 'Их Засаг API', swaggerOptions: { persistAuthorization: true, docExpansion: 'none' } })(req, res, next),
  );
}

app.use(helmet());
/** Хөгжүүлэлтийн үед localhost болон дотоод сүлжээний (LAN) бүх хаягийг зөвшөөрнө — IP солигдоход CORS засах шаардлагагүй */
const LAN_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|10(\.\d{1,3}){3}|192\.168(\.\d{1,3}){2}|172\.(1[6-9]|2\d|3[01])(\.\d{1,3}){2})(:\d+)?$/;

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || env.corsOrigins.includes(origin) || (!env.isProd && LAN_ORIGIN.test(origin))) return cb(null, true);
      cb(new Error(`CORS зөвшөөрөгдөөгүй: ${origin}`));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(morgan(env.isProd ? 'combined' : 'dev'));

app.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);
