const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const match = env.match(/TELEGRAM_BOT_TOKEN_PR=(.+)/);

if (match) {
  const token = match[1].trim();
  fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`)
    .then(r => r.json())
    .then(data => {
      console.log('=== PR Bot ===');
      console.log('Status:', data.ok ? 'OK' : 'Error');
      if (data.ok) {
          console.log('Webhook URL:', data.result.url || 'Not set');
          console.log('Has custom certificate:', data.result.has_custom_certificate);
          console.log('Pending update count:', data.result.pending_update_count);
          if (data.result.last_error_date) {
               console.log('Last error date:', new Date(data.result.last_error_date * 1000).toLocaleString('ru-RU'));
               console.log('Last error message:', data.result.last_error_message);
          }
      } else {
          console.log('Error data:', data);
      }
      return fetch(`https://api.telegram.org/bot${token}/getMe`);
    })
    .then(r => r.json())
    .then(meData => {
      if (meData.ok) {
        console.log(`Bot username: @${meData.result.username}`);
        console.log(`Bot name: ${meData.result.first_name}`);
      }
    })
    .catch(console.error);
} else {
  console.log('TELEGRAM_BOT_TOKEN_PR not found in .env');
}