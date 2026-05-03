const resolveSmtpConfig = () => {
  const host = process.env.SMTP_HOST || process.env.MAIL_HOST;
  const port = Number(process.env.SMTP_PORT || process.env.MAIL_PORT || 587);
  const user = process.env.SMTP_USER || process.env.SMPT_USER || process.env.MAIL_USER || process.env.EMAIL_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.SMPT_PASS || process.env.MAIL_PASS || process.env.EMAIL_PASS || process.env.GMAIL_PASS;

  return { host, port, user, pass };
};

const buildTransporter = () => {
  let nodemailer;
  try {
    // Carga diferida para evitar que toda la app se caiga si falta la dependencia.
    nodemailer = require("nodemailer");
  } catch (error) {
    throw new Error("Falta dependencia nodemailer. Ejecuta: npm install");
  }

  const { host, port, user, pass } = resolveSmtpConfig();

  if (!host || !user || !pass) {
    throw new Error("Configuración SMTP incompleta (revisa host/user/pass en SMTP_*, MAIL_* o GMAIL_*)");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });
};

const sendPasswordResetEmail = async ({ to, resetLink, nombre }) => {
  const { user: smtpUser } = resolveSmtpConfig();
  const from = process.env.SMTP_FROM || process.env.MAIL_FROM || process.env.EMAIL_FROM || smtpUser || "noreply@localhost";
  const appName = process.env.APP_NAME || "PracticeSoft";
  const greetingName = nombre || "usuario";

  const transporter = buildTransporter();
  await transporter.verify();

  const info = await transporter.sendMail({
    from: `${appName} <${from}>`,
    to,
    subject: `Recuperación de contraseña - ${appName}`,
    text: `Hola ${greetingName},\n\nRecibimos una solicitud para restablecer tu contraseña.\n\nUsa este enlace: ${resetLink}\n\nSi no solicitaste este cambio, ignora este correo.`,
    html: `
      <p>Hola <b>${greetingName}</b>,</p>
      <p>Recibimos una solicitud para restablecer tu contraseña.</p>
      <p>
        <a href="${resetLink}" target="_blank" rel="noopener noreferrer">Haz clic aquí para cambiar tu contraseña</a>
      </p>
      <p>Si no solicitaste este cambio, ignora este correo.</p>
    `
  });

  if (!info?.accepted?.length) {
    throw new Error("El proveedor SMTP no aceptó el correo de recuperación");
  }

  return {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected
  };
};

module.exports = { sendPasswordResetEmail };
