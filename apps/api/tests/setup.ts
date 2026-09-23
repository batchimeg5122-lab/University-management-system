// config/env.ts-д шаардлагатай хувьсагч — жинхэнэ Supabase руу хандахгүй (supabase-г тест бүрт mock хийнэ)
process.env.SUPABASE_URL ??= 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key-000000000000000000';
process.env.NODE_ENV = 'test';
