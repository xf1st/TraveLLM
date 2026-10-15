// Run with: node --env-file=.env scripts/set-webhooks.js



const MAIN_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPPORT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_SUPPORT;
const PR_TOKEN = process.env.TELEGRAM_BOT_TOKEN_PR;

const fs = require('fs');
const path = require('path');

// Try to read .env
let secret = '';
let prSecret = process.env.TELEGRAM_PR_WEBHOOK_SECRET || '';

try {
    const envPath = path.resolve(__dirname, '../.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/TELEGRAM_BOT_SECRET=(.*)/);
    if (match) secret = match[1].trim();

    const prSecretMatch = envContent.match(/TELEGRAM_PR_WEBHOOK_SECRET=(.*)/);
    if (prSecretMatch) prSecret = prSecretMatch[1].trim();

    if (!PR_TOKEN) {
        const prTokenMatch = envContent.match(/TELEGRAM_BOT_TOKEN_PR=(.*)/);
        if (prTokenMatch) Object.assign(process.env, { TELEGRAM_BOT_TOKEN_PR: prTokenMatch[1].trim() });
    }
} catch (e) {
    console.warn('Could not read .env file, secret might be missing.');
}

const baseUrl = process.argv[2] || 'https://travellm.ru';

// Ensure no trailing slash
const cleanUrl = baseUrl.replace(/\/$/, '');

const setWebhook = (token, path, name, usePrSecret = false) => {
    if (!token) {
        console.error(`❌ ${name}: No token provided.`);
        return;
    }

    const url = `${cleanUrl}${path}`;
    const tokenSecret = usePrSecret ? prSecret : (secret || '');
    if (!tokenSecret) { console.error(`${name}: webhook secret is not configured`); return; }
    const api = `https://api.telegram.org/bot${token}/setWebhook`;

    console.log(`Setting webhook for ${name} to ${url}...`);

    // Using fetch if available (Node 18+) or curl
    fetch(api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url, secret_token: tokenSecret }), signal: AbortSignal.timeout(15000) })
        .then(r => r.json())
        .then(d => {
            if (d.ok) console.log(`✅ ${name}: Success!`);
            else console.error(`❌ ${name}: Failed`, d.error_code);
        })
        .catch(() => console.error(`❌ ${name}: network or API error`));
};

setWebhook(MAIN_TOKEN, '/api/telegram/webhook', 'Main Bot');
setWebhook(SUPPORT_TOKEN, '/api/telegram/webhook-support', 'Support Bot');
setWebhook(process.env.TELEGRAM_BOT_TOKEN_PR, '/api/telegram/webhook-pr', 'PR Bot', true);
