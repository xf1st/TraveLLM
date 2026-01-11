// Проверка текущего домена и необходимых OAuth настроек
const fs = require('fs');
const path = require('path');

// Определяем текущий домен
const isProduction = process.env.NODE_ENV === 'production';
const currentDomain = isProduction 
  ? 'https://travelmind-ai-guide.vercel.app'
  : 'http://localhost:3000';

console.log('=== Текущая конфигурация OAuth ===\n');
console.log(`Среда: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
console.log(`Текущий домен: ${currentDomain}`);
console.log(`Callback URL: ${currentDomain}/auth/callback\n`);

console.log('=== Что нужно добавить в Google Cloud Console ===\n');
console.log('1. Зайдите в: https://console.cloud.google.com/');
console.log('2. Выберите: APIs & Services → Credentials');
console.log('3. Найдите ваш OAuth Client ID и нажмите Edit (карандаш)');
console.log('4. Добавьте в Authorized JavaScript origins:');
console.log(`   ${currentDomain}`);
console.log('5. Добавьте в Authorized redirect URIs:');
console.log(`   ${currentDomain}/auth/callback`);
console.log('\n=== Что должно быть в Supabase ===\n');
console.log('1. Зайдите в: https://supabase.com/dashboard');
console.log('2. Authentication → Providers → Google');
console.log('3. Redirect URL: https://gsmdgtopofvklvkninfl.supabase.co/auth/v1/callback');
console.log('\n⚠️  После изменений подождите 5-10 минут для применения настроек Google');
