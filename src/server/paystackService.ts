/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Server-Side Paystack Live Service
 * Handles live transaction initialization, verification, and HMAC-SHA512 webhook validation.
 * 
 * CRITICAL SECURITY DIRECTIVES:
 * - PAYSTACK_SECRET_KEY is strictly server-side.
 * - Live mode only (2,000 NGN = 200,000 kobo).
 * - Never create fake transactions or trust client claim.
 * - Idempotent database persistence in Firestore.
 */

import crypto from 'crypto';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase.js';

export const ADMIN_TELEGRAM_ID = 7760779963;
export const ACTIVATION_AMOUNT_NGN = 2000;
export const ACTIVATION_AMOUNT_KOBO = 200000; // Paystack expects amount in kobo

// Server-only internal authentication secret used to satisfy zero-trust Firestore security rules
export const SERVER_AUTH_TOKEN = 'sec_app_srv_auth_7760779963_live_verified';

export interface UserAccessRecord {
  telegramUserId: number;
  telegramUsername?: string;
  telegramFirstName?: string;
  accessStatus: 'unpaid' | 'payment_pending' | 'payment_failed' | 'paid_verified' | 'admin';
  verifiedPaymentReference?: string;
  paidAt?: string;
  verifiedAt?: number;
  updatedAt: number;
}

export interface PaymentRecord {
  reference: string;
  telegramUserId: number;
  amount: number;
  currency: 'NGN';
  status: 'pending' | 'verified' | 'failed';
  authorizationUrl?: string;
  accessCode?: string;
  paystackTransactionId?: number;
  paidAt?: string;
  verifiedAt?: number;
  createdAt: number;
}

export class PaystackService {
  /**
   * Safely retrieves Paystack Live Secret Key from server environment.
   * Checks multiple fallback key names without exposing the secret.
   */
  public getSecretKey(): string {
    const primary = process.env.PAYSTACK_SECRET_KEY?.trim();
    if (primary && primary.startsWith('sk_live_')) return primary;

    for (const [key, val] of Object.entries(process.env)) {
      if (typeof val === 'string' && val.trim().startsWith('sk_live_')) {
        return val.trim();
      }
    }
    return primary || '';
  }

  /**
   * Confirms whether Paystack Live Secret Key is properly configured in the server.
   */
  public isConfigured(): boolean {
    const key = this.getSecretKey();
    return Boolean(key && key.startsWith('sk_live_'));
  }

  /**
   * Retrieves persistent user access state from Firestore.
   */
  public async getUserAccess(telegramUserId: number): Promise<UserAccessRecord> {
    // 1. Admin bypass: Administrator has persistent automatic access without payment
    if (telegramUserId === ADMIN_TELEGRAM_ID) {
      return {
        telegramUserId,
        accessStatus: 'admin',
        updatedAt: Date.now(),
      };
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', String(telegramUserId)));
      if (userDoc.exists()) {
        const data = userDoc.data() as UserAccessRecord;
        return {
          telegramUserId,
          telegramUsername: data.telegramUsername,
          telegramFirstName: data.telegramFirstName,
          accessStatus: data.accessStatus || 'unpaid',
          verifiedPaymentReference: data.verifiedPaymentReference,
          paidAt: data.paidAt,
          verifiedAt: data.verifiedAt,
          updatedAt: data.updatedAt || Date.now(),
        };
      }
    } catch (err) {
      console.error('Error fetching user access from Firestore:', err);
    }

    return {
      telegramUserId,
      accessStatus: 'unpaid',
      updatedAt: Date.now(),
    };
  }

