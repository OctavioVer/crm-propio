import nodemailer from 'nodemailer'
import { config } from '../config'

const transporter = nodemailer.createTransport({
  host: config.SMTP_HOST,
  port: config.SMTP_PORT,
  auth: config.SMTP_USER ? { user: config.SMTP_USER, pass: config.SMTP_PASS } : undefined,
  secure: config.SMTP_PORT === 465,
})

export async function sendMagicLinkEmail(to: string, link: string, tenantName: string) {
  await transporter.sendMail({
    from: config.SMTP_FROM,
    to,
    subject: `Tu enlace de acceso a ${tenantName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Accede a ${tenantName}</h2>
        <p>Haz clic en el enlace para ingresar. Expira en 15 minutos.</p>
        <a href="${link}" style="
          display: inline-block;
          background: #6366f1;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: bold;
        ">Ingresar al CRM</a>
        <p style="color: #666; font-size: 12px; margin-top: 24px;">
          Si no solicitaste este enlace, ignora este correo.
        </p>
      </div>
    `,
  })
}

export async function sendInviteEmail(to: string, link: string, tenantName: string, inviterName: string) {
  await transporter.sendMail({
    from: config.SMTP_FROM,
    to,
    subject: `${inviterName} te invitó a ${tenantName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Fuiste invitado a ${tenantName}</h2>
        <p>${inviterName} te invitó a colaborar en el CRM.</p>
        <a href="${link}" style="
          display: inline-block;
          background: #6366f1;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: bold;
        ">Aceptar invitación</a>
      </div>
    `,
  })
}
