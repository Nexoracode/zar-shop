#!/bin/sh
# روی خود VPS، داخل پوشه پروژه اجرا شود تا آخرین تغییرات دیپلوی شوند.
set -e

git pull
docker compose build app
docker compose up -d
docker compose logs -f app --tail=50
