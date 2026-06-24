import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import authOptions from '@/lib/auth/options'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const briefs = await prisma.brief.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        topic: true,
        contentType: true,
        funnelStage: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ briefs })
  } catch (error) {
    console.error('List briefs error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch briefs' },
      { status: 500 }
    )
  }
}
