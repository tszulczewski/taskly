# Typecheck needs `next typegen`
- Next generates global types (`LayoutProps`, `PageProps`) into `.next/types`. `tsc --noEmit` on a clean tree fails without them.
- Fix: `packages/app` typecheck script runs `next typegen && tsc --noEmit`.
