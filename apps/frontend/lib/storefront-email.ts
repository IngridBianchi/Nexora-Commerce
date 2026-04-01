import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2"

type StorefrontEmailInput = {
  to: string
  subject: string
  textBody: string
  htmlBody: string
}

export type StorefrontEmailDispatchResult = {
  delivery: "email" | "demo-link"
  actionUrl: string
  warning?: string
}

let cachedClient: SESv2Client | null = null

function getStorefrontEmailSender(): string {
  return process.env.STOREFRONT_EMAIL_FROM?.trim() ?? ""
}

function getStorefrontReplyTo(): string | null {
  const replyTo = process.env.STOREFRONT_EMAIL_REPLY_TO?.trim() ?? ""
  return replyTo.length > 0 ? replyTo : null
}

function getStorefrontSesClient(): SESv2Client {
  if (!cachedClient) {
    cachedClient = new SESv2Client({
      region: process.env.STOREFRONT_EMAIL_REGION?.trim() || process.env.AWS_REGION || "us-east-1"
    })
  }

  return cachedClient
}

export function isStorefrontEmailConfigured(): boolean {
  return getStorefrontEmailSender().length > 0
}

async function sendStorefrontEmail(input: StorefrontEmailInput): Promise<void> {
  const sender = getStorefrontEmailSender()
  if (sender.length === 0) {
    throw new Error("Storefront email sender is not configured")
  }

  const replyTo = getStorefrontReplyTo()

  await getStorefrontSesClient().send(
    new SendEmailCommand({
      FromEmailAddress: sender,
      Destination: {
        ToAddresses: [input.to]
      },
      ReplyToAddresses: replyTo ? [replyTo] : undefined,
      Content: {
        Simple: {
          Subject: { Data: input.subject, Charset: "UTF-8" },
          Body: {
            Text: { Data: input.textBody, Charset: "UTF-8" },
            Html: { Data: input.htmlBody, Charset: "UTF-8" }
          }
        }
      }
    })
  )
}

type VerificationEmailOptions = {
  email: string
  name: string
  verificationUrl: string
  expiresAt: string
}

export async function dispatchStorefrontVerificationEmail(
  options: VerificationEmailOptions
): Promise<StorefrontEmailDispatchResult> {
  if (!isStorefrontEmailConfigured()) {
    return {
      delivery: "demo-link",
      actionUrl: options.verificationUrl
    }
  }

  try {
    await sendStorefrontEmail({
      to: options.email,
      subject: "Verifica tu cuenta de Nexora",
      textBody: [
        `Hola ${options.name},`,
        "",
        "Gracias por registrarte en Nexora.",
        `Verifica tu cuenta desde este enlace: ${options.verificationUrl}`,
        `El enlace expira el ${options.expiresAt}.`
      ].join("\n"),
      htmlBody: [
        `<p>Hola ${options.name},</p>`,
        "<p>Gracias por registrarte en Nexora.</p>",
        `<p><a href="${options.verificationUrl}">Verificar mi cuenta</a></p>`,
        `<p>El enlace expira el <strong>${options.expiresAt}</strong>.</p>`
      ].join("")
    })

    return {
      delivery: "email",
      actionUrl: options.verificationUrl
    }
  } catch (error) {
    console.error("Storefront verification email failed:", error)

    return {
      delivery: "demo-link",
      actionUrl: options.verificationUrl,
      warning: "No se pudo enviar el email via SES. Usamos un enlace temporal de respaldo."
    }
  }
}

type PasswordResetEmailOptions = {
  email: string
  name: string
  resetUrl: string
  expiresAt: string
}

export async function dispatchStorefrontPasswordResetEmail(
  options: PasswordResetEmailOptions
): Promise<StorefrontEmailDispatchResult> {
  if (!isStorefrontEmailConfigured()) {
    return {
      delivery: "demo-link",
      actionUrl: options.resetUrl
    }
  }

  try {
    await sendStorefrontEmail({
      to: options.email,
      subject: "Restablece tu contrasena de Nexora",
      textBody: [
        `Hola ${options.name},`,
        "",
        "Recibimos una solicitud para restablecer tu contrasena.",
        `Usa este enlace: ${options.resetUrl}`,
        `El enlace expira el ${options.expiresAt}.`
      ].join("\n"),
      htmlBody: [
        `<p>Hola ${options.name},</p>`,
        "<p>Recibimos una solicitud para restablecer tu contrasena.</p>",
        `<p><a href="${options.resetUrl}">Restablecer contrasena</a></p>`,
        `<p>El enlace expira el <strong>${options.expiresAt}</strong>.</p>`
      ].join("")
    })

    return {
      delivery: "email",
      actionUrl: options.resetUrl
    }
  } catch (error) {
    console.error("Storefront password reset email failed:", error)

    return {
      delivery: "demo-link",
      actionUrl: options.resetUrl,
      warning: "No se pudo enviar el email via SES. Usamos un enlace temporal de respaldo."
    }
  }
}