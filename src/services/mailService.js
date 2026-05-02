const buildTransporter = () => {
  let nodemailer;
  try {
    // Carga diferida para evitar que toda la app se caiga si falta la dependencia.
    nodemailer = require("nodemailer");
  } catch (error) {
    throw new Error("Falta dependencia nodemailer. Ejecuta: npm install");
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("Configuración SMTP incompleta");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });
};

const sendPasswordResetEmail = async ({ to, resetLink, nombre }) => {
  const from = process.env.SMTP_FROM;
  const appName = process.env.APP_NAME || "PracticeSoft";
  const greetingName = nombre || "usuario";

  if (!from) {
    throw new Error("Falta SMTP_FROM en variables de entorno");
  }

  const transporter = buildTransporter();
  await transporter.verify();

  const info = await transporter.sendMail({
    from,
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
