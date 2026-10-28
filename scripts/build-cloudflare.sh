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

echo "→ 1/4 Stash des API routes (non exportables en statique)…"
mv src/app/api /home/z/.fc-api-stash

echo "→ 2/4 Build statique (DEMO_BUILD=1, NEXT_PUBLIC_DEMO_MODE=1)…"
# NEXT_PUBLIC_FC_PUSH_URL : moteur push historique (plus appelé par le téléphone :
# la passerelle same-origin _worker.js relaye vers lui depuis le réseau Cloudflare)
DEMO_BUILD=1 NEXT_PUBLIC_DEMO_MODE=1 NEXT_PUBLIC_FC_PUSH_URL="https://fc-push.famille-mbeutetsa.workers.dev" bunx next build

echo "→ 3/4 Restauration des API routes…"
mv /home/z/.fc-api-stash src/app/api

echo "→ 4/4 Génération du _worker.js (passerelle push same-origin)…"
bun scripts/build-pages-worker.ts

echo "✅ Export statique prêt : /home/z/my-project/.next-demo"
ls .next-demo | head -20
