#!/bin/bash
# Build statique « mode démo » de Famille.Mbeutetsa pour Cloudflare Pages
# - Les API routes Next.js (Node/Prisma) ne sont pas exportables : elles sont
#   temporairement déplacées, remplacées côté client par src/lib/demo-api.ts.
# - Le .next du serveur de dev n'est pas touché (distDir séparé : .next-demo).
set -e
cd /home/z/my-project

if [ -d /home/z/.fc-api-stash ]; then
  echo "⚠️  Stash précédent trouvé — restauration d'abord"
  rm -rf src/app/api
  mv /home/z/.fc-api-stash src/app/api
fi

echo "→ 1/3 Stash des API routes (non exportables en statique)…"
mv src/app/api /home/z/.fc-api-stash

echo "→ 2/3 Build statique (DEMO_BUILD=1, NEXT_PUBLIC_DEMO_MODE=1)…"
DEMO_BUILD=1 NEXT_PUBLIC_DEMO_MODE=1 bunx next build

echo "→ 3/3 Restauration des API routes…"
mv /home/z/.fc-api-stash src/app/api

echo "✅ Export statique prêt : /home/z/my-project/.next-demo"
ls .next-demo | head -20
