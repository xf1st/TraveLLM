
const { exec } = require('child_process');

const MAIN_TOKEN = '7908346052:AAEy3lq12mhxpM0C_YltrD7FKeOoR7Xuxjo';
const SUPPORT_TOKEN = '8579819903:AAG5EulM8gqpPMXqjgCLG468mbA8zos7xvw';
const PR_TOKEN = process.env.TELEGRAM_BOT_TOKEN_PR;

const fs = require('fs');
const path = require('path');

// Try to read .env
let secret = '';
let prSecret = 'travellm_pr_secret';

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
    const api = `https://api.telegram.org/bot${token}/setWebhook?url=${url}&secret_token=${tokenSecret}`;
    
    console.log(`Setting webhook for ${name} to ${url}...`);
    
    // Using fetch if available (Node 18+) or curl
    fetch(api)
        .then(r => r.json())
        .then(d => {
            if (d.ok) console.log(`✅ ${name}: Success!`);
            else console.error(`❌ ${name}: Failed`, d);
        })
        .catch(e => console.error(`❌ ${name}: Error`, e));
};

setWebhook(MAIN_TOKEN, '/api/telegram/webhook', 'Main Bot');
setWebhook(SUPPORT_TOKEN, '/api/telegram/webhook-support', 'Support Bot');
setWebhook(process.env.TELEGRAM_BOT_TOKEN_PR, '/api/telegram/webhook-pr', 'PR Bot', true);
