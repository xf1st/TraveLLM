
const { exec } = require('child_process');

const MAIN_TOKEN = '7908346052:AAEy3lq12mhxpM0C_YltrD7FKeOoR7Xuxjo';
const SUPPORT_TOKEN = '8579819903:AAG5EulM8gqpPMXqjgCLG468mbA8zos7xvw';


const fs = require('fs');
const path = require('path');

// Try to read .env
let secret = '';
try {
    const envPath = path.resolve(__dirname, '../.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/TELEGRAM_BOT_SECRET=(.*)/);
    if (match) secret = match[1].trim();
} catch (e) {
    console.warn('Could not read .env file, secret might be missing.');
}

const baseUrl = process.argv[2];


if (!baseUrl) {
    console.error('❌ Please provide your public URL (e.g., https://my-app.vercel.app)');
    console.log('Usage: node scripts/set-webhooks.js <YOUR_PUBLIC_URL>');
    process.exit(1);
}

// Ensure no trailing slash
const cleanUrl = baseUrl.replace(/\/$/, '');

const setWebhook = (token, path, name) => {
    const url = `${cleanUrl}${path}`;
    const api = `https://api.telegram.org/bot${token}/setWebhook?url=${url}&secret_token=${secret || ''}`;
    
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
