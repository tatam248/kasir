import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { db } from './src/server/db/store.ts';
import { mysqlService } from './src/server/db/mysql.ts';

// Routers
import authRouter from './src/server/routes/auth.ts';
import usersRouter from './src/server/routes/users.ts';
import productsRouter from './src/server/routes/products.ts';
import mastersRouter from './src/server/routes/masters.ts';
import suppliersRouter from './src/server/routes/suppliers.ts';
import customersRouter from './src/server/routes/customers.ts';
import purchasesRouter from './src/server/routes/purchases.ts';
import salesRouter from './src/server/routes/sales.ts';
import returnsRouter from './src/server/routes/returns.ts';
import inventoryRouter from './src/server/routes/inventory.ts';
import shiftsRouter from './src/server/routes/shifts.ts';
import payablesRouter from './src/server/routes/payables.ts';
import receivablesRouter from './src/server/routes/receivables.ts';
import cashRouter from './src/server/routes/cash.ts';
import reportsRouter from './src/server/routes/reports.ts';
import settingsRouter from './src/server/routes/settings.ts';
import auditRouter from './src/server/routes/audit.ts';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Initialize persistent database
  await db.init();

  app.use(cors());
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/masters', mastersRouter);
  app.use('/api/suppliers', suppliersRouter);
  app.use('/api/customers', customersRouter);
  app.use('/api/purchases', purchasesRouter);
  app.use('/api/sales', salesRouter);
  app.use('/api/returns', returnsRouter);
  app.use('/api/inventory', inventoryRouter);
  app.use('/api/shifts', shiftsRouter);
  app.use('/api/payables', payablesRouter);
  app.use('/api/receivables', receivablesRouter);
  app.use('/api/cash', cashRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/audit', auditRouter);

  // Health check endpoint
  app.get('/api/health', async (req, res) => {
    const dbHealth = await mysqlService.checkHealth();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      engine: dbHealth.connected ? 'MySQL (Connected)' : 'Local Embedded JSON Store',
      mysql: dbHealth,
    });
  });

  // Frontend integration: Vite middleware in dev or static files in prod
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, () => {
    console.log(`[KASIRPRO SERVER] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
