/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Server-Side Telegram Bot Service
 * Handles communication with Telegram Bot API (@AviatorPredictorPro1Bot).
 * 
 * CRITICAL PRODUCTION SECURITY DIRECTIVES:
 * - TELEGRAM_BOT_TOKEN is strictly server-side.
 * - PAYSTACK_SECRET_KEY is strictly server-side.
 * - Never expose secrets or admin ID to client-side.
 * - Live Paystack ₦2,000 payments only.
 * - Admin ID 7760779963 has automatic, persistent bypass without payment.
 * - Never reply to normal community/group chatter.
 */

import crypto from 'crypto';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase.js';
import {
  paystackService,
  ADMIN_TELEGRAM_ID,
  ACTIVATION_AMOUNT_NGN,
} from './paystackService.js';

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  first_name?: string;
  username?: string;
  title?: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
}

export interface InlineKeyboardButton {
  text: string;
  url?: string;
  callback_data?: string;
  web_app?: {
    url: string;
  };
}

export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username: string;
  can_join_groups: boolean;
  can_read_all_group_messages: boolean;
  supports_inline_queries: boolean;
}

export interface WebhookInfoData {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  ip_address?: string;
  last_error_date?: number;
  last_error_message?: string;
  last_synchronization_error_date?: number;
  max_connections?: number;
  allowed_updates?: string[];
}

export class TelegramService {
  public readonly botUsername = 'AviatorPredictorPro1Bot';

  /**
   * Retrieves the Telegram bot token safely from server environment variables.
   * Never prints, logs, or exposes the token.
   */
  public getToken(): string {
    const candidate = process.env.TELEGRAM_BOT_TOKEN?.trim() || '';
    if (/^\d+:[A-Za-z0-9_-]+$/.test(candidate)) {
      return candidate;
    }
    // Check fallback env keys if user stored it in another server secret field
    const fallbackKeys = [
      'TELEGRAM_WEBHOOK_SECRET',
      'TELEGRAM_COMMUNITY_CHAT_ID',
      'TELEGRAM_COMMUNITY_LINK',
    ];
    for (const key of fallbackKeys) {
      const val = process.env[key]?.trim() || '';
      if (/^\d+:[A-Za-z0-9_-]+$/.test(val)) {
        return val;
      }
    }
    return candidate;
  }

  /**
   * Checks whether a valid Telegram Bot Token exists in the server environment.
   */
  public isConfigured(): boolean {
    const token = this.getToken();
    return Boolean(token && /^\d+:[A-Za-z0-9_-]+$/.test(token));
  }

  /**
   * Returns official Telegram community invite link.
   */
  public getCommunityLink(): string {
    const val = process.env.TELEGRAM_COMMUNITY_LINK?.trim() || '';
    if (
      val.startsWith('http://') ||
      val.startsWith('https://') ||
      val.startsWith('t.me/')
    ) {
      return val;
    }
    return 'https://t.me/AviatorPredictorProCommunity';
  }

  /**
   * Returns official community chat ID or @username for membership verification.
   */
  public getCommunityChatId(): string {
    const val = process.env.TELEGRAM_COMMUNITY_CHAT_ID?.trim() || '';
    // If it contains a token pattern, it's not a chat ID
    if (/^\d+:[A-Za-z0-9_-]+$/.test(val)) {
      return '@AviatorPredictorProCommunity';
    }
    return val || '@AviatorPredictorProCommunity';
  }

  /**
   * Returns base URL for Mini App and web links.
   */
  public getAppUrl(): string {
    const url = process.env.APP_URL?.trim() || '';
    return url.replace(/\/$/, '');
  }

  /**
   * Validates secret token header from incoming Telegram webhooks.
   */
  public verifyWebhookSecret(headerSecret?: string): boolean {
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
    if (!expectedSecret || /^\d+:[A-Za-z0-9_-]+$/.test(expectedSecret)) {
      return true;
    }
    return headerSecret === expectedSecret;
  }

