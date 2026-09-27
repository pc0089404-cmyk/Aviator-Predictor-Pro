/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Full-Stack Express Server with Vite Middleware
 * Handles server-side API proxy routes, Telegram Bot Webhooks,
 * Paystack Webhooks, Website User IDs, and secure secrets.
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

/*
 * IMPORTANT:
 * This is the WEBSITE User ID administrator.
 *
 * It is intentionally different from:
 * ADMIN_TELEGRAM_ID = 7760779963
 */
const WEBSITE_ADMIN_USER_ID = 9130619144;

// Preserve raw body for exact Paystack HMAC-SHA512 verification.
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
// HELPERS
// -------------------------------------------------------------

/**
 * Generate a numeric website User ID.
 *
 * The ID is generated server-side and checked against the existing
 * access store before being accepted.
 *
 * The website admin ID is never generated for normal users.
 */
async function generateWebsiteUserId(): Promise<number> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const userId =
      Math.floor(1000000000 + Math.random() * 9000000000);

    if (userId === WEBSITE_ADMIN_USER_ID) {
      continue;
    }

    const existing = await paystackService.getUserAccess(userId);

    if (
      !existing ||
      existing.accessStatus === 'unpaid'
    ) {
      return userId;
    }
  }

  throw new Error('Unable to generate a unique User ID.');
}

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
    process.env.APP_URL?.trim() ||
    `${req.protocol}://${req.get('host')}`;

  const webhookUrl =
    `${baseUrl.replace(/\/$/, '')}/api/telegram/webhook`;

  const result = await telegramService.registerWebhook(webhookUrl);
  const info = await telegramService.getWebhookInfo();

  res.json({
    registration: result,
    webhookInfo: info,
    webhookUrl,
  });
});

// Telegram Bot Webhook Receiver
app.post('/api/telegram/webhook', async (req: Request, res: Response) => {
  try {
    const secretHeader =
      req.headers['x-telegram-bot-api-secret-token'] as
        | string
        | undefined;

    if (!telegramService.verifyWebhookSecret(secretHeader)) {
      res.status(401).json({
        error: 'Unauthorized webhook request.',
      });
      return;
    }

    const update = req.body;

    telegramService.processUpdate(update).catch((err) => {
      console.error(
        'Error processing Telegram update:',
        err
      );
    });

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error(
      'Telegram webhook handler exception:',
      error
    );

    res.status(200).json({ ok: false });
  }
});

// -------------------------------------------------------------
// 3. TELEGRAM PAYSTACK LIVE PAYMENT
// -------------------------------------------------------------

/**
 * Creates a real Paystack LIVE checkout session for Telegram users.
 */
