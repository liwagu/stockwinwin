export const meta = {
  name: 'paper-desk-push',
  description: 'Advance one StockWinWin Paper Desk demo-readiness task: assess backlog, implement (Opus), validate gates, commit locally (never push).',
  phases: [
    { title: 'Assess' },
    { title: 'Implement', model: 'opus' },
    { title: 'Validate' },
    { title: 'Commit' },
  ],
}

const REPO = '/Users/guliwa/_code/stockwinwin'
const BACKLOG = `${REPO}/docs/PAPER_DESK_DEMO_BACKLOG.md`
const BRANCH = 'codex/paper-desk-v1'

const SANDBOX_NOTE =
  `This repo (${REPO}) is OUTSIDE the default command sandbox. If a Bash command ` +
  `fails with an "Operation not permitted" / sandbox / write-denied error, immediately ` +
  `retry the SAME command with dangerouslyDisableSandbox: true. All paths must be absolute under ${REPO}.`

const SAFETY = [
  `Branch: ${BRANCH}. Work ONLY inside ${REPO}. Do NOT touch /Users/guliwa/_code/stockwin or any other repo.`,
  'Keep the deterministic committee as the default; preserve the LLM-adapter fallback behavior.',
  'Never change production defaults: NEXT_PUBLIC_ENABLE_PAPER_DESK stays off by default; previews use PAPER_DESK_API_MODE=mock.',
  'Preserve paper-only / simulation / no-real-money / no-guaranteed-returns language everywhere.',
  'No secrets in code, docs, logs, or commit messages. Never print API keys.',
  'Commit LOCALLY only. NEVER run git push.',
].join('\n- ')

const ASSESS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    hasTask: { type: 'boolean' },
    taskId: { type: 'string', description: 'e.g. T2, or "NONE" if no unchecked task' },
    title: { type: 'string' },
    scope: { type: 'string', enum: ['backend', 'frontend', 'docs', 'mixed', 'none'] },
    acceptance: { type: 'string' },
    files: { type: 'array', items: { type: 'string' } },
    rationale: { type: 'string' },
  },
  required: ['hasTask', 'taskId', 'title', 'scope', 'acceptance'],
}

const VALIDATE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    passed: { type: 'boolean' },
    summary: { type: 'string' },
    failures: { type: 'string', description: 'empty if passed' },
  },
  required: ['passed', 'summary'],
}

const COMMIT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    committed: { type: 'boolean' },
    sha: { type: 'string' },
    message: { type: 'string' },
  },
  required: ['committed'],
}

// ---- Phase 1: Assess -------------------------------------------------------
phase('Assess')
const task = await agent(
  `You are the planner for the StockWinWin Paper Desk demo-readiness loop.\n\n` +
    `Read the backlog at ${BACKLOG}. Find the FIRST task line that is still unchecked ("- [ ]").\n` +
    `Also skim recent git history (\`git -C ${REPO} log --oneline -15\`) so you do not re-pick finished work.\n\n` +
    `Return the single next task to do. If every task is checked ("- [x]"), set hasTask=false, taskId="NONE", scope="none".\n\n` +
    `${SANDBOX_NOTE}`,
  { label: 'assess-backlog', phase: 'Assess', schema: ASSESS_SCHEMA },
)

if (!task || !task.hasTask || task.taskId === 'NONE') {
  log('Backlog exhausted — no unchecked tasks. Paper Desk demo backlog is complete.')
  return { done: true, reason: 'backlog-exhausted' }
}

log(`Next task: ${task.taskId} — ${task.title} (${task.scope})`)

// ---- Phase 2: Implement ----------------------------------------------------
phase('Implement')
const impl = await agent(
  `You are an implementation engineer on the StockWinWin Paper Desk (branch ${BRANCH}).\n\n` +
    `TASK ${task.taskId}: ${task.title}\n` +
    `Scope: ${task.scope}\n` +
    `Acceptance criteria: ${task.acceptance}\n` +
    (task.files && task.files.length ? `Likely files: ${task.files.join(', ')}\n` : '') +
    `\nGround yourself first: read docs/PAPER_DESK_V1_CONTRACT.md and docs/AGENT_WORKFLOW.md, ` +
    `and the relevant existing code under ai-service/ (services/paper_desk_*.py, routers/paper_desk.py) ` +
    `and trading-ui/app/paper/ + trading-ui/app/api/paper-desk/.\n\n` +
    `Implement the task fully and to a high, real-product quality bar. For any BACKEND behavior change, ` +
    `write or update tests FIRST, then make them pass. Use the existing design system for UI work.\n\n` +
    `Constraints:\n- ${SAFETY}\n\n${SANDBOX_NOTE}\n\n` +
    `Do NOT commit or push — just edit the working tree. Return a concise summary of what you changed and the list of files touched.`,
  { label: `impl-${task.taskId}`, phase: 'Implement', model: 'opus' },
)