  /**
   * Validates Telegram Mini App initData according to Telegram's official HMAC-SHA256 specification.
   */
  public validateMiniAppInitData(initData: string): {
    valid: boolean;
    user?: TelegramUser;
    authDate?: number;
    error?: string;
  } {
    if (!this.isConfigured() || !initData) {
      return { valid: false, error: 'Telegram bot token or initData missing.' };
    }

    try {
      const urlParams = new URLSearchParams(initData);
      const hash = urlParams.get('hash');
      if (!hash) {
        return { valid: false, error: 'Hash parameter missing in initData.' };
      }

      urlParams.delete('hash');

      // Sort remaining keys alphabetically
      const sortedKeys = Array.from(urlParams.keys()).sort();
      const dataCheckString = sortedKeys
        .map((key) => `${key}=${urlParams.get(key)}`)
        .join('\n');

      const token = this.getToken();
      // Secret key is HMAC_SHA256("WebAppData", botToken)
      const secretKey = crypto
        .createHmac('sha256', 'WebAppData')
        .update(token)
        .digest();

      // Expected hash is HMAC_SHA256(dataCheckString, secretKey)
      const calculatedHash = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

      if (calculatedHash !== hash) {
        return { valid: false, error: 'HMAC signature verification failed.' };
      }

      const userJson = urlParams.get('user');
      const user = userJson ? (JSON.parse(userJson) as TelegramUser) : undefined;
      const authDate = Number(urlParams.get('auth_date')) || undefined;

      return { valid: true, user, authDate };
    } catch (err) {
      return {
        valid: false,
        error: err instanceof Error ? err.message : 'Error validating initData.',
      };
    }
  }

  /**
   * Registers the HTTPS Webhook endpoint with Telegram Bot API.
   */
  public async registerWebhook(
    webhookUrl: string
  ): Promise<{ success: boolean; description?: string; result?: boolean }> {
    if (!this.isConfigured()) {
      return { success: false, description: 'Telegram Bot Token is not configured.' };
    }

    try {
      const token = this.getToken();
      const payload: Record<string, unknown> = {
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query', 'chat_member'],
        drop_pending_updates: false,
      };

      const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as {
        ok: boolean;
        description?: string;
        result?: boolean;
      };
      return { success: data.ok, description: data.description, result: data.result };
    } catch (err) {
      return {
        success: false,
        description: err instanceof Error ? err.message : 'Network error contacting Telegram API.',
      };
    }
  }

