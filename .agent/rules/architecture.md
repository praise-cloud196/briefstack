---
trigger: always_on
---

# ARCHITECTURE — BRIEFSTACK

## Purpose
Define system structure and prevent architectural drift.

---

## 1. HIGH-LEVEL STACK

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma (recommended ORM)
- OpenAI API (core AI engine)
- Clerk or NextAuth (authentication)

---

## 2. SYSTEM DESIGN OVERVIEW

BriefStack has 4 core layers:

### 1. UI Layer
- Input forms
- Brief viewer
- Editor interface

### 2. API Layer
- AI generation endpoints
- Save/retrieve briefs
- Export handlers

### 3. AI Orchestration Layer
- Prompt construction
- Structured output parsing
- Validation of AI responses

### 4. Data Layer
- Users
- Briefs
- Exports

---

## 3. FOLDER STRUCTURE

/app
  /dashboard
  /brief/[id]
  /api
/components
/features
  /brief
  /editor
  /generation
/lib
  /ai
  /db
  /auth
/types

---

## 4. AI FLOW

1. User submits input form
2. Backend builds structured prompt
3. OpenAI generates brief
4. Response is validated and normalized
5. Stored in database
6. Returned to frontend

---

## 5. DATA FLOW PRINCIPLES

- AI output must always be structured JSON
- Never render raw unvalidated AI responses
- Store final processed output only

---

## 6. STATE MANAGEMENT

- Prefer local component state
- Avoid global state unless necessary
- Server state handled via API routes

---

## 7. PERFORMANCE PRINCIPLES

- Server-side generation for AI calls
- Minimize client-side computation
- Cache briefs where possible

---

## 8. FINAL ARCHITECTURAL PRINCIPLE

Keep the system simple.

If a design choice adds complexity without improving:
- speed
- reliability
- or clarity

DO NOT IMPLEMENT IT.
