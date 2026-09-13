import "dotenv/config";
import { db } from "../src/lib/db";

// One-off data migration: create an `Author` row per distinct `Article.authorName`, then point
// each article's new `authorId` at it. Must run after the `article_authoring_and_engagement`
// migration (which added the nullable `authorId` column) and before the follow-up migration that
// makes `authorId` required and drops `authorName`. Idempotent — safe to re-run.
try {
  const articles = await db.article.findMany({ select: { id: true, authorName: true, authorId: true } });
  const distinctNames = Array.from(new Set(articles.map((article) => article.authorName)));

  let createdCount = 0;
  for (const name of distinctNames) {
    const existing = await db.author.findFirst({ where: { name } });
    const author = existing ?? (await db.author.create({ data: { name } }));
    if (!existing) createdCount += 1;

    await db.article.updateMany({ where: { authorName: name, authorId: null }, data: { authorId: author.id } });
  }

  const remaining = await db.article.count({ where: { authorId: null } });
  console.info(`[backfill-authors] ${distinctNames.length} distinct author name(s), ${createdCount} Author row(s) created, ${remaining} article(s) still without authorId.`);
} finally {
  await db.$disconnect();
}
