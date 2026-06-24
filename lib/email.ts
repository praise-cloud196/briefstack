import { Resend } from 'resend'

const apiKey = process.env.RESEND_API_KEY
const resend = apiKey ? new Resend(apiKey) : null

export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string
): Promise<boolean> {
  if (!resend) {
    console.warn(
      '[EMAIL] RESEND_API_KEY is not configured. Password reset email was not sent.'
    )
    return false
  }

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'BriefStack <noreply@briefstack.app>',
      to: email,
      subject: 'Reset your BriefStack password',
      html: `
        <p>We received a request to reset your BriefStack password.</p>
        <p>
          <a href="${resetUrl}">Click here to reset your password</a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; font-family: monospace;">${resetUrl}</p>
        <p>This link expires in 1 hour.</p>
        <p>If you did not request a password reset, you can safely ignore this email.</p>
      `,
    })
    return true
  } catch (error) {
    console.error('[EMAIL] Failed to send password reset:', error)
    return false
  }
}
