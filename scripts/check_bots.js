// Run with: node --env-file=.env scripts/check_bots.js
const MAIN_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPPORT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_SUPPORT;

async function checkBot(name, token) {
  if (!token) { console.error(`${name}: token is not configured`); return; }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const data = await res.json();
    console.log(`=== ${name} ===`);
    console.log('Status:', data.ok ? 'OK' : 'Error');
    if (data.ok) {
        console.log('Webhook configured:', Boolean(data.result.url));
        console.log('Has custom certificate:', data.result.has_custom_certificate);
        console.log('Pending update count:', data.result.pending_update_count);
        if (data.result.last_error_date) {
             console.log('Last error date:', new Date(data.result.last_error_date * 1000).toLocaleString('ru-RU'));
             console.log('Last error: reported by Telegram');
        }
    } else {
        console.log('Telegram error code:', data.error_code);
    }
    console.log('');

    // Also get bot me
    const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const meData = await meRes.json();
    if (meData.ok) {
      console.log(`Bot username: @${meData.result.username}`);
      console.log(`Bot name: ${meData.result.first_name}`);
    }
    console.log('\n---------------------------\n');
  } catch (e) {
    console.error(`Failed to check ${name}: network or API error`);
  }
}

async function run() {
  await checkBot('Main Bot', MAIN_TOKEN);
  await checkBot('Support Bot', SUPPORT_TOKEN);
}

run();