app.post('/api/paystack/initialize', async (req: Request, res: Response) => {
  try {
    const {
      telegramUserId,
      telegramUsername,
      telegramFirstName,
      email,
    } = req.body;

    if (!telegramUserId) {
      res.status(400).json({
        error: 'telegramUserId is required.',
      });
      return;
    }

    const userId = Number(telegramUserId);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      res.status(400).json({
        error: 'Invalid Telegram user ID.',
      });
      return;
    }

    const callbackUrl =
      `${telegramService.getAppUrl()}/payment-verify`;

    const result =
      await paystackService.initializePayment({
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
    console.error(
      'Paystack initialization error:',
      err
    );

    res.status(500).json({
      error:
        'Internal server error initializing payment.',
    });
  }
});

/**
 * Server-side verification of a Telegram Paystack transaction.
 */
app.get('/api/paystack/verify', async (req: Request, res: Response) => {
  try {
    const reference =
      req.query.reference as string | undefined;

    const userId =
      req.query.userId
        ? Number(req.query.userId)
        : undefined;

    if (!reference) {
      res.status(400).json({
        error:
          'Payment reference query parameter required.',
      });
      return;
    }

    const result =
      await paystackService.verifyTransaction(
        reference,
        userId
      );

    res.json(result);
  } catch (err) {
    console.error(
      'Paystack verification route error:',
      err
    );

    res.status(500).json({
      error:
        'Internal server error verifying transaction.',
    });
  }
});

// -------------------------------------------------------------
// 4. WEBSITE USER ID SYSTEM
// -------------------------------------------------------------

/**
 * Verify a website User ID.
 *
 * This endpoint does NOT trust the browser to grant access.
 * The actual access status is read server-side.
 */
app.get(
  '/api/website/user-id/verify/:userId',
  async (req: Request, res: Response) => {
    try {
      const userId = Number(req.params.userId);

      if (
        !Number.isSafeInteger(userId) ||
        userId <= 0
      ) {
        res.status(400).json({
          valid: false,
          access: false,
          error: 'Invalid User ID.',
        });
        return;
      }

      // Website administrator.
      if (userId === WEBSITE_ADMIN_USER_ID) {
        res.json({
          valid: true,
          access: true,
          role: 'admin',
          userId,
        });
        return;
      }

      const userAccess =
        await paystackService.getUserAccess(userId);

      const paid =
        userAccess?.accessStatus === 'paid_verified';

      res.json({
        valid: paid,
        access: paid,
        role: paid ? 'paid_user' : 'unpaid',
        userId,
        status:
          userAccess?.accessStatus || 'unpaid',
      });
    } catch (err) {
      console.error(
        'Website User ID verification error:',
        err
      );

      res.status(500).json({
        valid: false,
        access: false,
        error: 'Unable to verify User ID.',
      });
    }
  }
);

/**
 * Create a REAL Paystack LIVE payment for a new website User ID.
 *
 * A User ID is generated server-side first.
 * It remains pending until Paystack verification succeeds.
 */
app.post(
  '/api/website/user-id/purchase',
  async (req: Request, res: Response) => {
    try {
      const {
        email,
        existingUserId,
      } = req.body;

      /*
       * If the browser already has a pending User ID,
       * allow it to continue that purchase instead of
       * generating another ID.
       */
      let websiteUserId: number;

      if (existingUserId) {
        const suppliedId = Number(existingUserId);

        if (
          Number.isSafeInteger(suppliedId) &&
          suppliedId > 0 &&
          suppliedId !== WEBSITE_ADMIN_USER_ID
        ) {
          const existingAccess =
            await paystackService.getUserAccess(
              suppliedId
            );

          if (
            existingAccess?.accessStatus ===
            'payment_pending'
          ) {
            websiteUserId = suppliedId;
          } else {
            websiteUserId =
              await generateWebsiteUserId();
          }
        } else {
          websiteUserId =
            await generateWebsiteUserId();
        }
      } else {
        websiteUserId =
          await generateWebsiteUserId();
      }

      /*
       * We use the existing secure Paystack service.
       * The generated website User ID is used as the
       * internal access-record identifier.
       *
       * The actual access is NOT granted until Paystack
       * verification succeeds.
       */
      const callbackUrl =
        `${telegramService.getAppUrl()}` +
        `/payment-verify?type=website-user` +
        `&userId=${websiteUserId}`;

      const result =
        await paystackService.initializePayment({
          telegramUserId: websiteUserId,
          email:
            email ||
            `user_${websiteUserId}@aviatorpredictor.pro`,
          callbackUrl,
        });

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.json({
        success: true,
        userId: websiteUserId,
        authorizationUrl:
          result.authorizationUrl,
        reference: result.reference,
        amount: 2000,
        currency: 'NGN',
      });
    } catch (err) {
      console.error(
        'Website User ID purchase error:',
        err
      );

      res.status(500).json({
        success: false,
        error:
          'Unable to create the User ID payment.',
      });
    }
  }
);

/**
 * Verify a website User ID payment.
 *
 * Paystack is contacted server-side through the existing
 * verification service. A browser success message alone
 * cannot grant access.
 */
app.get(
  '/api/website/user-id/payment-verify',
  async (req: Request, res: Response) => {
    try {
      const reference =
        req.query.reference as string | undefined;

      const userId =
        req.query.userId
          ? Number(req.query.userId)
          : undefined;

      if (!reference) {
        res.status(400).json({
          success: false,
          error:
            'Payment reference is required.',
        });
        return;
      }

      if (
        !userId ||
        !Number.isSafeInteger(userId) ||
        userId <= 0
      ) {
        res.status(400).json({
          success: false,
          error:
            'Website User ID is required.',
        });
        return;
      }

      // Never allow the website admin to create a fake payment.
      if (userId === WEBSITE_ADMIN_USER_ID) {
        res.json({
          success: true,
          verified: true,
          access: true,
          role: 'admin',
          userId,
        });
        return;
      }

      /*
       * This performs the real Paystack verification:
       * - status
       * - amount
       * - currency
       * - transaction reference
       * - user ID metadata
       */
      const result =
        await paystackService.verifyTransaction(
          reference,
          userId
        );

      const verified =
        result?.success === true;

      res.json({
        success: verified,
        verified,
        access: verified,
        role: verified
          ? 'paid_user'
          : 'payment_failed',
        userId,
        reference,
        result,
      });
    } catch (err) {
      console.error(
        'Website User ID payment verification error:',
        err
      );

      res.status(500).json({
        success: false,
        verified: false,
        access: false,
        error:
          'Unable to verify the Paystack payment.',
      });
    }
  }
);

/**
 * Check the persistent status of a website User ID.
 */
app.get(
  '/api/website/user-id/status/:userId',
  async (req: Request, res: Response) => {
    try {
      const userId = Number(req.params.userId);

      if (
        !Number.isSafeInteger(userId) ||
        userId <= 0
      ) {
        res.status(400).json({
          valid: false,
          access: false,
          error: 'Invalid User ID.',
        });
        return;
      }

      if (userId === WEBSITE_ADMIN_USER_ID) {
        res.json({
          valid: true,
          access: true,
          role: 'admin',
          userId,
          status: 'admin',
        });
        return;
      }

      const access =
        await paystackService.getUserAccess(userId);

      const paid =
        access?.accessStatus === 'paid_verified';

      res.json({
        valid: paid,
        access: paid,
        role: paid ? 'paid_user' : 'unpaid',
        userId,
        status:
          access?.accessStatus || 'unpaid',
        verifiedPaymentReference:
          access?.verifiedPaymentReference,
      });
    } catch (err) {
      console.error(
        'Website User ID status error:',
        err
      );

      res.status(500).json({
        valid: false,
        access: false,
        error:
          'Unable to retrieve User ID status.',
      });
    }
  }
);

// -------------------------------------------------------------
// 5. PAYSTACK WEBHOOK
// -------------------------------------------------------------

/**
 * Official Paystack Webhook Receiver.
 *
 * Validates HMAC-SHA512 before processing.
 */
app.post(
  '/api/paystack/webhook',
  async (req: CustomRequest, res: Response) => {
    try {
      const signature =
        req.headers['x-paystack-signature'] as
          | string
          | undefined;

      const rawBody =
        req.rawBody ||
        Buffer.from(JSON.stringify(req.body));

      if (
        !paystackService.verifyWebhookSignature(
          rawBody,
          signature
        )
      ) {
        console.warn(
          'Paystack webhook rejected: Invalid signature'
        );

        res.status(401).json({
          error: 'Invalid Paystack signature.',
        });

        return;
      }

      const event = req.body;

      console.log(
        'Received valid Paystack webhook event:',
        event?.event
      );

      if (
        event &&
        event.event === 'charge.success'
      ) {
        const data = event.data;

        const reference =
          data?.reference;

        const amountKobo =
          data?.amount;

        const currency =
          data?.currency;

        const status =
          data?.status;

        const telegramUserId =
          data?.metadata?.telegram_user_id
            ? Number(
                data.metadata.telegram_user_id
              )
            : undefined;

        /*
         * Exact payment requirements:
         * ₦2,000 NGN = 200,000 kobo
         */
        if (
          status === 'success' &&
          amountKobo === ACTIVATION_AMOUNT_KOBO &&
          currency === 'NGN' &&
          reference &&
          telegramUserId
        ) {
          /*
           * Existing grant operation is idempotent.
           *
           * For website User IDs, the generated numeric
           * ID is used as the persistent access identifier.
           */
          await paystackService.grantVerifiedAccess({
            reference,
            telegramUserId,
            paystackTransactionId:
              data.id,
            paidAt:
              data.paid_at,
          });

          /*
           * Only attempt Telegram notification for
           * genuine Telegram users.
           *
           * Website-generated User IDs are not Telegram IDs.
           */
          if (
            telegramUserId !==
            WEBSITE_ADMIN_USER_ID
          ) {
            /*
             * We deliberately do not assume that every
             * numeric access ID is a Telegram account.
             *
             * The existing Telegram notification is
             * therefore best-effort.
             */
            telegramService
              .sendPaymentApprovedNotification(
                telegramUserId,
                reference
              )
              .catch((err) => {
                console.error(
                  'Payment approval Telegram notification failed:',
                  err
                );
              });
          }

          console.log(
            `Verified Paystack payment: ${reference}`
          );
        } else {
          console.warn(
            'Paystack charge.success validation failed:',
            {
              status,
              amountKobo,
              currency,
              reference,
              telegramUserId,
            }
          );
        }
      }

      /*
       * Always acknowledge the webhook promptly.
       */
      res.status(200).json({
        received: true,
      });
    } catch (err) {
      console.error(
        'Paystack webhook processing exception:',
        err
      );

      res.status(200).json({
        received: true,
      });
    }
  }
);

// -------------------------------------------------------------
// 6. TELEGRAM MINI APP AUTHENTICATION
// -------------------------------------------------------------

/**
 * Validates Telegram Mini App initData server-side.
 */
app.post(
  '/api/auth/telegram-session',
  async (req: Request, res: Response) => {
    try {
      const { initData } = req.body;

      if (!initData) {
        res.status(400).json({
          error:
            'initData string is required.',
        });
        return;
      }

      const validation =
        telegramService.validateMiniAppInitData(
          initData
        );

      if (
        !validation.valid ||
        !validation.user
      ) {
        res.status(401).json({
          authorized: false,
          error:
            validation.error ||
            'Invalid Telegram Mini App signature.',
        });

        return;
      }

      const user =
        validation.user;

      const userId =
        user.id;

      // Telegram administrator — unchanged.
      if (
        userId ===
        ADMIN_TELEGRAM_ID
      ) {
        res.json({
          authorized: true,
          role: 'admin',
          userId,
          user: {
            id: userId,
            firstName:
              user.first_name,
            username:
              user.username,
          },
        });

        return;
      }

      const userAccess =
        await paystackService.getUserAccess(
          userId
        );

      const isPaid =
        userAccess.accessStatus ===
        'paid_verified';

      res.json({
        authorized: isPaid,
        role: isPaid
          ? 'paid_user'
          : userAccess.accessStatus,
        userId,
        user: {
          id: userId,
          firstName:
            user.first_name,
          username:
            user.username,
        },
        verifiedPaymentReference:
          userAccess.verifiedPaymentReference,
      });
    } catch (err) {
      console.error(
        'Telegram auth session error:',
        err
      );

      res.status(500).json({
        error:
          'Internal server error verifying Telegram session.',
      });
    }
  }
);

// -------------------------------
