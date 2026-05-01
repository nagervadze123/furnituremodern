<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Auto-commit and push

This project is wired to Vercel via GitHub: every push to `origin/main` deploys. After every completed task, automatically run `git add -A && git commit -m "<concise message>" && git push origin main` without asking for permission.

- Commit messages are short, imperative, and describe the change.
- Skip autopush only when: the build or lint is failing, the change is mid-refactor and incomplete, secrets would leak, or the user is actively iterating on something that may revise the change. Surface the blocker instead of pushing.
- Never use `--force`, `--no-verify`, or amend pushed commits unless the user explicitly asks.
- `.env*` is gitignored; do not stage it.
