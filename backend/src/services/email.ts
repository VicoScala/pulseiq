import { Resend } from 'resend';
import { config } from '../config';

let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend) {
    if (!config.resend.apiKey) throw new Error('RESEND_API_KEY not configured');
    resend = new Resend(config.resend.apiKey);
  }
  return resend;
}

export async function sendVerificationEmail(to: string, token: string, firstName: string): Promise<void> {
  const verifyUrl = `${config.frontendUrl}/verify-email?token=${token}`;
  await getResend().emails.send({
    from: config.resend.fromEmail,
    to,
    subject: 'Vérifiez votre email — Whoop Mate',
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:32px;color:#e2e8f0;background:#0a0a12;border-radius:16px">
        <h2 style="color:#fff;margin:0 0 8px">Bienvenue ${firstName} !</h2>
        <p style="margin:0 0 24px;color:#94a3b8">Cliquez ci-dessous pour vérifier votre adresse email et activer votre compte Whoop Mate.</p>
        <a href="${verifyUrl}" style="display:inline-block;padding:12px 28px;background:#44cf6c;color:#000;font-weight:600;text-decoration:none;border-radius:12px">Vérifier mon email</a>
        <p style="margin:24px 0 0;font-size:13px;color:#64748b">Ce lien expire dans 24 heures.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(to: string, token: string, firstName: string): Promise<void> {
  const resetUrl = `${config.frontendUrl}/reset-password?token=${token}`;
  await getResend().emails.send({
    from: config.resend.fromEmail,
    to,
    subject: 'Réinitialiser votre mot de passe — Whoop Mate',
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:32px;color:#e2e8f0;background:#0a0a12;border-radius:16px">
        <h2 style="color:#fff;margin:0 0 8px">Bonjour ${firstName},</h2>
        <p style="margin:0 0 24px;color:#94a3b8">Cliquez ci-dessous pour réinitialiser votre mot de passe.</p>
        <a href="${resetUrl}" style="display:inline-block;padding:12px 28px;background:#44cf6c;color:#000;font-weight:600;text-decoration:none;border-radius:12px">Réinitialiser</a>
        <p style="margin:24px 0 0;font-size:13px;color:#64748b">Ce lien expire dans 1 heure. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
      </div>
    `,
  });
}
