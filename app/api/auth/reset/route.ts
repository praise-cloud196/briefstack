import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { createResetToken } from '@/lib/auth/reset-token'
import { sendPasswordResetEmail } from '@/lib/email'

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

    // Always return the same response to prevent email enumeration
    if (!user) {
      return NextResponse.json(
        { message: 'If an account with that email exists, a reset link has been sent.' },
        { status: 200 }
      )
    }

    const token = await createResetToken(email)
    const origin = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const resetUrl = `${origin}/auth/reset/confirm?token=${token}`

    const emailSent = await sendPasswordResetEmail(email, resetUrl)

    // In development, include a direct link for convenience
    if (!emailSent && process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        message: 'If an account with that email exists, a reset link has been sent.',
        devUrl: resetUrl,
      })
    }

    return NextResponse.json({
      message: 'If an account with that email exists, a reset link has been sent.',
    })
  } catch (error) {
    console.error('Reset request error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
