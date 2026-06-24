import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { validateResetToken, deleteResetToken } from '@/lib/auth/reset-token'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    const email = await validateResetToken(token)
    if (!email) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    })

    await deleteResetToken(token)

    return NextResponse.json({ message: 'Password has been reset successfully.' })
  } catch (error) {
    console.error('Reset confirm error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
