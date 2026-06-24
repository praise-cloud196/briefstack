import { prisma } from '@/lib/db/prisma'
import crypto from 'crypto'

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export async function createResetToken(email: string): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString('hex')
  const hashedToken = hashToken(rawToken)
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

  await prisma.passwordResetToken.create({
    data: { email, token: hashedToken, expiresAt },
  })

  return rawToken
}

export async function validateResetToken(rawToken: string): Promise<string | null> {
  const hashedToken = hashToken(rawToken)

  const record = await prisma.passwordResetToken.findUnique({
    where: { token: hashedToken },
  })

  if (!record || record.expiresAt < new Date()) return null

  return record.email
}

export async function deleteResetToken(rawToken: string): Promise<void> {
  const hashedToken = hashToken(rawToken)
  await prisma.passwordResetToken.delete({ where: { token: hashedToken } })
}
