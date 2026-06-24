import { prisma } from '@/lib/db/prisma'
import crypto from 'crypto'

export async function createResetToken(email: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

  await prisma.passwordResetToken.create({
    data: { email, token, expiresAt },
  })

  return token
}

export async function validateResetToken(token: string): Promise<string | null> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { token },
  })

  if (!record || record.expiresAt < new Date()) return null

  return record.email
}

export async function deleteResetToken(token: string): Promise<void> {
  await prisma.passwordResetToken.delete({ where: { token } })
}
