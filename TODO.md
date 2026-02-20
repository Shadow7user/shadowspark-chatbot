# Personality Layer v2 — Implementation Checklist

## Steps

- [x] 1. Create `src/lib/personality.ts` — new personality config module
- [x] 2. Edit `src/core/ai-brain.ts` — integrate personality detection + enhanced prompt + per-mode temperature/max_tokens
- [x] 3. Edit `src/core/conversation-manager.ts` — update DEFAULT_SYSTEM_PROMPT to ShadowSpark v2 identity

## Follow-up
- [ ] Commit & push → Railway auto-deploy
- [ ] Test with: confused / enterprise / sme / sales / default messages
