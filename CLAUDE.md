# shyam.dev — working rules

Personal portfolio of Shyam Hinsu (Frontend Engineer, Vue.js). Vue 3 + Vite, no UI framework.

## Read first

- `.claude/docs/CONTENT.md` — every piece of site copy and personal data, where it lives, what is real and what is still a placeholder.
- `.claude/docs/IMPLEMENTATION.md` — architecture, the agent animation system, the multi-window globe, build and deploy.

## Rules

1. **Content changes must update the content doc.** Any change to a file under `src/content/`, to copy inside a component, to `index.html` metadata, or to images under `public/` must be reflected in `.claude/docs/CONTENT.md` in the same commit. Update the section that describes the changed content and the "Last updated" line at the top. No exceptions, including one-line copy edits.
2. **Implementation changes must update the implementation doc.** Any new module, removed module, changed data contract (`data-agent-*` attributes, `site.*` fields, content shapes) or changed behaviour of the agent/globe systems must be reflected in `.claude/docs/IMPLEMENTATION.md` in the same commit.
3. **Never invent personal facts.** Company names, dates, metrics, awards, contact details and links come only from the user. Placeholders stay visibly marked (`// TODO` in content files, the `placeholder` badge in the UI) until the user supplies real values.
4. **Verify before reporting.** Run `npm run build`; for behaviour changes, check in a headless browser (Playwright is available). Report what was checked.
5. **Keep the premium register.** One accent colour (`--accent`), tonal greys, hairlines, no new saturated colours, no new dependencies without a stated reason.

## Commands

```bash
npm run dev       # http://localhost:5173
npm run build     # dist/
npm run preview   # http://localhost:4173, add ?agents-debug to expose window.__agentController
```
