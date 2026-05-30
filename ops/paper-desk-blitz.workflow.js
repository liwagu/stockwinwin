export const meta = {
  name: 'paper-desk-blitz',
  description: 'Parallel Opus 4.8 blitz: frontend (T2,T3,T4,T6,T7) and backend (T5) in isolated worktrees, each committed locally (never push).',
  phases: [{ title: 'Blitz', model: 'opus' }],
}

const FE_WT = '/Users/guliwa/_code/_swww_wt/frontend'
const BE_WT = '/Users/guliwa/_code/_swww_wt/backend'
const MAIN = '/Users/guliwa/_code/stockwinwin'

const SANDBOX_NOTE =
  `These worktrees are OUTSIDE the default command sandbox. If ANY Bash command fails with ` +
  `"Operation not permitted" / sandbox / write-denied, immediately retry the SAME command with ` +
  `dangerouslyDisableSandbox: true. Use absolute paths only.`

const SAFETY =
  `\n- Work ONLY inside your assigned worktree path. Do NOT touch any other directory or repo.` +
  `\n- Keep the deterministic committee as default; preserve the LLM-adapter fallback.` +
  `\n- Never change production defaults: NEXT_PUBLIC_ENABLE_PAPER_DESK stays off by default; previews use PAPER_DESK_API_MODE=mock.` +
  `\n- Preserve paper-only / simulation / no-real-money / no-guaranteed-returns language everywhere.` +
  `\n- No secrets in code, logs, or commit messages. Never print API keys.` +
  `\n- Commit LOCALLY in your worktree only. NEVER run git push.`

const RESULT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    committed: { type: 'boolean' },
    sha: { type: 'string' },
    summary: { type: 'string' },
    filesChanged: { type: 'array', items: { type: 'string' } },
    validation: { type: 'string', description: 'what was run and the result' },
    notes: { type: 'string' },
  },
  required: ['committed', 'summary'],
}

const CONTRACT_REF =
  `Ground yourself first: read ${MAIN}/docs/PAPER_DESK_V1_CONTRACT.md and ${MAIN}/docs/AGENT_WORKFLOW.md ` +
  `(the contract lives in the main checkout, not your worktree — read it from there). ` +
  `Then read the relevant existing code in YOUR worktree.`

phase('Blitz')

const FRONTEND_PROMPT =
  `You are a senior frontend engineer. Worktree: ${FE_WT} (branch blitz/frontend). Project: StockWinWin Paper Desk, Next.js 15 App Router + shadcn/ui + Tailwind 4.\n\n` +
  `Setup (do this FIRST so lint/typecheck work without a slow install):\n` +
  `1. ln -s ${MAIN}/trading-ui/node_modules ${FE_WT}/trading-ui/node_modules\n` +
  `2. For each of .env .env.production .env.local that exists in ${MAIN}/trading-ui, copy it into ${FE_WT}/trading-ui (cp). Do NOT print their contents.\n\n` +
  `Implement these tasks to a high, real-product quality bar, all within ${FE_WT}/trading-ui (primarily app/paper/PaperDeskClient.tsx, app/paper/page.tsx, and app/api/paper-desk/*; extract components under app/paper/ if it improves clarity):\n` +
  `- T2 contract conformance + polish: one-person-investment-bank framing, clear paper-only boundary, three agent brief panels each surfacing stance, thesis, confidence, evidence, invalidation, allocation_guardrails, source_quality; five-asset allocation controls (NVDA, AMD, TSLA, BTCUSDT, SPY); submit; resolve result; journal/history preview. Use the existing design system.\n` +
  `- T3 allocation UX: live running total with under/over-100 messaging, a "normalize to 100" helper, quick presets, submit disabled until the allocation is valid.\n` +
  `- T4 resolve-result visualization: clearly surface portfolio return vs SPY benchmark, alpha, max drawdown, per-asset returns, and the price/data source label (including a labeled fallback when data is missing — never show unlabeled fabricated numbers).\n` +
  `- T6 loading / empty / error states for every async surface, with consistent paper-only disclaimers visible at submit and resolve.\n` +
  `- T7 accessibility & responsiveness: keyboard-operable allocation controls, sufficient contrast, layout holds at 375px width.\n\n` +
  `${CONTRACT_REF}\n\n` +
  `Validate before committing (in ${FE_WT}/trading-ui): run \`npx tsc --noEmit\` and \`NEXT_PUBLIC_ENABLE_PAPER_DESK=true npm run lint\`. Fix issues you introduced. (The full production build runs later at integration — you do NOT need to run \`npm run build\`.)\n\n` +
  `Then commit locally in the worktree: \`git -C ${FE_WT} add -A trading-ui\` then a clear conventional commit covering T2/T3/T4/T6/T7. Return the sha, a summary, files changed, and what validation you ran.\n\n` +
  `Constraints:${SAFETY}\n\n${SANDBOX_NOTE}`

const BACKEND_PROMPT =
  `You are a senior backend engineer. Worktree: ${BE_WT} (branch blitz/backend). Project: StockWinWin Paper Desk, Python FastAPI.\n\n` +
  `Implement task T5 (test-coverage hardening), all within ${BE_WT}/ai-service:\n` +
  `- Write tests FIRST (tests/unit/test_paper_desk.py and siblings), then make them pass without weakening behavior.\n` +
  `- Cover: resolve is idempotent; duplicate allocation submit for the same (session_id, anonymous_id) is deterministic; missing market data produces a LABELED fallback / incomplete state (never an unlabeled fabricated result).\n` +
  `- The deterministic committee and the LLM-adapter fallback behavior must remain unchanged.\n\n` +
  `${CONTRACT_REF} Read ai-service/services/paper_desk_*.py, ai-service/routers/paper_desk.py, ai-service/repositories/paper_desk*.py, and existing tests in your worktree.\n\n` +
  `Validate before committing (from ${BE_WT}/ai-service):\n` +
  `  uv run --with pytest --with pytest-cov --with pydantic --with python-dotenv --with fastapi --with httpx pytest tests/unit/test_paper_desk.py tests/test_prediction_engine.py\n` +
  `All tests must pass.\n\n` +
  `Then commit locally in the worktree: \`git -C ${BE_WT} add -A ai-service\` then a clear conventional commit for T5. Return the sha, a summary, files changed, and the test result.\n\n` +
  `Constraints:${SAFETY}\n\n${SANDBOX_NOTE}`

const [frontend, backend] = await parallel([
  () => agent(FRONTEND_PROMPT, { label: 'blitz-frontend', phase: 'Blitz', model: 'opus', schema: RESULT_SCHEMA }),
  () => agent(BACKEND_PROMPT, { label: 'blitz-backend', phase: 'Blitz', model: 'opus', schema: RESULT_SCHEMA }),
])

log(`Frontend: ${frontend ? (frontend.committed ? 'committed ' + (frontend.sha || '') : 'NOT committed') : 'failed'}`)
log(`Backend:  ${backend ? (backend.committed ? 'committed ' + (backend.sha || '') : 'NOT committed') : 'failed'}`)

return { frontend, backend }
