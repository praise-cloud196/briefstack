import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import authOptions from '@/lib/auth/options'
import { prisma } from '@/lib/db/prisma'
import type { BriefOutput } from '@/types'

export async function GET(
  _request: Request,
  context: RouteContext<'/api/brief/[id]'>
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    const brief = await prisma.brief.findUnique({
      where: { id },
    })

    if (!brief) {
      return NextResponse.json({ error: 'Brief not found' }, { status: 404 })
    }

    if (brief.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ brief })
  } catch (error) {
    console.error('Get brief error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch brief' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext<'/api/brief/[id]'>
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    const existing = await prisma.brief.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Brief not found' }, { status: 404 })
    }

    if (existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { output } = body as { output?: BriefOutput }

    if (!output) {
      return NextResponse.json(
        { error: 'Output data is required' },
        { status: 400 }
      )
    }

    const updated = await prisma.brief.update({
      where: { id },
      data: { output: output as any },
    })

    return NextResponse.json({ brief: updated })
  } catch (error) {
    console.error('Update brief error:', error)
    return NextResponse.json(
      { error: 'Failed to update brief' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext<'/api/brief/[id]'>
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    const existing = await prisma.brief.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Brief not found' }, { status: 404 })
    }

    if (existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.brief.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete brief error:', error)
    return NextResponse.json(
      { error: 'Failed to delete brief' },
      { status: 500 }
    )
  }
}
