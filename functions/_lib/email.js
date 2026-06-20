// Envio de email transacional via Resend (https://resend.com).
// Free tier: 100 emails/dia, 3000/mês. API simples por fetch.

export async function sendEmail(env, { to, subject, html }) {
  if (!env.RESEND_API_KEY) throw new Error('RESEND_API_KEY não configurada');
  const from = env.FROM_EMAIL || 'Portal SENAI <onboarding@resend.dev>';

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Falha ao enviar email (${r.status}): ${text}`);
  }
  return r.json();
}

export function passwordResetEmail({ name, resetUrl }) {
  return {
    subject: 'Redefinição de senha — Portal SENAI CIMATEC',
    html: `<!doctype html>
<html><head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; background: #f7f8fa; padding: 32px; color: #1f2937;">
  <div style="max-width: 520px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
    <h1 style="color: #003366; margin: 0 0 16px; font-size: 22px;">Redefinir sua senha</h1>
    <p>Olá${name ? `, ${name}` : ''}.</p>
    <p>Recebemos um pedido para redefinir a senha da sua conta no Portal do Colaborador SENAI CIMATEC. Clique no botão abaixo para escolher uma nova senha:</p>
    <p style="margin: 24px 0;">
      <a href="${resetUrl}" style="display: inline-block; background: #E31E24; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Redefinir senha</a>
    </p>
    <p style="color: #6b7280; font-size: 13px;">Este link expira em 1 hora. Se você não pediu essa redefinição, é só ignorar este email.</p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    <p style="color: #6b7280; font-size: 12px;">Se o botão não funcionar, copie e cole esta URL no navegador:<br><span style="word-break: break-all;">${resetUrl}</span></p>
  </div>
</body></html>`,
  };
}
