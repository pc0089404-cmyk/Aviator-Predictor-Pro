/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Full-Stack Express Server with Vite Middleware
 * Handles server-side API proxy routes, Telegram Bot Webhooks, Paystack Webhooks, and secure secrets.
 */

import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { telegramService } from './src/server/telegramService.js';
import {
  paystackService,
  ADMIN_TELEGRAM_ID,
  ACTIVATION_AMOUNT_KOBO,
} from './src/server/paystackService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Preserve raw body buffer for cryptographically exact Paystack HMAC-SHA512 webhook signature verification
interface CustomRequest extends Request {
  rawBody?: Buffer;
}

app.use(
  express.json({
    verify: (req: CustomRequest, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// -------------------------------------------------------------
// 1. HEALTH & STATUS ENDPOINTS
// -------------------------------------------------------------

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'aviator-predictor-pro',
    timestamp: Date.now(),
  });
});

app.get('/api/status', async (_req: Request, res: Response) => {
  const summary = await telegramService.getStatusSummary();
  res.json(summary);
});

// -------------------------------------------------------------
// 2. TELEGRAM WEBHOOK ENDPOINTS
// -------------------------------------------------------------

app.get('/api/telegram/status', async (_req: Request, res: Response) => {
  const summary = await telegramService.getStatusSummary();
  res.json(summary);
});

app.get('/api/telegram/webhook-info', async (_req: Request, res: Response) => {
  const info = await telegramService.getWebhookInfo();
  res.json(info);
});

app.post('/api/telegram/register-webhook', async (req: Request, res: Response) => {
  const baseUrl =
    process.env.APP_URL?.trim() || `${req.protocol}://${req.get('host')}`;
  const webhookUrl = `${baseUrl.replace(/\/$/, '')}/api/telegram/webhook`;
  const result = await telegramService.registerWebhook(webhookUrl);
  const info = await telegramService.getWebhookInfo();
  res.json({ registration: result, webhookInfo: info, webhookUrl });
});

// Telegram Bot Webhook Receiver
app.post('/api/telegram/webhook', async (req: Request, res: Response) => {
  try {
    const secretHeader = req.headers['x-telegram-bot-api-secret-token'] as
      | string
      | undefined;

    if (!telegramService.verifyWebhookSecret(secretHeader)) {
      res.status(401).json({ error: 'Unauthorized webhook request.' });
      return;
    }

    const update = req.body;
    // Process update asynchronously so Telegram receives 200 OK immediately
    telegramService.processUpdate(update).catch((err) => {
      console.error('Error processing Telegram update:', err);
    });

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook handler exception:', error);
    res.status(200).json({ ok: false });
  }
});

// -------------------------------------------------------------
// 3. PAYSTACK LIVE PAYMENT & WEBHOOK ENDPOINTS
// -------------------------------------------------------------

/**
 * Creates a real Paystack live checkout session
 */
app.post('/api/paystack/initialize', async (req: Request, res: Response) => {
  try {
    const { telegramUserId, telegramUsername, telegramFirstName, email } = req.body;

    if (!telegramUserId) {
      res.status(400).json({ error: 'telegramUserId is required.' });
      return;
    }

    const userId = Number(telegramUserId);
    const callbackUrl = `${telegramService.getAppUrl()}/payment-verify`;

    const result = await paystackService.initializePayment({
      telegramUserId: userId,
      telegramUsername,
      telegramFirstName,
      email,
      callbackUrl,
    });

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (err) {
    console.error('Paystack initialization error:', err);
    res.status(500).json({ error: 'Internal server error initializing payment.' });
  }
});

/**
 * Server-side verification of a Paystack transaction
 */
app.get('/api/paystack/verify', async (req: Request, res: Response) => {
  try {
    const reference = req.query.reference as string | undefined;
    const userId = req.query.userId ? Number(req.query.userId) : undefined;

    if (!reference) {
      res.status(400).json({ error: 'Payment reference query parameter required.' });
      return;
    }

    const result = await paystackService.verifyTransaction(reference, userId);
    res.json(result);
  } catch (err) {
    console.error('Paystack verification route error:', err);
    res.status(500).json({ error: 'Internal server error verifying transaction.' });
  }
});

/**
 * Official Paystack Webhook Receiver
 * Validates HMAC-SHA512 signature and processes successful payments idempotently
 */
app.post('/api/paystack/webhook', async (req: CustomRequest, res: Response) => {
  try {
    const signature = req.headers['x-paystack-signature'] as string | undefined;
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));

    // 1. Cryptographic HMAC-SHA512 Signature Verification
    if (!paystackService.verifyWebhookSignature(rawBody, signature)) {
      console.warn('Paystack webhook rejected: Invalid signature');
      res.status(401).json({ error: 'Invalid Paystack signature.' });
      return;
    }

    const event = req.body;
    console.log('Received valid Paystack webhook event:', event?.event);

    // 2. Handle 'charge.success'
    if (event && event.event === 'charge.success') {
      const data = event.data;
      const reference = data?.reference;
      const amountKobo = data?.amount;
      const currency = data?.currency;
      const status = data?.status;
      const telegramUserId = data?.metadata?.telegram_user_id
        ? Number(data.metadata.telegram_user_id)
        : undefined;

      // Validate exact live requirements: ₦2,000 NGN = 200,000 kobo
      if (
        status === 'success' &&
        amountKobo === ACTIVATION_AMOUNT_KOBO &&
        currency === 'NGN' &&
        reference &&
        telegramUserId
      ) {
        // Idempotently grant access in Firestore
        await paystackService.grantVerifiedAccess({
          reference,
          telegramUserId,
          paystackTransactionId: data.id,
          paidAt: data.paid_at,
        });

        // Send instant notification to the user's Telegram chat
        telegramService
          .sendPaymentApprovedNotification(telegramUserId, reference)
          .catch((err) => {
            console.error('Failed to dispatch Telegram payment approval message:', err);
          });

        console.log(
          `Paystack charge.success verified for user ${telegramUserId} (Ref: ${reference})`
        );
      } else {
        console.warn('Paystack charge.success validation failed:', {
          status,
          amountKobo,
          currency,
          reference,
          telegramUserId,
        });
      }
    }

    // Always respond 200 OK promptly to acknowledge webhook delivery
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Paystack webhook processing exception:', err);
    res.status(200).json({ received: true });
  }
});

