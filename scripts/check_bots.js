const MAIN_TOKEN = '7908346052:AAEy3lq12mhxpM0C_YltrD7FKeOoR7Xuxjo';
const SUPPORT_TOKEN = '8579819903:AAG5EulM8gqpPMXqjgCLG468mbA8zos7xvw';

async function checkBot(name, token) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const data = await res.json();
    console.log(`=== ${name} ===`);
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
    console.error(`Failed to check ${name}:`, e.message);
  }
}

async function run() {
  await checkBot('Main Bot', MAIN_TOKEN);
  await checkBot('Support Bot', SUPPORT_TOKEN);
}

run();
