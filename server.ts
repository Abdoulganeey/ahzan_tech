import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { requireAuth, type AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser, isAdminEmail } from './src/db/users.ts';
import {
  createSqlTask,
  getSqlCrmOverview,
  upsertSqlLeads,
  type SqlLeadUpsertInput,
} from './src/db/crm.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/sql/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user?.uid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const user = await getOrCreateUser(req.user.uid, req.user.email || '');
      res.json({ user });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to load profile';
      res.status(500).json({ error: message });
    }
  });

  app.get('/api/sql/crm/overview', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user?.uid || !isAdminEmail(req.user.email)) {
        return res.status(403).json({ error: 'Forbidden: Admin access required' });
      }
      const user = await getOrCreateUser(req.user.uid, req.user.email || '');
      const overview = await getSqlCrmOverview(user.id);
      res.json(overview);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch CRM overview';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/sql/crm/sync-leads', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user?.uid || !isAdminEmail(req.user.email)) {
        return res.status(403).json({ error: 'Forbidden: Admin access required' });
      }
      const items = Array.isArray(req.body?.leads)
        ? (req.body.leads as SqlLeadUpsertInput[])
        : [];
      const user = await getOrCreateUser(req.user.uid, req.user.email || '');
      const result = await upsertSqlLeads(user.id, items);
      res.json(result);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to sync CRM leads';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/sql/crm/tasks', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user?.uid || !isAdminEmail(req.user.email)) {
        return res.status(403).json({ error: 'Forbidden: Admin access required' });
      }
      const user = await getOrCreateUser(req.user.uid, req.user.email || '');
      const { externalId, leadRankId, companyName, title, priority, dueAtMillis } =
        req.body || {};

      if (!externalId || !companyName || !title) {
        return res.status(400).json({ error: 'Missing required task fields' });
      }

      const task = await createSqlTask({
        externalId: String(externalId),
        userId: user.id,
        leadRankId: Number(leadRankId) || 1,
        companyName: String(companyName),
        title: String(title),
        priority: String(priority || 'MEDIUM'),
        dueAtMillis: Number(dueAtMillis) || Date.now(),
      });
      res.status(201).json({ task });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to save follow-up task';
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
