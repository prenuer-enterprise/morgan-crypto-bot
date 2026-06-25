require('dotenv').config();
const express = require('express');
const { Telegraf, Markup } = require('telegraf');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);

app.use(express.json());

// Multi-tenant configuration tracking Morgan's wallet info
const CRYPTO_CONFIG = {
  USDT_TRC20_WALLET: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", // Replace with Morgan's actual wallet address
  SILVER_PRICE: 1000.00,
  GOLD_PRICE: 3000.00
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

// Command: /start
bot.start((ctx) => {
  const name = ctx.from.first_name || 'there';
  return ctx.reply(
    `👋 Welcome to Morgan's Premium Platform, ${name}!\n\nAccess exclusive updates, masterclass memberships, and secure booking tiers entirely backed by crypto processing.`,
    Markup.inlineKeyboard([
      [Markup.button.callback('🎟 View Memberships', 'menu_memberships')],
      [Markup.button.callback('👤 My Account Profile', 'menu_account')]
    ])
  );
});

// Action: View Memberships
bot.action('menu_memberships', async (ctx) => {
  await ctx.answerCbQuery();
  return ctx.reply(
    '✨ *Select a Premium Membership Tier:*',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🥈 Silver Tier - 1000 USDT', 'pay_silver')],
        [Markup.button.callback('🥇 Gold Tier - 3000 USDT', 'pay_gold')],
        [Markup.button.callback('⬅️ Back', 'go_start')]
      ])
    }
  );
});

// Action: Silver Payment Invoice
bot.action('pay_silver', async (ctx) => {
  await ctx.answerCbQuery();
  return ctx.reply(
    `💳 *Payment Invoice (Silver Tier)*\n\n` +
    `Send exactly *${CRYPTO_CONFIG.SILVER_PRICE} USDT* via the *TRON (TRC-20)* network to:\n\n` +
    `\`${CRYPTO_CONFIG.USDT_TRC20_WALLET}\`\n\n` +
    `⚠️ _Ensure you use the TRC-20 network or your crypto will be lost permanently._\n\n` +
    `Once the transaction is broadcast, copy your TX hash and verify it here by running:\n` +
    `\`/verify silver YOUR_TRANSACTION_HASH\``,
    { parse_mode: 'Markdown' }
  );
});

// Action: Gold Payment Invoice
bot.action('pay_gold', async (ctx) => {
  await ctx.answerCbQuery();
  return ctx.reply(
    `💳 *Payment Invoice (Gold Tier)*\n\n` +
    `Send exactly *${CRYPTO_CONFIG.GOLD_PRICE} USDT* via the *TRON (TRC-20)* network to:\n\n` +
    `\`${CRYPTO_CONFIG.USDT_TRC20_WALLET}\`\n\n` +
    `Once the transaction is broadcast, copy your TX hash and verify it here by running:\n` +
    `\`/verify gold YOUR_TRANSACTION_HASH\``,
    { parse_mode: 'Markdown' }
  );
});

// Action: View Profile
bot.action('menu_account', async (ctx) => {
  await ctx.answerCbQuery();
  const user = ctx.dbUser;
  return ctx.reply(
    `👤 *Your Account Overview*\n\n` +
    `• *Database ID:* \`${user.id}\`\n` +
    `• *Telegram User ID:* \`${user.telegramId.toString()}\`\n` +
    `• *First Name:* ${user.firstName || 'Not Set'}\n` +
    `• *Username:* ${user.username ? `@${user.username}` : 'None'}\n\n` +
    `_Your premium status updates automatically when pending verifications complete on-chain._`,
    { 
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[Markup.button.callback('⬅️ Back to Main Menu', 'go_start')]])
    }
  );
});

// Action: Go to Start (Navigation Reset)
bot.action('go_start', async (ctx) => {
  await ctx.answerCbQuery();
  return ctx.reply(
    `Explore options below:`,
    Markup.inlineKeyboard([
      [Markup.button.callback('🎟 View Memberships', 'menu_memberships')],
      [Markup.button.callback('👤 My Account Profile', 'menu_account')]
    ])
  );
});

// Command: /verify [tier] [txHash]
bot.command('verify', async (ctx) => {
  const args = ctx.message.text.split(' ');
  if (args.length < 3) {
    return ctx.reply('❌ Invalid layout. Please execute like this:\n/verify [silver/gold] [your_transaction_hash]');
  }

  const tier = args[1].toLowerCase();
  const txHash = args[2];
  const price = tier === 'silver' ? CRYPTO_CONFIG.SILVER_PRICE : CRYPTO_CONFIG.GOLD_PRICE;

  if (tier !== 'silver' && tier !== 'gold') {
    return ctx.reply('❌ Invalid membership tier specified. Use "silver" or "gold".');
  }

  try {
    await prisma.payment.create({
      data: {
        txHash: txHash,
        userId: ctx.dbUser.id,
        amountCrypto: price,
        cryptocurrency: 'USDT_TRC20',
        status: 'pending_verification'
      }
    });

    return ctx.reply(
      `✅ *Transaction Logged Successfully!*\n\n` +
      `Your transaction hash ending in \`...${txHash.slice(-6)}\` has been sent to backend admins for verification. Your account status will update instantly upon manual audit confirmation.`,
      { parse_mode: 'Markdown' }
    );
  } catch (err) {
    // Handle database uniqueness constraint checks (P2002)
    if (err.code === 'P2002') {
      return ctx.reply('❌ This specific transaction hash has already been submitted for evaluation.');
    }
    console.error(err);
    return ctx.reply('❌ System error recording your verification hash.');
  }
});

// Spin up HTTP Server and launch Bot Engine
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Web server interface active on port :${PORT}`));

bot.launch()
  .then(() => console.log('🤖 Morgan Monetization Bot Engine is online and polling!'))
  .catch((err) => console.error('Failed to boot Telegram engine:', err));

// Graceful shutdowns
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));