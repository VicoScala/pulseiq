import dotenv from 'dotenv';
dotenv.config();

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

export const config = {
  port: parseInt(process.env.PORT ?? '3001', 10),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  sessionSecret: process.env.SESSION_SECRET ?? 'dev-secret-change-in-prod',
  dbPath: process.env.DB_PATH ?? './data/pulseiq.db',

  // ngrok tunnel (optional — only used in dev when NGROK_AUTHTOKEN is set)
  ngrok: {
    authtoken: process.env.NGROK_AUTHTOKEN ?? null,
    domain: process.env.NGROK_DOMAIN ?? null,     // optional static domain
  },

  resend: {
    apiKey: process.env.RESEND_API_KEY ?? '',
    fromEmail: process.env.RESEND_FROM_EMAIL ?? 'noreply@whoopmate.com',
  },

  whoop: {
    clientId: required('WHOOP_CLIENT_ID'),
    clientSecret: required('WHOOP_CLIENT_SECRET'),
    redirectUri: process.env.WHOOP_REDIRECT_URI ?? 'http://localhost:3001/auth/callback',
    authUrl: 'https://api.prod.whoop.com/oauth/oauth2/auth',
    tokenUrl: 'https://api.prod.whoop.com/oauth/oauth2/token',
    apiBase: 'https://api.prod.whoop.com/developer',
    scopes: [
      'offline',
      'read:profile',
      'read:body_measurement',
      'read:cycles',
      'read:recovery',
      'read:sleep',
      'read:workout',
    ].join(' '),
  },
} as const;
