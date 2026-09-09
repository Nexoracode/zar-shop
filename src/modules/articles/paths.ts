import { env } from "@/lib/env";

export const ARTICLE_BASE_PATH = "/blog";

export function articlePath(slug: string) {
  return `${ARTICLE_BASE_PATH}/${slug}`;
}
export function articleCategoryPath(slug: string) {
  return `${ARTICLE_BASE_PATH}/category/${slug}`;
}
export function articleUrl(slug: string) {
  return `${env.APP_URL.replace(/\/$/, "")}${articlePath(slug)}`;
}