// -------------------------------------------------------------
// 4. TELEGRAM MINI APP AUTHENTICATION ENDPOINT
// -------------------------------------------------------------

/**
 * Validates Telegram Mini App initData server-side and returns verified user access status.
 * Never trusts unauthenticated client requests.
 */
app.post('/api/auth/telegram-session', async (req: Request, res: Response) => {
  try {
    const { initData } = req.body;

    if (!initData) {
      res.status(400).json({ error: 'initData string is required.' });
      return;
    }

    const validation = telegramService.validateMiniAppInitData(initData);
    if (!validation.valid || !validation.user) {
      res.status(401).json({
        authorized: false,
        error: validation.error || 'Invalid Telegram Mini App signature.',
      });
      return;
    }

    const user = validation.user;
    const userId = user.id;

    // Check Admin Bypass
    if (userId === ADMIN_TELEGRAM_ID) {
      res.json({
        authorized: true,
        role: 'admin',
        userId,
        user: {
          id: userId,
          firstName: user.first_name,
          username: user.username,
        },
      });
      return;
    }

    // Check Persistent Paid Status
    const userAccess = await paystackService.getUserAccess(userId);
    const isPaid = userAccess.accessStatus === 'paid_verified';

    res.json({
      authorized: isPaid,
      role: isPaid ? 'paid_user' : userAccess.accessStatus,
      userId,
      user: {
        id: userId,
        firstName: user.first_name,
        username: user.username,
      },
      verifiedPaymentReference: userAccess.verifiedPaymentReference,
    });
  } catch (err) {
    console.error('Telegram auth session error:', err);
    res.status(500).json({ error: 'Internal server error verifying Telegram session.' });
  }
});

/**
 * Public User Access Check Endpoint (reads strictly from Firestore server-side)
 */
app.get('/api/user/access-status/:userId', async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.userId);
    if (!userId) {
      res.status(400).json({ error: 'Invalid user ID.' });
      return;
    }

    const userAccess = await paystackService.getUserAccess(userId);
    res.json(userAccess);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching access status.' });
  }
});

// -------------------------------------------------------------
// 5. DEV VS PRODUCTION CLIENT SERVING
// -------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`Aviator Predictor Pro server listening on port ${PORT}`);

    if (telegramService.isConfigured()) {
      console.log('Telegram Bot Token: [Configured securely in server environment]');

      // Auto-register webhook on startup if APP_URL is an HTTPS domain
      const baseUrl = process.env.APP_URL?.trim();
      if (baseUrl && baseUrl.startsWith('https://')) {
        const webhookUrl = `${baseUrl.replace(/\/$/, '')}/api/telegram/webhook`;
        try {
          const reg = await telegramService.registerWebhook(webhookUrl);
          console.log(
            `Telegram webhook auto-registration to ${webhookUrl}:`,
            reg.success ? 'SUCCESS' : reg.description
          );
        } catch (err) {
          console.warn('Telegram webhook auto-registration deferred:', err);
        }
      }
    } else {
      console.log('Telegram Bot Token: [Not configured - set TELEGRAM_BOT_TOKEN in server environment]');
    }

    if (paystackService.isConfigured()) {
      console.log('Paystack Secret Key: [LIVE mode configured securely]');
    } else {
      console.log('Paystack Secret Key: [Not configured - set PAYSTACK_SECRET_KEY in server environment]');
    }
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