  /**
   * Initializes a real Paystack live checkout session for ₦2,000 NGN.
   */
  public async initializePayment(params: {
    telegramUserId: number;
    telegramUsername?: string;
    telegramFirstName?: string;
    email?: string;
    callbackUrl?: string;
  }): Promise<{
    success: boolean;
    authorizationUrl?: string;
    reference?: string;
    error?: string;
  }> {
    const { telegramUserId, telegramUsername, telegramFirstName, callbackUrl } = params;

    // Check if user is admin
    if (telegramUserId === ADMIN_TELEGRAM_ID) {
      return {
        success: false,
        error: 'Admin user does not require payment.',
      };
    }

    // Check if already paid
    const existing = await this.getUserAccess(telegramUserId);
    if (existing.accessStatus === 'paid_verified') {
      return {
        success: false,
        error: 'User already has a verified active payment.',
      };
    }

    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'PAYSTACK_SECRET_KEY is not configured in server environment.',
      };
    }

    const secretKey = this.getSecretKey();
    const timestamp = Date.now();
    const randomSuffix = crypto.randomBytes(4).toString('hex');
    const reference = `APP_${telegramUserId}_${timestamp}_${randomSuffix}`;
    const userEmail = params.email || `tg_${telegramUserId}@aviatorpredictor.pro`;

    try {
      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          amount: ACTIVATION_AMOUNT_KOBO, // Exactly 200,000 kobo = ₦2,000 NGN
          currency: 'NGN',
          reference,
          callback_url: callbackUrl,
          metadata: {
            telegram_user_id: telegramUserId,
            telegram_username: telegramUsername || '',
            telegram_first_name: telegramFirstName || '',
            service: 'aviator_predictor_pro_activation',
            price_ngn: ACTIVATION_AMOUNT_NGN,
          },
        }),
      });

      const result = (await response.json()) as {
        status: boolean;
        message?: string;
        data?: {
          authorization_url: string;
          access_code: string;
          reference: string;
        };
      };

      if (!result.status || !result.data) {
        return {
          success: false,
          error: result.message || 'Paystack initialization failed.',
        };
      }

      // Store pending payment in Firestore
      const paymentRecord: PaymentRecord = {
        reference,
        telegramUserId,
        amount: ACTIVATION_AMOUNT_NGN,
        currency: 'NGN',
        status: 'pending',
        authorizationUrl: result.data.authorization_url,
        accessCode: result.data.access_code,
        createdAt: timestamp,
      };

      await setDoc(doc(db, 'payments', reference), {
        ...paymentRecord,
        _srvAuth: SERVER_AUTH_TOKEN,
      });

      // Update user state to payment_pending
      await setDoc(doc(db, 'users', String(telegramUserId)), {
        telegramUserId,
        telegramUsername: telegramUsername || '',
        telegramFirstName: telegramFirstName || '',
        accessStatus: 'payment_pending',
        latestReference: reference,
        updatedAt: timestamp,
        _srvAuth: SERVER_AUTH_TOKEN,
      });

      return {
        success: true,
        authorizationUrl: result.data.authorization_url,
        reference,
      };
    } catch (err) {
      console.error('Paystack initialization error:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Network error communicating with Paystack.',
      };
    }
  }

  /**
   * Verifies a Paystack transaction directly with Paystack API.
   * Never trusts client input or unverified callbacks.
   */
  public async verifyTransaction(
    reference: string,
    expectedUserId?: number
  ): Promise<{
    success: boolean;
    isPaid: boolean;
    telegramUserId?: number;
    amount?: number;
    paidAt?: string;
    error?: string;
  }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        isPaid: false,
        error: 'PAYSTACK_SECRET_KEY is not configured.',
      };
    }

    const secretKey = this.getSecretKey();

    try {
      const response = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${secretKey}`,
          },
        }
      );

      const payload = (await response.json()) as {
        status: boolean;
        message?: string;
        data?: {
          id: number;
          status: string;
          reference: string;
          amount: number;
          currency: string;
          paid_at?: string;
          channel?: string;
          metadata?: {
            telegram_user_id?: number | string;
          };
        };
      };

      if (!payload.status || !payload.data) {
        return {
          success: false,
          isPaid: false,
          error: payload.message || 'Transaction verification failed on Paystack.',
        };
      }

      const tx = payload.data;
      const metadataUserId = tx.metadata?.telegram_user_id
        ? Number(tx.metadata.telegram_user_id)
        : undefined;

      // Verify all safety requirements
      const isSuccessful = tx.status === 'success';
      const isCorrectAmount = tx.amount === ACTIVATION_AMOUNT_KOBO; // 200,000 kobo
      const isCorrectCurrency = tx.currency === 'NGN';
      const isMatchingUser = !expectedUserId || metadataUserId === expectedUserId;

      if (!isSuccessful || !isCorrectAmount || !isCorrectCurrency || !isMatchingUser) {
        return {
          success: true,
          isPaid: false,
          error: !isSuccessful
            ? `Transaction status is '${tx.status}' (not success).`
            : !isCorrectAmount
            ? `Amount mismatch: expected ${ACTIVATION_AMOUNT_KOBO} kobo, got ${tx.amount} kobo.`
            : !isCorrectCurrency
            ? `Currency mismatch: expected NGN, got ${tx.currency}.`
            : 'Telegram user ID mismatch.',
        };
      }

      const targetUserId = expectedUserId || metadataUserId;
      if (!targetUserId) {
        return {
          success: false,
          isPaid: false,
          error: 'No Telegram user ID found in transaction metadata.',
        };
      }

      // Idempotently apply verification in Firestore
      await this.grantVerifiedAccess({
        reference: tx.reference,
        telegramUserId: targetUserId,
        paystackTransactionId: tx.id,
        paidAt: tx.paid_at || new Date().toISOString(),
      });

      return {
        success: true,
        isPaid: true,
        telegramUserId: targetUserId,
        amount: ACTIVATION_AMOUNT_NGN,
        paidAt: tx.paid_at,
      };
    } catch (err) {
      console.error('Paystack verification network exception:', err);
      return {
        success: false,
        isPaid: false,
        error: err instanceof Error ? err.message : 'Network error verifying Paystack transaction.',
      };
    }
  }

  /**
   * Idempotently grants verified access in Firestore.
   */
  public async grantVerifiedAccess(params: {
    reference: string;
    telegramUserId: number;
    paystackTransactionId?: number;
    paidAt?: string;
  }): Promise<void> {
    const { reference, telegramUserId, paystackTransactionId, paidAt } = params;
    const now = Date.now();

    // 1. Update Payment Record
    try {
      await setDoc(
        doc(db, 'payments', reference),
        {
          reference,
          telegramUserId,
          amount: ACTIVATION_AMOUNT_NGN,
          currency: 'NGN',
          status: 'verified',
          paystackTransactionId: paystackTransactionId || null,
          paidAt: paidAt || new Date().toISOString(),
          verifiedAt: now,
          _srvAuth: SERVER_AUTH_TOKEN,
        },
        { merge: true }
      );
    } catch (err) {
      console.error('Error recording payment in Firestore:', err);
    }

    // 2. Update User Access Record
    try {
      const userRef = doc(db, 'users', String(telegramUserId));
      const userDoc = await getDoc(userRef);
      const wasAlreadyPaid = userDoc.exists() && userDoc.data()?.accessStatus === 'paid_verified';

      await setDoc(
        userRef,
        {
          telegramUserId,
          accessStatus: 'paid_verified',
          verifiedPaymentReference: reference,
          paidAt: paidAt || new Date().toISOString(),
          verifiedAt: now,
          updatedAt: now,
          _srvAuth: SERVER_AUTH_TOKEN,
        },
        { merge: true }
      );

      // 3. Increment verified user count in Firestore stats if this is a newly verified user
      if (!wasAlreadyPaid && telegramUserId !== ADMIN_TELEGRAM_ID) {
        try {
          const statRef = doc(db, 'verified_stats', 'app');
          const statDoc = await getDoc(statRef);
          const currentCount = statDoc.exists() && typeof statDoc.data().verifiedUserCount === 'number'
            ? statDoc.data().verifiedUserCount
            : 0;
          await updateDoc(statRef, {
            verifiedUserCount: currentCount + 1,
            updatedAt: now,
          });
        } catch (statErr) {
          console.warn('Could not update verified user count in verified_stats:', statErr);
        }
      }
    } catch (err) {
      console.error('Error updating user access in Firestore:', err);
    }
  }

  /**
   * Verifies Paystack HMAC-SHA512 Webhook Signature.
   */
  public verifyWebhookSignature(rawBody: Buffer | string, signature?: string): boolean {
    if (!signature) return false;
    const secretKey = this.getSecretKey();
    if (!secretKey) return false;

    const hash = crypto
      .createHmac('sha512', secretKey)
      .update(rawBody)
      .digest('hex');

    return hash === signature;
  }
}

export const paystackService = new PaystackService();
