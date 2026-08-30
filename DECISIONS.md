# Decisions

## 2026-08-29 — Paused. The premise does not hold.

Workhub assumes the tools it aggregates **announce their own state**. Most of
them do not. That is a property of the tools, not of this codebase, and no
amount of work here changes it.

What each tool can actually report:

| Tool | Can it report? | What you would actually get |
|---|---|---|
| Claude Code | **Yes** | `Stop` and `Notification` hooks are real events. Accurate, but coarse: the project name can only be inferred from the working directory, and the content is whatever is in the hook payload. |
| Codex | **Yes**, with risk | `notify` fires on `turn-ended` with the last message. But `notify` is a **single slot** and it is already taken by the Computer Use client, whose path contains spaces. Adding Workhub means replacing that line with a wrapper, and a quoting mistake breaks Computer Use silently. |
| Cursor | **No** | VS Code based, with no "the AI finished" event exposed. The only options are watching file changes (a proxy, not the truth) or manual triggering. |
| Figma | **Not the thing we want** | Webhooks report *file* events (comment, library publish), not "an agent is doing part of your task". Also needs a public endpoint; localhost cannot receive them. |

So the original picture — four tools working in parallel on one job, each
reporting its progress — **is not achievable**, because at least one of the four
cannot report at all, and a second reports something other than what we want.

### What was built anyway

Everything downstream of the event: the HUD, the Dynamic-Island morph, native
frosted glass, the light/dark system, the Ask model, the queue, the sediment
rules, the motion system. It works. It has 14 tests. It has simply never had a
real event in it: every item ever displayed came from a `curl` typed during
development.

### The mistake worth remembering

Presentation was built for eight rounds before anyone checked whether the data
source existed. `adapters/` was never created. The order was backwards: the
integration is the risky part and should have been proven first, with the
ugliest possible UI.

### If this is ever picked up again

Start by wiring **one** adapter and looking at the real output before touching
anything visual:

1. Claude Code `Stop` + `Notification` hooks in `~/.claude/settings.json`.
   Zero risk: those two events are unused (only `UserPromptSubmit` is set).
2. Judge from that whether the coarseness is acceptable.
3. Only then decide about Codex, and only with a tested wrapper script.

An alternative premise that would work: stop trying to *sense* state, and let
the user record a handoff by hand ("I gave this to Cursor"), with Workhub only
remembering and closing the loop. That needs no tool cooperation at all.
