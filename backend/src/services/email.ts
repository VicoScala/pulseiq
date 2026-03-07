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

// ── Shared HTML wrapper ─────────────────────────────────────────────────────

function emailWrapper(content: string): string {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;background:#0a0a12;border-radius:16px;overflow:hidden">
      <div style="padding:24px 32px 16px;text-align:center;border-bottom:1px solid #1e1e2e">
        <span style="font-size:20px;font-weight:700;color:#44cf6c;letter-spacing:-0.5px">Whoop Mate</span>
      </div>
      <div style="padding:32px;color:#e2e8f0">
        ${content}
      </div>
      <div style="padding:16px 32px 24px;text-align:center;border-top:1px solid #1e1e2e">
        <p style="margin:0;font-size:12px;color:#475569">Whoop Mate — Ton dashboard WHOOP social</p>
      </div>
    </div>
  `;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;padding:12px 28px;background:#44cf6c;color:#000;font-weight:600;text-decoration:none;border-radius:12px">${label}</a>`;
}

// ── Welcome + Email Verification ────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, token: string, firstName: string): Promise<void> {
  const verifyUrl = `${config.frontendUrl}/verify-email?token=${token}`;
  await getResend().emails.send({
    from: config.resend.fromEmail,
    to,
    subject: `Bienvenue ${firstName} ! Vérifie ton email — Whoop Mate`,
    html: emailWrapper(`
      <h2 style="color:#fff;margin:0 0 8px;font-size:22px">Bienvenue sur Whoop Mate, ${firstName} !</h2>
      <p style="margin:0 0 20px;color:#94a3b8">Ton compte est prêt. Voici ce qui t'attend :</p>
      <ul style="margin:0 0 24px;padding-left:20px;color:#cbd5e1;line-height:1.8">
        <li>📊 Dashboard complet de tes données WHOOP</li>
        <li>👥 Feed social — suis tes potes et compare vos perfs</li>
        <li>🏆 Streaks, badges et classements</li>
      </ul>
      <p style="margin:0 0 24px;color:#94a3b8">Pour commencer, vérifie ton adresse email :</p>
      <div style="text-align:center;margin:0 0 24px">
        ${button(verifyUrl, 'Vérifier mon email')}
      </div>
      <p style="margin:0;font-size:13px;color:#64748b">Ce lien expire dans 24 heures.</p>
    `),
  });
}

// ── Password Reset ──────────────────────────────────────────────────────────

export async function sendPasswordResetEmail(to: string, token: string, firstName: string): Promise<void> {
  const resetUrl = `${config.frontendUrl}/reset-password?token=${token}`;
  await getResend().emails.send({
    from: config.resend.fromEmail,
    to,
    subject: 'Réinitialiser votre mot de passe — Whoop Mate',
    html: emailWrapper(`
      <h2 style="color:#fff;margin:0 0 8px;font-size:22px">Bonjour ${firstName},</h2>
      <p style="margin:0 0 24px;color:#94a3b8">Tu as demandé à réinitialiser ton mot de passe. Clique ci-dessous pour en choisir un nouveau.</p>
      <div style="text-align:center;margin:0 0 24px">
        ${button(resetUrl, 'Réinitialiser mon mot de passe')}
      </div>
      <p style="margin:0;font-size:13px;color:#64748b">Ce lien expire dans 1 heure. Si tu n'as pas demandé cette réinitialisation, ignore cet email.</p>
    `),
  });
}

// ── New Follower Notification ───────────────────────────────────────────────

export async function sendNewFollowerEmail(
  to: string,
  followerName: string,
  followerId: number,
  targetFirstName: string,
): Promise<void> {
  const profileUrl = `${config.frontendUrl}/profile/${followerId}`;
  await getResend().emails.send({
    from: config.resend.fromEmail,
    to,
    subject: `${followerName} te suit maintenant — Whoop Mate`,
    html: emailWrapper(`
      <h2 style="color:#fff;margin:0 0 8px;font-size:22px">Hey ${targetFirstName} !</h2>
      <p style="margin:0 0 24px;color:#94a3b8"><strong style="color:#fff">${followerName}</strong> vient de te suivre sur Whoop Mate. Va checker son profil !</p>
      <div style="text-align:center;margin:0 0 24px">
        ${button(profileUrl, 'Voir le profil')}
      </div>
    `),
  });
}
