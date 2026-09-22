Built by CodePrata.

One Crunch Lady - a single-page cookie storefront for a Singapore home bakery, built with Next.js 14 (App Router). See [CLAUDE.md](CLAUDE.md) for architecture and conventions.

## Getting Started

Copy `.env.example` to `.env.local` and fill in the required values, then:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the result.

Before committing, stop the dev server and run the full local gate:

```bash
npm run verify   # lint + type-check + test + production build
```

> A running `npm run dev` makes `npm run build` fail with `EPERM` on `.next/trace` on Windows - stop the dev server first.

## Deployment

Hosted on Netlify. Netlify auto-detects Next.js and builds it with zero configuration - `netlify.toml` in this repo intentionally contains only a `[build] ignore` guard (see the comment in that file), not build settings.

**Production deploys cost Netlify build credits (15 per deploy, flat); everything else is free** - pushing branches, Deploy Previews, branch deploys, failed builds, and rollbacks all cost 0. So the workflow batches releases instead of deploying on every commit:

- `main` is the everyday integration branch. Push and merge to it freely - it never triggers a Netlify build.
- `production` is Netlify's production branch. A release is a deliberate fast-forward:

  ```bash
  git checkout main && git pull
  npm run verify
  git push origin main:production
  ```

- Deploy Previews (opened automatically on any pushed branch) are a full, free production-grade build - use one to verify a change before releasing, rather than releasing to check.
- Rollback is free: Netlify → Deploys → pick a previous production deploy → **Publish deploy**.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

If you use this code, attribution is required! Please link back to this repository.