// ---- Phase 3: Validate -----------------------------------------------------
phase('Validate')
const validation = await agent(
  `You are the validator for the StockWinWin Paper Desk. Run the validation gates for the change just made ` +
    `(task ${task.taskId}: ${task.title}). Work in ${REPO} on branch ${BRANCH}.\n\n` +
    `Run, in order, and capture results:\n` +
    `1. Backend focused tests:\n` +
    `   cd ${REPO}/ai-service && uv run --with pytest --with pytest-cov --with pydantic --with python-dotenv --with fastapi --with httpx pytest tests/unit/test_paper_desk.py tests/test_prediction_engine.py\n` +
    `2. Frontend lint + build (with the demo flags):\n` +
    `   cd ${REPO}/trading-ui && NEXT_PUBLIC_ENABLE_PAPER_DESK=true PAPER_DESK_API_MODE=mock npm run lint\n` +
    `   cd ${REPO}/trading-ui && NEXT_PUBLIC_ENABLE_PAPER_DESK=true PAPER_DESK_API_MODE=mock npm run build\n` +
    `3. Secret scan (must find nothing but the regex literal itself):\n` +
    `   cd ${REPO} && rg -n 'sk_live_|sk_test_|whsec_[A-Za-z0-9]{4,}|gho_[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|hf_[A-Za-z0-9]{20,}|https://[^[:space:]]+:[^[:space:]@]+@|service_role[^[:space:]]{20,}|eyJ[A-Za-z0-9_-]{20,}' . || true\n\n` +
    `You MAY skip the full Playwright e2e suite (npm run test) to keep the loop bounded — note that you skipped it.\n` +
    `If a gate fails and the fix is small and clearly within task ${task.taskId}'s scope, fix it and re-run. ` +
    `Set passed=true ONLY if backend tests pass, lint+build succeed, and the secret scan is clean.\n\n` +
    `${SANDBOX_NOTE}`,
  { label: `validate-${task.taskId}`, phase: 'Validate', schema: VALIDATE_SCHEMA },
)

if (!validation || !validation.passed) {
  log(`Validation FAILED for ${task.taskId}: ${validation ? validation.failures || validation.summary : 'no result'}. Leaving working tree uncommitted for review.`)
  return {
    done: false,
    task: task.taskId,
    committed: false,
    reason: 'validation-failed',
    validation,
    implementation: impl,
  }
}

// ---- Phase 4: Commit (local only) -----------------------------------------
phase('Commit')
const commit = await agent(
  `Validation passed for task ${task.taskId} (${task.title}). Finalize it in ${REPO} on branch ${BRANCH}.\n\n` +
    `Steps:\n` +
    `1. In ${BACKLOG}: change this task's "- [ ]" to "- [x]" and append one line under "## Progress log": ` +
    `\`- <today> ${task.taskId} <will-be-sha> ${task.title}\` (use a short placeholder for sha; it is fine).\n` +
    `2. Stage all Paper Desk changes: \`git -C ${REPO} add -A\`.\n` +
    `3. Verify branch is ${BRANCH} (\`git -C ${REPO} rev-parse --abbrev-ref HEAD\`).\n` +
    `4. Commit locally with a clear conventional message describing task ${task.taskId}. NO secrets in the message.\n` +
    `5. ABSOLUTELY DO NOT PUSH. Do not run git push under any circumstance.\n` +
    `6. Return the commit sha and message.\n\n` +
    `${SANDBOX_NOTE}`,
  { label: `commit-${task.taskId}`, phase: 'Commit', schema: COMMIT_SCHEMA },
)

log(`Committed ${task.taskId} locally: ${commit && commit.sha ? commit.sha : '(see summary)'} — not pushed.`)
return {
  done: false,
  task: task.taskId,
  committed: !!(commit && commit.committed),
  commit,
  validation,
  implementation: impl,
}