  /**
   * Queries Telegram getWebhookInfo.
   */
  public async getWebhookInfo(): Promise<{
    success: boolean;
    data?: WebhookInfoData;
    error?: string;
  }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Telegram Bot Token is not configured.' };
    }

    try {
      const token = this.getToken();
      const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
      const data = (await res.json()) as {
        ok: boolean;
        result?: WebhookInfoData;
        description?: string;
      };

      if (data.ok && data.result) {
        return { success: true, data: data.result };
      }
      return { success: false, error: data.description || 'Failed to retrieve webhook info.' };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Network error querying getWebhookInfo.',
      };
    }
  }

  /**
   * Sends a new message to a Telegram chat using Telegram Bot API.
   */
  public async sendMessage(
    chatId: number | string,
    text: string,
    replyMarkup?: InlineKeyboardMarkup,
    parseMode: 'HTML' | 'MarkdownV2' = 'HTML'
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'TELEGRAM_BOT_TOKEN is not configured.',
      };
    }

    try {
      const token = this.getToken();
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: parseMode,
          reply_markup: replyMarkup,
          disable_web_page_preview: true,
        }),
      });

      const data = (await response.json()) as { ok: boolean; description?: string };
      return { success: data.ok, error: data.description };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Error sending Telegram message.',
      };
    }
  }

  /**
   * Edits an existing Telegram message in place.
   */
  public async editMessageText(
    chatId: number | string,
    messageId: number,
    text: string,
    replyMarkup?: InlineKeyboardMarkup,
    parseMode: 'HTML' | 'MarkdownV2' = 'HTML'
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'TELEGRAM_BOT_TOKEN is not configured.',
      };
    }

    try {
      const token = this.getToken();
      const response = await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text,
          parse_mode: parseMode,
          reply_markup: replyMarkup,
          disable_web_page_preview: true,
        }),
      });

      const data = (await response.json()) as { ok: boolean; description?: string };
      return { success: data.ok, error: data.description };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Error editing Telegram message.',
      };
    }
  }

  /**
   * Acknowledges a callback query to remove Telegram's loading spinner.
   */
  public async answerCallbackQuery(
    callbackQueryId: string,
    text?: string,
    showAlert: boolean = false
  ): Promise<void> {
    if (!this.isConfigured()) return;

    try {
      const token = this.getToken();
      await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text,
          show_alert: showAlert,
        }),
      });
    } catch {
      // Ignore background ACK error
    }
  }

  /**
   * Checks the user's actual Telegram membership using getChatMember.
   */
  public async checkCommunityMembership(
    userId: number
  ): Promise<{ isMember: boolean; status?: string; error?: string }> {
    // Admin automatically passes
    if (userId === ADMIN_TELEGRAM_ID) {
      return { isMember: true, status: 'creator' };
    }

    if (!this.isConfigured()) {
      return { isMember: false, error: 'TELEGRAM_BOT_TOKEN is not configured.' };
    }

    const communityChatId = this.getCommunityChatId();
    if (!communityChatId) {
      return {
        isMember: false,
        error: 'TELEGRAM_COMMUNITY_CHAT_ID is not configured.',
      };
    }

    try {
      const token = this.getToken();
      const response = await fetch(`https://api.telegram.org/bot${token}/getChatMember`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: communityChatId,
          user_id: userId,
        }),
      });

      const data = (await response.json()) as {
        ok: boolean;
        result?: { status: string };
        description?: string;
      };

      if (data.ok && data.result) {
        const memberStatus = data.result.status;
        const validMembershipStatuses = ['creator', 'administrator', 'member', 'restricted'];
        const isMember = validMembershipStatuses.includes(memberStatus);
        return { isMember, status: memberStatus };
      } else {
        return {
          isMember: false,
          error: data.description || 'Could not verify member status.',
        };
      }
    } catch (err) {
      return {
        isMember: false,
        error: err instanceof Error ? err.message : 'Network error verifying membership.',
      };
    }
  }

  /**
   * Fetches real verified user count from Firestore.
   */
  public async getVerifiedUserCount(): Promise<number | null> {
    try {
      const statDoc = await getDoc(doc(db, 'verified_stats', 'app'));
      if (statDoc.exists()) {
        const data = statDoc.data();
        if (typeof data.verifiedUserCount === 'number' && data.verifiedUserCount > 0) {
          return data.verifiedUserCount;
        }
      }
    } catch (err) {
      console.warn('Could not query verified user count from Firestore:', err);
    }
    return null;
  }

  /**
   * Generates a proper Telegram invite link for users.
   */
  public getInviteUrl(userId: number): string {
    const botLink = `https://t.me/${this.botUsername}?start=ref_${userId}`;
    const shareText = encodeURIComponent(
      'Join Aviator Predictor Pro for real-time flight telemetry signals and personal radar dashboard!'
    );
    return `https://t.me/share/url?url=${encodeURIComponent(botLink)}&text=${shareText}`;
  }

  /**
   * Generates the "Get Aviator Signals" button (Mini App if supported, or direct link).
   */
  public getSignalsButton(): InlineKeyboardButton {
    const appUrl = this.getAppUrl();
    if (appUrl) {
      return {
        text: '✈️ Get Aviator Signals',
        web_app: { url: appUrl },
      };
    }
    return {
      text: '✈️ Get Aviator Signals',
      url: 'https://t.me/' + this.botUsername,
    };
  }

  /**
   * Handles incoming Telegram webhook updates.
   */
  public async processUpdate(update: TelegramUpdate): Promise<{ handled: boolean; command?: string }> {
    if (update.message) {
      return this.handleMessage(update.message);
    }

    if (update.callback_query) {
      return this.handleCallbackQuery(update.callback_query);
    }

    return { handled: false };
  }

  /**
   * Handles private chat messages.
   * Strictly ignores all group, supergroup, and channel chatter.
   */
  private async handleMessage(message: TelegramMessage): Promise<{ handled: boolean; command?: string }> {
    if (message.chat.type !== 'private') {
      return { handled: false, command: 'ignored_group_message' };
    }

    const text = message.text?.trim() || '';
    const chatId = message.chat.id;
    const userId = message.from?.id || Number(chatId);

    // 1. ADMIN USER ACCESS CHECK
    if (userId === ADMIN_TELEGRAM_ID) {
      await this.sendAdminWelcome(chatId);
      return { handled: true, command: 'admin_start' };
    }

    // 2. CHECK PERSISTENT PAID USER STATUS
    const userAccess = await paystackService.getUserAccess(userId);
    if (userAccess.accessStatus === 'paid_verified') {
      await this.sendReturningPaidUserWelcome(chatId, userAccess.verifiedPaymentReference);
      return { handled: true, command: 'returning_paid_start' };
    }

    if (text.startsWith('/start')) {
      await this.sendWelcomeScreen(chatId);
      return { handled: true, command: '/start' };
    }

    if (text.startsWith('/help')) {
      await this.sendHelpMenu(chatId, false);
      return { handled: true, command: '/help' };
    }

    if (text.startsWith('/pay')) {
      await this.initiateAndSendPayment(chatId, message.from);
      return { handled: true, command: '/pay' };
    }

    // Default friendly navigation
    await this.sendMessage(
      chatId,
      `<b>Aviator Predictor Pro</b>\n\nPlease send /start to launch the welcome dashboard and community verification.`
    );
    return { handled: true, command: 'unknown' };
  }

  /**
   * Handles button click callbacks.
   */
  private async handleCallbackQuery(
    query: TelegramCallbackQuery
  ): Promise<{ handled: boolean; command?: string }> {
    const callbackData = query.data || '';
    const message = query.message;
    const fromUser = query.from;

    if (!message) {
      await this.answerCallbackQuery(query.id);
      return { handled: false };
    }

    const chatId = message.chat.id;
    const messageId = message.message_id;
    const userId = fromUser.id;

    // Check Admin
    const isAdmin = userId === ADMIN_TELEGRAM_ID;

    // Handle verification re-check callback e.g. "verify_payment:<reference>"
    if (callbackData.startsWith('verify_payment:')) {
      const reference = callbackData.replace('verify_payment:', '').trim();
      await this.answerCallbackQuery(query.id, 'Verifying payment with Paystack...');
      const verifyResult = await paystackService.verifyTransaction(reference, userId);

      if (verifyResult.isPaid) {
        await this.renderPaymentApprovedScreen(chatId, messageId, reference);
      } else {
        await this.renderPaymentPendingScreen(chatId, messageId, reference, verifyResult.error);
      }
      return { handled: true, command: 'verify_payment' };
    }

    switch (callbackData) {
      case 'check_membership': {
        await this.answerCallbackQuery(query.id, 'Verifying community membership...');

        if (isAdmin) {
          await this.renderAdminWelcome(chatId, messageId);
          return { handled: true, command: 'admin_membership_checked' };
        }

        const checkResult = await this.checkCommunityMembership(userId);
        if (checkResult.isMember) {
          // If already paid, take directly to paid view
          const userAccess = await paystackService.getUserAccess(userId);
          if (userAccess.accessStatus === 'paid_verified') {
            await this.renderPaymentApprovedScreen(
              chatId,
              messageId,
              userAccess.verifiedPaymentReference || 'APPROVED'
            );
          } else {
            await this.renderVerifiedScreen(chatId, messageId);
          }
        } else {
          await this.renderAccessDeniedScreen(chatId, messageId);
        }
        return { handled: true, command: 'check_membership' };
      }

      case 'action_pay': {
        await this.answerCallbackQuery(query.id, 'Generating Paystack checkout...');
        await this.handlePaymentInitiation(chatId, messageId, fromUser);
        return { handled: true, command: 'action_pay' };
      }

      case 'action_help': {
        await this.answerCallbackQuery(query.id);
        await this.renderHelpMenu(chatId, messageId, isAdmin);
        return { handled: true, command: 'action_help' };
      }

      case 'help_pay': {
        await this.answerCallbackQuery(query.id);
        await this.renderHelpPay(chatId, messageId);
        return { handled: true, command: 'help_pay' };
      }

      case 'help_work': {
        await this.answerCallbackQuery(query.id);
        await this.renderHelpWork(chatId, messageId);
        return { handled: true, command: 'help_work' };
      }

      case 'help_users': {
        await this.answerCallbackQuery(query.id);
        await this.renderHelpUsers(chatId, messageId);
        return { handled: true, command: 'help_users' };
      }

      case 'verified_home': {
        await this.answerCallbackQuery(query.id);
        if (isAdmin) {
          await this.renderAdminWelcome(chatId, messageId);
        } else {
          const userAccess = await paystackService.getUserAccess(userId);
          if (userAccess.accessStatus === 'paid_verified') {
            await this.renderPaymentApprovedScreen(
              chatId,
              messageId,
              userAccess.verifiedPaymentReference || 'APPROVED'
            );
          } else {
            await this.renderVerifiedScreen(chatId, messageId);
          }
        }
        return { handled: true, command: 'verified_home' };
      }

      default: {
        await this.answerCallbackQuery(query.id);
        return { handled: false };
      }
    }
  }

  /**
   * Screen: Official Welcome Screen
   */
  private getWelcomeContent(): { text: string; markup: InlineKeyboardMarkup } {
    const text =
      `Welcome to Aviator Predictor Pro 🚀\n\n` +
      `Get access to the Aviator signal system and your personal signal dashboard.\n\n` +
      `To continue, please join our official community first.`;

    const markup: InlineKeyboardMarkup = {
      inline_keyboard: [
        [{ text: '👥 Join Our Group', url: this.getCommunityLink() }],
        [{ text: "✅ I've Followed", callback_data: 'check_membership' }],
      ],
    };

    return { text, markup };
  }

  public async sendWelcomeScreen(chatId: number | string): Promise<void> {
    const { text, markup } = this.getWelcomeContent();
    await this.sendMessage(chatId, text, markup);
  }

  /**
   * Screen: Access Denied (Community Membership Required)
   */
  public async renderAccessDeniedScreen(
    chatId: number | string,
    messageId: number
  ): Promise<void> {
    const text =
      `❌ Access Denied\n\n` +
      `You haven't joined our official community yet.\n` +
      `Please join first, then tap "I've Followed" again.`;

    const markup: InlineKeyboardMarkup = {
      inline_keyboard: [
        [{ text: '👥 Join Our Group', url: this.getCommunityLink() }],
        [{ text: '🔄 Check Again', callback_data: 'check_membership' }],
      ],
    };

    const res = await this.editMessageText(chatId, messageId, text, markup);
    if (!res.success) {
      await this.sendMessage(chatId, text, markup);
    }
  }

  /**
   * Screen: Community Verified (Awaiting ₦2,000 Activation)
   */
  public async renderVerifiedScreen(
    chatId: number | string,
    messageId: number
  ): Promise<void> {
    const text =
      `✅ Community Verified\n\n` +
      `Your community membership has been verified.\n\n` +
      `Activate your Aviator Predictor Pro signal dashboard license (<b>₦2,000 NGN</b>) via Paystack to unlock real-time flight telemetry.`;

    const markup: InlineKeyboardMarkup = {
      inline_keyboard: [
        [{ text: '💳 Pay ₦2,000', callback_data: 'action_pay' }],
        [{ text: '❓ Help', callback_data: 'action_help' }],
        [{ text: '🤝 Invite', url: this.getInviteUrl(Number(chatId)) }],
      ],
    };

    const res = await this.editMessageText(chatId, messageId, text, markup);
    if (!res.success) {
      await this.sendMessage(chatId, text, markup);
    }
  }

  /**
   * Initiates Paystack transaction and renders checkout link
   */
  private async handlePaymentInitiation(
    chatId: number | string,
    messageId: number,
    fromUser?: TelegramUser
  ): Promise<void> {
    const userId = fromUser?.id || Number(chatId);
    const callbackUrl = `${this.getAppUrl()}/payment-verify`;

    const initResult = await paystackService.initializePayment({
      telegramUserId: userId,
      telegramUsername: fromUser?.username,
      telegramFirstName: fromUser?.first_name,
      callbackUrl,
    });

    if (!initResult.success || !initResult.authorizationUrl || !initResult.reference) {
      const errorText =
        `⚠️ <b>Payment Initialization Notice</b>\n\n` +
        `Unable to initialize Paystack checkout right now: ${initResult.error || 'Gateway offline.'}\n\n` +
        `Please ensure PAYSTACK_SECRET_KEY is configured in server environment.`;

      const markup: InlineKeyboardMarkup = {
        inline_keyboard: [[{ text: '← Back', callback_data: 'verified_home' }]],
      };

      await this.editMessageText(chatId, messageId, errorText, markup);
      return;
    }

    const text =
      `💳 <b>Paystack Secure Live Checkout</b>\n\n` +
      `Your official activation payment link has been generated.\n\n` +
      `• Amount: <b>₦${ACTIVATION_AMOUNT_NGN.toLocaleString()} NGN</b>\n` +
      `• Reference: <code>${initResult.reference}</code>\n` +
      `• Gateway: <b>Paystack Live</b>\n\n` +
      `Tap the button below to complete your payment on Paystack. Once completed, your license will be verified automatically.`;

    const markup: InlineKeyboardMarkup = {
      inline_keyboard: [
        [{ text: '💳 Open Paystack Checkout', url: initResult.authorizationUrl }],
        [
          {
            text: "🔄 I've Completed Payment",
            callback_data: `verify_payment:${initResult.reference}`,
          },
        ],
        [{ text: '← Back', callback_data: 'verified_home' }],
      ],
    };

    const res = await this.editMessageText(chatId, messageId, text, markup);
    if (!res.success) {
      await this.sendMessage(chatId, text, markup);
    }
  }

  private async initiateAndSendPayment(
    chatId: number | string,
    fromUser?: TelegramUser
  ): Promise<void> {
    const userId = fromUser?.id || Number(chatId);
    const callbackUrl = `${this.getAppUrl()}/payment-verify`;

    const initResult = await paystackService.initializePayment({
      telegramUserId: userId,
      telegramUsername: fromUser?.username,
      telegramFirstName: fromUser?.first_name,
      callbackUrl,
    });

    if (!initResult.success || !initResult.authorizationUrl || !initResult.reference) {
      const errorText =
        `⚠️ <b>Payment Notice</b>\n\n` +
        `${initResult.error || 'Payment gateway not available.'}`;

      await this.sendMessage(chatId, errorText);
      return;
    }

    const text =
      `💳 <b>Paystack Secure Live Checkout</b>\n\n` +
      `Your official activation payment link has been generated.\n\n` +
      `• Amount: <b>₦${ACTIVATION_AMOUNT_NGN.toLocaleString()} NGN</b>\n` +
      `• Reference: <code>${initResult.reference}</code>\n\n` +
      `Tap below to complete your payment securely via Paystack:`;

    const markup: InlineKeyboardMarkup = {
      inline_keyboard: [
        [{ text: '💳 Open Paystack Checkout', url: initResult.authorizationUrl }],
        [
          {
            text: "🔄 I've Completed Payment",
            callback_data: `verify_payment:${initResult.reference}`,
          },
        ],
        [{ text: '← Back', callback_data: 'verified_home' }],
      ],
    };

    await this.sendMessage(chatId, text, markup);
  }

  /**
   * Screen: Payment Approved (Permanent Verified Access)
   */
  public async renderPaymentApprovedScreen(
    chatId: number | string,
    messageId: number,
    reference: string
  ): Promise<void> {
    const text =
      `✅ <b>Payment Approved</b>\n\n` +
      `Payment received: <b>₦2,000 NGN</b>\n` +
      `Reference: <code>${reference}</code>\n` +
      `Date: <b>${new Date().toLocaleDateString()}</b>\n\n` +
      `Your personal Aviator Predictor Pro dashboard access is permanently activated!`;

    const markup: InlineKeyboardMarkup = {
      inline_keyboard: [
        [this.getSignalsButton()],
        [{ text: '🤝 Invite', url: this.getInviteUrl(Number(chatId)) }],
        [{ text: '❓ Help', callback_data: 'action_help' }],
      ],
    };

    const res = await this.editMessageText(chatId, messageId, text, markup);
    if (!res.success) {
      await this.sendMessage(chatId, text, markup);
    }
  }

  public async sendPaymentApprovedNotification(
    chatId: number | string,
    reference: string
  ): Promise<void> {
    const text =
      `✅ <b>Payment Approved</b>\n\n` +
      `Payment received: <b>₦2,000 NGN</b>\n` +
      `Reference: <code>${reference}</code>\n` +
      `Date: <b>${new Date().toLocaleDateString()}</b>\n\n` +
      `Your personal Aviator Predictor Pro dashboard access is permanently activated!`;

    const markup: InlineKeyboardMarkup = {
      inline_keyboard: [
        [this.getSignalsButton()],
        [{ text: '🤝 Invite', url: this.getInviteUrl(Number(chatId)) }],
        [{ text: '❓ Help', callback_data: 'action_help' }],
      ],
    };

    await this.sendMessage(chatId, text, markup);
  }

  /**
   * Screen: Payment Pending
   */
  public async renderPaymentPendingScreen(
    chatId: number | string,
    messageId: number,
    reference: string,
    reason?: string
  ): Promise<void> {
    const text =
      `⏳ <b>Payment Verification Pending</b>\n\n` +
      `Reference: <code>${reference}</code>\n\n` +
      `${reason || 'Payment has not been confirmed yet.'}\n\n` +
      `If you have completed your payment, please allow a few moments for the bank to process and tap "Check Again" below.`;

    const markup: InlineKeyboardMarkup = {
      inline_keyboard: [
        [{ text: '🔄 Check Again', callback_data: `verify_payment:${reference}` }],
        [{ text: '← Back', callback_data: 'verified_home' }],
      ],
    };

    const res = await this.editMessageText(chatId, messageId, text, markup);
    if (!res.success) {
      await this.sendMessage(chatId, text, markup);
    }
  }

  /**
   * Screen: Admin Welcome (Bypasses payment automatically)
   */
  public async sendAdminWelcome(chatId: number | string): Promise<void> {
    const text =
      `👑 <b>Admin Access Verified</b>\n\n` +
      `Welcome Administrator!\n\n` +
      `Your Telegram account has persistent authorized access to the Aviator Predictor Pro dashboard without payment requirement.`;

    const markup: InlineKeyboardMarkup = {
      inline_keyboard: [
        [this.getSignalsButton()],
        [{ text: '🤝 Invite', url: this.getInviteUrl(Number(chatId)) }],
        [{ text: '❓ Help', callback_data: 'action_help' }],
      ],
    };

    await this.sendMessage(chatId, text, markup);
  }

  public async renderAdminWelcome(
    chatId: number | string,
    messageId: number
  ): Promise<void> {
    const text =
      `👑 <b>Admin Access Verified</b>\n\n` +
      `Welcome Administrator!\n\n` +
      `Your Telegram account has persistent authorized access to the Aviator Predictor Pro dashboard without payment requirement.`;

    const markup: InlineKeyboardMarkup = {
      inline_keyboard: [
        [this.getSignalsButton()],
        [{ text: '🤝 Invite', url: this.getInviteUrl(Number(chatId)) }],
        [{ text: '❓ Help', callback_data: 'action_help' }],
      ],
    };

    const res = await this.editMessageText(chatId, messageId, text, markup);
    if (!res.success) {
      await this.sendMessage(chatId, text, markup);
    }
  }

  /**
   * Screen: Returning Paid User Welcome
   */
  public async sendReturningPaidUserWelcome(
    chatId: number | string,
    reference?: string
  ): Promise<void> {
    const text =
      `✅ <b>Aviator Predictor Pro · Active</b>\n\n` +
      `Welcome back! Your personal signal access is active and verified.\n` +
      (reference ? `License Reference: <code>${reference}</code>\n\n` : '\n') +
      `Tap below to open your flight telemetry radar:`;

    const markup: InlineKeyboardMarkup = {
      inline_keyboard: [
        [this.getSignalsButton()],
        [{ text: '🤝 Invite', url: this.getInviteUrl(Number(chatId)) }],
        [{ text: '❓ Help', callback_data: 'action_help' }],
      ],
    };

    await this.sendMessage(chatId, text, markup);
  }

  /**
   * Screen: Help Menu
   */
  public async renderHelpMenu(
    chatId: number | string,
    messageId: number,
    isAdmin: boolean = false
  ): Promise<void> {
    const text = `❓ Help\n\nSelect a topic below to learn more about Aviator Predictor Pro:`;

    const markup: InlineKeyboardMarkup = {
      inline_keyboard: [
        [{ text: '💳 How to Pay', callback_data: 'help_pay' }],
        [{ text: '⚙️ How Does It Work?', callback_data: 'help_work' }],
        [{ text: '👥 How Many People Use It?', callback_data: 'help_users' }],
        [{ text: '← Back', callback_data: isAdmin ? 'admin_home' : 'verified_home' }],
      ],
    };

    const res = await this.editMessageText(chatId, messageId, text, markup);
    if (!res.success) {
      await this.sendMessage(chatId, text, markup);
    }
  }

  public async sendHelpMenu(
    chatId: number | string,
    isAdmin: boolean = false
  ): Promise<void> {
    const text = `❓ Help\n\nSelect a topic below to learn more about Aviator Predictor Pro:`;

    const markup: InlineKeyboardMarkup = {
      inline_keyboard: [
        [{ text: '💳 How to Pay', callback_data: 'help_pay' }],
        [{ text: '⚙️ How Does It Work?', callback_data: 'help_work' }],
        [{ text: '👥 How Many People Use It?', callback_data: 'help_users' }],
        [{ text: '← Back', callback_data: isAdmin ? 'admin_home' : 'verified_home' }],
      ],
    };

    await this.sendMessage(chatId, text, markup);
  }

  /**
   * Submenu: How to Pay
   */
  public async renderHelpPay(
    chatId: number | string,
    messageId: number
  ): Promise<void> {
    const text =
      `💳 <b>How to Pay</b>\n\n` +
      `• Access License Fee: <b>₦2,000 NGN</b>\n` +
      `• Payment Gateway: <b>Paystack Live</b>\n\n` +
      `<b>Steps:</b>\n` +
      `1. Tap "Pay ₦2,000" to generate your personal live checkout link.\n` +
      `2. Complete payment via Card, Bank Transfer, or USSD on Paystack.\n` +
      `3. Our secure backend automatically verifies the transaction and permanently activates your dashboard.`;

    const markup: InlineKeyboardMarkup = {
      inline_keyboard: [
        [{ text: '💳 Pay ₦2,000', callback_data: 'action_pay' }],
        [{ text: '← Back', callback_data: 'action_help' }],
      ],
    };

    await this.editMessageText(chatId, messageId, text, markup);
  }

  /**
   * Submenu: How Does It Work?
   * Neutral, aeronautical telemetry terminology. Zero guaranteed claims.
   */
  public async renderHelpWork(
    chatId: number | string,
    messageId: number
  ): Promise<void> {
    const text =
      `⚙️ <b>How Does It Work?</b>\n\n` +
      `<b>1. Community Membership</b>: Join our official Telegram group to connect with the flight telemetry network.\n\n` +
      `<b>2. License Activation</b>: Complete the ₦2,000 Paystack payment to unlock real-time radar calculations.\n\n` +
      `<b>3. Backend Verification</b>: Transactions are verified server-side with zero latency.\n\n` +
      `<b>4. Signal Engine</b>: Evaluates aeronautical telemetry cycles every 30s to 50s, computing probabilistic outlook corridors (High, Normal, Low) and safe exit recommendations.\n\n` +
      `<i>Notice: Signal predictions represent analytical probability models and do not guarantee future game outcomes.</i>`;

    const markup: InlineKeyboardMarkup = {
      inline_keyboard: [[{ text: '← Back', callback_data: 'action_help' }]],
    };

    await this.editMessageText(chatId, messageId, text, markup);
  }

  /**
   * Submenu: How Many People Use It?
   * Reads only live verified records from Firebase.
   */
  public async renderHelpUsers(
    chatId: number | string,
    messageId: number
  ): Promise<void> {
    const count = await this.getVerifiedUserCount();

    let text: string;
    if (count !== null && count > 0) {
      text =
        `👥 <b>How Many People Use It?</b>\n\n` +
        `Verified Active Subscribers: <b>${count}</b>\n\n` +
        `This count is verified directly through live records in Firestore.`;
    } else {
      text =
        `👥 <b>How Many People Use It?</b>\n\n` +
        `The verified user count is currently unavailable from the database.\n\n` +
        `We strictly report authenticated, live database records and do not display estimated or synthetic numbers.`;
    }

    const markup: InlineKeyboardMarkup = {
      inline_keyboard: [[{ text: '← Back', callback_data: 'action_help' }]],
    };

    await this.editMessageText(chatId, messageId, text, markup);
  }

  /**
   * Returns current status summary.
   */
  public async getStatusSummary() {
    const webhookInfo = await this.getWebhookInfo();
    return {
      configured: this.isConfigured(),
      botUsername: `@${this.botUsername}`,
      communityLink: this.getCommunityLink(),
      communityChatId: this.getCommunityChatId(),
      paystackConfigured: paystackService.isConfigured(),
      webhook: webhookInfo.success ? webhookInfo.data : null,
    };
  }
}

export const telegramService = new TelegramService();
