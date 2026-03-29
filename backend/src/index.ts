import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { prisma } from './prisma.js';

const app = express();

const PORT = Number(process.env.PORT || 4000);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'nexus-backend', time: new Date().toISOString() });
});

app.get('/events', async (_req, res) => {
  try {
    const events = await prisma.event.findMany({
      where: { isActive: true },
      orderBy: { date: 'asc' },
      include: {
        coordinator: { select: { id: true, name: true, role: true } },
        studentCoordinator: { select: { id: true, name: true, role: true } },
      },
    });
    res.json(events);
  } catch {
    res.status(503).json({ error: 'Database unavailable. Configure PostgreSQL and run migrations.' });
  }
});

app.get('/events/:id', async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: {
        coordinator: { select: { id: true, name: true, role: true } },
        studentCoordinator: { select: { id: true, name: true, role: true } },
      },
    });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event);
  } catch {
    res.status(503).json({ error: 'Database unavailable. Configure PostgreSQL and run migrations.' });
  }
});

/** Matches Next.js magic flow: OTP in DB + email via your SMTP (implement transport in production). */
app.post('/auth/magic/request', async (req, res) => {
  const body = z.object({ email: z.string().email() }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'Invalid email' });

  try {
    const user = await prisma.user.findUnique({ where: { email: body.data.email } });
    if (!user) {
      return res.json({ ok: true });
    }
    const otp = Math.random().toString(36).substring(2, 10);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await prisma.user.update({
      where: { id: user.id },
      data: { otp, otpExpiry },
    });
    const baseUrl = process.env.FRONTEND_ORIGIN || FRONTEND_ORIGIN;
    console.info(`[nexus-backend magic] ${body.data.email} → ${baseUrl}/auth/verify?token=${otp}`);
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: 'Could not start magic login' });
  }
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[nexus-backend] listening on http://localhost:${PORT}`);
});

