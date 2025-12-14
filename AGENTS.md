# AGENTS.md — PriceCompass / FiyatPusulası

This file defines rules for AI coding agents (e.g. Codex) working in this repository.

If this file exists, its rules override default assumptions.

---

## Project Nature

This repository contains a **research-grade, privacy-preserving price observatory**.

Entity Resolution (ER) is the core business logic.
Inflation indices are derived outputs.

This is NOT a demo app.

---

## Architectural Non-Negotiables

1. **Entity Resolution is sacred**
   - Do NOT bypass ER logic.
   - Do NOT replace ER with naive string matching.
   - Do NOT auto-resolve low-confidence entities silently.

2. **Privacy is structural**
   - Never store receipt images.
   - Pixel data must be deleted after OCR.
   - OCR layout JSON (text + bounding boxes) may be retained.
   - Never introduce user identity (email, phone, IP storage).

3. **Human-in-the-loop is required**
   - If confidence is low, surface uncertainty to the user.
   - User confirmations are first-class ground truth.
   - Crowdsourced labeling is intentional, not a fallback.

4. **Auditability**
   - Resolution decisions must be explainable.
   - Store confidence scores and resolution method.
   - Version critical logic when changed.

---

## Allowed Changes

AI agents may:
- add new features consistent with this architecture
- refactor for clarity or correctness
- add tests
- improve performance without changing semantics

---

## Forbidden Changes

AI agents must NOT:
- introduce accounts or identity systems
- auto-correct ambiguous data without confirmation
- delete structured data that enables reprocessing
- obscure uncertainty or remove confidence indicators
- add heavy frameworks without justification

---

## Development Expectations

- Prefer Docker-first changes.
- Keep services modular.
- Avoid over-engineering.
- When in doubt, choose correctness over speed.

---

## When Uncertain

If a requested change might violate these principles:
- STOP
- Explain the risk
- Ask for explicit confirmation
