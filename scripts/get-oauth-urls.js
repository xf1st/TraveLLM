// Скрипт для получения правильных OAuth URL
const sites = {
  development: {
    origin: 'http://localhost:3000',
    redirect: 'http://localhost:3000/auth/callback',
    supabase: 'https://gsmdgtopofvklvkninfl.supabase.co/auth/v1/callback'
  },
  production: {
    origin: 'https://travelmind-ai-guide.vercel.app',
    redirect: 'https://travelmind-ai-guide.vercel.app/auth/callback',
    supabase: 'https://gsmdgtopofvklvkninfl.supabase.co/auth/v1/callback'
  }
};

console.log('=== OAuth Configuration for TraveLM ===\n');

Object.entries(sites).forEach(([env, config]) => {
  console.log(`${env.toUpperCase()}:`);
  console.log(`  Authorized JavaScript origins: ${config.origin}`);
  console.log(`  Authorized redirect URIs: ${config.redirect}`);
  console.log(`  Supabase redirect URL: ${config.supabase}`);
  console.log('');
});

console.log('Google Cloud Console → APIs & Services → Credentials → OAuth Client ID');
console.log('Application Type: Web application');
console.log('Name: TraveLM Web Client\n');
