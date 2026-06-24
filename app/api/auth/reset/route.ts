import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { createResetToken } from '@/lib/auth/reset-token'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({ where: { email } })

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json(
        { message: 'If an account with that email exists, a reset link has been generated.' },
        { status: 200 }
      )
    }

    const token = await createResetToken(email)
    const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/reset/confirm?token=${token}`

    // Log for dev — replace with email transport in production
    console.log(`[RESET] Password reset requested for ${email}: ${resetUrl}`)

    return NextResponse.json({
      message: 'If an account with that email exists, a reset link has been generated.',
      ...(process.env.NODE_ENV === 'development' && { devUrl: resetUrl }),
    })
  } catch (error) {
    console.error('Reset request error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
