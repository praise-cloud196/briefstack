---
trigger: always_on
---

# SYSTEM RULES — BRIEFSTACK

## Purpose
These are hard constraints for building BriefStack. They override all other instructions when there is conflict.

---

## 1. MVP BOUNDARY (STRICT)

You are ONLY allowed to build the following MVP features:

- Authentication (login/signup)
- AI Brief Generation
- Brief Editor
- Save Brief
- Brief History
- Export Brief

DO NOT build anything outside this list.

---

## 2. FORBIDDEN FEATURES (DO NOT IMPLEMENT)

Never implement:

- AI article writing or blog generation
- Keyword volume or SEO metrics tools
- SERP scraping or competitor analysis
- Content calendars
- Collaboration or multi-user workflows
- Permissions or roles systems
- Workspaces or folders
- Notifications systems
- Analytics dashboards
- AI chat assistant interface
- Content scheduling tools

If a feature is not explicitly part of MVP, it must not exist.

---

## 3. AI BEHAVIOR CONSTRAINTS

AI must:

- Focus on content strategy, not content generation
- Produce structured outputs only
- Avoid fluff or filler content
- Avoid hallucinating data (no fake metrics, trends, or SEO numbers)
- Stay aligned with brief sections defined in PRD

AI must NEVER:
- Write full articles
- Act like a blog writer
- Generate keyword data or analytics

---

## 4. CODE QUALITY RULES

- Use TypeScript strictly
- Keep components modular and reusable
- Avoid unnecessary abstraction
- Prefer simplicity over clever architecture
- Do not introduce new libraries without clear need

---

## 5. PRODUCT DISCIPLINE

If a request or idea is outside MVP scope:

- Reject it in implementation
- Do not partially implement it
- Do not “leave hooks for later”

Only build what is required for MVP.

---

## 6. DATA SAFETY

- Never expose secrets in frontend code
- Validate all inputs before processing
- Sanitize AI outputs before rendering
- Store structured AI output only

---

## 7. FINAL PRINCIPLE

BriefStack is a focused MVP product.

If something does not improve:
- clarity
- speed of brief creation
- or quality of strategic output

DO NOT BUILD IT.