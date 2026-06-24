import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import authOptions from '@/lib/auth/options'
import { generateBrief } from '@/lib/ai/generate'
import { prisma } from '@/lib/db/prisma'
import type { BriefInput, BriefOutput, RefinementMode } from '@/types'
import { classifyBackendError } from '@/lib/errors'

export async function POST(request: Request) {
  const requestId = crypto.randomUUID?.() ?? Date.now().toString(36)
  const prefix = `[BRIEF:${requestId}]`
  const perf: Record<string, number> = {}
  const tStart = performance.now()

  console.log(`${prefix} ========== INCOMING REQUEST ==========`)
  console.log(`${prefix} Method: POST`)

  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    console.log(`${prefix} Authenticated user:`, userId ?? '(anonymous)')

    if (!process.env.DEEPSEEK_API_KEY) {
      console.error(`${prefix} Missing DEEPSEEK_API_KEY environment variable`)
      return NextResponse.json(
        { error: 'AI generation is not configured. Contact the administrator.', code: 'SERVER_ERROR' },
        { status: 503 }
      )
    }
    console.log(`${prefix} DEEPSEEK_API_KEY present:`, !!process.env.DEEPSEEK_API_KEY)

    // Read raw request body first for logging
    let rawBody: string
    try {
      rawBody = await request.text()
      console.log(`${prefix} Raw request body:`, rawBody)
    } catch (bodyErr) {
      console.error(`${prefix} Failed to read request body:`, bodyErr)
      return NextResponse.json({ error: 'Invalid request body', code: 'VALIDATION_ERROR' }, { status: 400 })
    }

    // Parse JSON from raw body
    let body: Record<string, unknown>
    try {
      body = JSON.parse(rawBody)
      console.log(`${prefix} Parsed body:`, JSON.stringify(body, null, 2))
    } catch (parseErr) {
      console.error(`${prefix} JSON parse error on request body:`, (parseErr as Error)?.message)
      console.error(`${prefix} Raw body that failed:`, rawBody)
      return NextResponse.json(
        {
          error: process.env.NODE_ENV === 'development' ? `Invalid JSON in request body: ${(parseErr as Error)?.message}` : 'Invalid request body',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      )
    }

    // Extract refinement parameters
    const refinementMode = (body.refinementMode as RefinementMode) || undefined
    const briefId = (body.id as string) || undefined
    const currentOutput = body.currentOutput as BriefOutput | undefined

    // Build input from body (strip refinement-only fields)
    const input: BriefInput = {
      topic: body.topic as string,
      targetAudience: body.targetAudience as string,
      contentType: body.contentType as string,
      funnelStage: body.funnelStage as string,
      businessGoal: body.businessGoal as string | undefined,
      productContext: body.productContext as string | undefined,
      brandVoice: body.brandVoice as string | undefined,
    }

    // Validate required fields with detailed logging
    const requiredFields = ['topic', 'targetAudience', 'contentType', 'funnelStage'] as const
    const missingFields = requiredFields.filter((f) => {
      const val = input[f as keyof BriefInput]
      return !val || (typeof val === 'string' && val.trim() === '')
    })
    if (missingFields.length > 0) {
      console.error(`${prefix} Validation failure — missing/empty fields:`, missingFields)
      console.error(`${prefix} Full input received:`, JSON.stringify(input, null, 2))
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}`, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }
    console.log(`${prefix} Input validation PASSED`)
    perf.validation = performance.now() - tStart

    let brief

    if (refinementMode && !briefId) {
      // === ANONYMOUS REFINEMENT PATH: no DB record, use provided output ===
      console.log(`${prefix} ========== ANONYMOUS REFINEMENT PATH ==========`)
      console.log(`${prefix} Refinement mode:`, refinementMode)

      if (!currentOutput) {
        console.error(`${prefix} Missing currentOutput for anonymous refinement`)
        return NextResponse.json({ error: 'Missing current brief output', code: 'VALIDATION_ERROR' }, { status: 400 })
      }

      const tGenStart = performance.now()
      const output = await generateBrief(input, refinementMode, currentOutput)
      perf.llm = performance.now() - tGenStart
      console.log(`${prefix} generateBrief (anonymous refinement) succeeded (${(perf.llm / 1000).toFixed(1)}s)`)

      console.log(`${prefix} ========== RESPONSE 200 (anonymous refinement) ==========`)
      return NextResponse.json({ output }, { status: 200 })
    }

    if (briefId && refinementMode) {
      // === REFINEMENT PATH: modify the existing brief ===
      console.log(`${prefix} ========== REFINEMENT PATH ==========`)
      console.log(`${prefix} Refinement mode:`, refinementMode)
      console.log(`${prefix} Brief ID:`, briefId)

      if (!userId) {
        console.warn(`${prefix} Unauthorized refinement — no session`)
        return NextResponse.json({ error: 'Authentication required to refine a brief', code: 'UNAUTHORIZED' }, { status: 401 })
      }

      const existing = await prisma.brief.findUnique({ where: { id: briefId } })
      if (!existing) {
        console.error(`${prefix} Brief not found:`, briefId)
        return NextResponse.json({ error: 'Brief not found', code: 'NOT_FOUND' }, { status: 404 })
      }
      if (existing.userId !== userId) {
        console.error(`${prefix} Unauthorized update attempt by user:`, userId)
        return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 403 })
      }

      console.log(`${prefix} Current brief output keys:`, Object.keys(existing.output as object))

      const tGenStart = performance.now()
      const output = await generateBrief(input, refinementMode, existing.output as unknown as BriefOutput)
      perf.llm = performance.now() - tGenStart
      console.log(`${prefix} generateBrief (refinement) succeeded (${(perf.llm / 1000).toFixed(1)}s)`)

      try {
        brief = await prisma.brief.update({
          where: { id: briefId },
          data: {
            output: output as any,
            topic: input.topic,
            targetAudience: input.targetAudience,
            contentType: input.contentType,
            funnelStage: input.funnelStage,
            businessGoal: input.businessGoal ?? null,
            productContext: input.productContext ?? null,
            brandVoice: input.brandVoice ?? null,
          },
        })
        console.log(`${prefix} Prisma update SUCCEEDED — brief ID:`, brief.id)
      } catch (prismaErr) {
        console.error(`${prefix} Prisma update FAILED`)
        console.error(`${prefix} Prisma error name:`, (prismaErr as Error)?.name || 'N/A')
        console.error(`${prefix} Prisma error message:`, (prismaErr as Error)?.message || 'N/A')
        console.error(`${prefix} Prisma error stack:`, (prismaErr as Error)?.stack || 'N/A')
        if (typeof prismaErr === 'object' && prismaErr !== null) {
          console.error(`${prefix} Full Prisma error object:`, JSON.stringify(prismaErr, Object.getOwnPropertyNames(prismaErr), 2))
        }
        throw prismaErr
      }

      console.log(`${prefix} ========== RESPONSE 200 (refinement) ==========`)
      return NextResponse.json({ brief }, { status: 200 })
    } else {
      // === NEW GENERATION PATH: create a new brief ===
      console.log(`${prefix} ========== NEW GENERATION PATH ==========`)

      const tGenStart = performance.now()
      const output = await generateBrief(input)
      perf.llm = performance.now() - tGenStart
      console.log(`${prefix} generateBrief succeeded (${(perf.llm / 1000).toFixed(1)}s)`)
      console.log(`${prefix} Output keys:`, Object.keys(output))

      if (userId) {
        // Authenticated — save to DB
        console.log(`${prefix} ========== SAVING TO PRISMA ==========`)
        console.log(`${prefix} Prisma data:`, JSON.stringify({
          userId,
          topic: input.topic,
          targetAudience: input.targetAudience,
          contentType: input.contentType,
          funnelStage: input.funnelStage,
          businessGoal: input.businessGoal ?? null,
          productContext: input.productContext ?? null,
          brandVoice: input.brandVoice ?? null,
          outputKeys: Object.keys(output),
        }, null, 2))

        try {
          const tStoreStart = performance.now()
          brief = await prisma.brief.create({
            data: {
              userId,
              topic: input.topic,
              targetAudience: input.targetAudience,
              contentType: input.contentType,
              funnelStage: input.funnelStage,
              businessGoal: input.businessGoal ?? null,
              productContext: input.productContext ?? null,
              brandVoice: input.brandVoice ?? null,
              output: output as any,
            },
          })
          perf.storage = performance.now() - tStoreStart
          console.log(`${prefix} Prisma save SUCCEEDED — brief ID:`, brief.id)
        } catch (prismaErr) {
          console.error(`${prefix} Prisma save FAILED`)
          console.error(`${prefix} Prisma error name:`, (prismaErr as Error)?.name || 'N/A')
          console.error(`${prefix} Prisma error message:`, (prismaErr as Error)?.message || 'N/A')
          console.error(`${prefix} Prisma error stack:`, (prismaErr as Error)?.stack || 'N/A')
          if (typeof prismaErr === 'object' && prismaErr !== null) {
            console.error(`${prefix} Full Prisma error object:`, JSON.stringify(prismaErr, Object.getOwnPropertyNames(prismaErr), 2))
          }
          throw prismaErr
        }

        perf.total = performance.now() - tStart

        if (process.env.NODE_ENV === 'development') {
          console.log(`[PERF:${requestId}] ========== TIMING ==========`)
          console.log(`[PERF:${requestId}] Validation: ${perf.validation.toFixed(0)}ms`)
          console.log(`[PERF:${requestId}] LLM request: ${(perf.llm / 1000).toFixed(1)}s`)
          console.log(`[PERF:${requestId}] Storage: ${perf.storage.toFixed(0)}ms`)
          console.log(`[PERF:${requestId}] Total generation time: ${(perf.total / 1000).toFixed(2)}s`)
          console.log(`[PERF:${requestId}] =============================`)
        }

        console.log(`${prefix} ========== RESPONSE 201 ==========`)
        return NextResponse.json({ brief }, { status: 201 })
      } else {
        // Anonymous — return output without saving to DB
        console.log(`${prefix} Anonymous generation — skipping Prisma save`)
        console.log(`${prefix} ========== RESPONSE 200 (anonymous) ==========`)
        return NextResponse.json({ brief: { output } }, { status: 200 })
      }
    }
  } catch (error) {
    console.error(`${prefix} ========== CATCH BLOCK ==========`)
    console.error(`${prefix} Error type:`, typeof error)
    console.error(`${prefix} Error name:`, (error as Error)?.name || 'N/A')
    console.error(`${prefix} Error message:`, (error as Error)?.message || 'N/A')
    console.error(`${prefix} Stack trace:`, (error as Error)?.stack || 'N/A')

    if (typeof error === 'object' && error !== null) {
      console.error(`${prefix} Full error object:`, JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
    }

    const classified = classifyBackendError(error)
    const devMessage = process.env.NODE_ENV === 'development'
      ? (error instanceof Error ? error.message : 'Unknown error')
      : undefined

    console.log(`${prefix} Response status: 500, code: ${classified.code}, error: ${classified.error}`)

    return NextResponse.json(
      {
        error: classified.error,
        code: classified.code,
        ...(devMessage ? { detail: devMessage } : {}),
      },
      { status: 500 }
    )
  }
}
