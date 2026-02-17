import nodemailer from 'nodemailer';

function createTransporter() {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
        },
    });
}

export async function sendPasswordResetEmail(email: string, token: string, userName: string) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    const htmlContent = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0f0b1a; border-radius: 20px; overflow: hidden; border: 1px solid rgba(168,85,247,0.2);">
        <div style="background: linear-gradient(135deg, #ec4899, #a855f7, #6366f1); padding: 32px; text-align: center;">
            <div style="font-size: 3rem; margin-bottom: 8px;">🎈</div>
            <h1 style="color: white; margin: 0; font-size: 1.6rem; font-weight: 800;">PinkBalloon</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 4px 0 0; font-size: 0.9rem;">Turma das Maratonistas TM</p>
        </div>
        <div style="padding: 32px;">
            <h2 style="color: #f8f0ff; margin: 0 0 16px; font-size: 1.2rem;">Oi, ${userName}! 👋</h2>
            <p style="color: #c4b5d4; line-height: 1.6; font-size: 0.95rem;">
                Recebemos um pedido para redefinir sua senha. Clique no botao abaixo para criar uma nova senha:
            </p>
            <div style="text-align: center; margin: 28px 0;">
                <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #ec4899, #a855f7); color: white; text-decoration: none; padding: 14px 36px; border-radius: 12px; font-weight: 700; font-size: 1rem;">
                    Redefinir Senha 🔑
                </a>
            </div>
            <p style="color: #8b7a9e; font-size: 0.85rem; line-height: 1.5;">
                Se voce nao solicitou essa mudanca, ignore este email. O link expira em <strong style="color: #f472b6;">1 hora</strong>.
            </p>
            <hr style="border: none; border-top: 1px solid rgba(168,85,247,0.15); margin: 24px 0;" />
            <p style="color: #8b7a9e; font-size: 0.75rem; text-align: center;">
                Se o botao nao funcionar, copie e cole este link no navegador:<br/>
                <a href="${resetUrl}" style="color: #a855f7; word-break: break-all; font-size: 0.7rem;">${resetUrl}</a>
            </p>
        </div>
    </div>
    `;

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        console.log('========================================');
        console.log('📧 EMAIL DE RESET (configure GMAIL_USER e GMAIL_APP_PASSWORD no .env)');
        console.log(`Para: ${email}`);
        console.log(`Link: ${resetUrl}`);
        console.log('========================================');
        return;
    }

    const transporter = createTransporter();

    await transporter.sendMail({
        from: `PinkBalloon 🎈 <${process.env.GMAIL_USER}>`,
        to: email,
        subject: '🎈 PinkBalloon - Redefinir Senha',
        html: htmlContent,
    });
}
