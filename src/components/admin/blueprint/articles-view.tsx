import Image from "next/image";
import Link from "next/link";
import { ImageOff, Plus, SquarePen } from "lucide-react";
import { AdminEmptyState, AdminPageHeader, AdminPrimaryLink } from "@/components/admin-ui";
import { AdminListFilters } from "@/components/admin-list-filters";
import { AdminPagination } from "@/components/admin-pagination";
import { AdminBulkCheckbox, AdminBulkEditor, AdminBulkTr } from "@/components/admin-bulk-editor";
import { AdminColumn, AdminColumnSettingsButton, AdminColumnVisibility } from "@/components/admin-column-visibility";
import { AdminColumnFilter } from "@/components/admin-column-filter";
import { AdminGenericBulkEditButton } from "@/components/admin-generic-bulk-edit";
import { articleStatusLabels, articleStatusTones } from "@/modules/admin/labels";
import { formatDate } from "@/lib/format";
import { ArticleDeleteButton } from "./article-delete-button";
import { BpTable, BpTd, BpTh } from "./ui/table";
import { BpTag } from "./ui/tag";

type ArticleRow = {
  id: string;
  title: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  publishedAt: string | null;
  createdAt: string;
  coverMedia: { url: string; alt: string | null } | null;
  category: { name: string };
};

type Props = {
  articles: ArticleRow[];
  categories: Array<{ id: string; name: string }>;
  counts: { total: number; published: number; drafts: number };
  filters: { query: string; status: string; category: string };
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number; skip: number };
  initialHiddenColumns: string[];
};

const ARTICLES_TABLE_ID = "articles";

const articleColumns = [
  { id: "article", label: "مقاله" },
  { id: "category", label: "دسته" },
  { id: "status", label: "وضعیت" },
  { id: "publishedAt", label: "تاریخ انتشار" },
];

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`bp-frame relative ${className}`}>{children}</section>;
}

function Cover({ article }: { article: ArticleRow }) {
  return (
    <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-md border border-[var(--bp-divider)] bg-[var(--bp-bg)] text-[var(--bp-muted)]">
      {article.coverMedia ? <Image src={article.coverMedia.url} alt={article.coverMedia.alt ?? article.title} fill sizes="40px" className="object-cover" /> : <ImageOff size={15} />}
    </span>
  );
}

function RowActions({ article }: { article: ArticleRow }) {
  return (
    <div className="flex items-center justify-center gap-1">
      <Link href={`/admin/articles/${article.id}/edit`} className="bp-btn bp-btn-ghost bp-btn-icon bp-btn-sm" aria-label={`ویرایش ${article.title}`} title="ویرایش مقاله">
        <SquarePen size={15} strokeWidth={1.5} />
      </Link>
      <ArticleDeleteButton id={article.id} title={article.title} />
    </div>
  );
}

const dateLabel = (article: ArticleRow) => (article.publishedAt ? formatDate(article.publishedAt) : "—");

export function BlueprintArticlesView({ articles, categories, counts, filters, pagination, initialHiddenColumns }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <AdminPageHeader
        flush
        title="مقالات"
        description={`${counts.total.toLocaleString("fa-IR")} مقاله · ${counts.published.toLocaleString("fa-IR")} منتشرشده · ${counts.drafts.toLocaleString("fa-IR")} پیش‌نویس`}
        action={<AdminPrimaryLink href="/admin/articles/new"><Plus size={16} />مقالهٔ جدید</AdminPrimaryLink>}
      />

      <Panel className="p-4">
        <AdminListFilters
          path="/admin/articles"
          query={filters.query}
          queryLabel="جستجوی مقاله"
          queryPlaceholder="عنوان یا نشانی مقاله"
          filters={[]}
        />
      </Panel>

      <Panel>
        {articles.length ? (
          <>
            <div className="md:hidden">
              {articles.map((article) => (
                <article key={article.id} className="flex flex-col gap-3 border-b border-[var(--bp-row-line)] p-4 last:border-b-0">
                  <div className="flex items-start gap-3">
                    <Cover article={article} />
                    <div className="min-w-0 flex-1">
                      <strong className="block truncate text-[13px]">{article.title}</strong>
                      <span dir="ltr" className="bp-muted mt-0.5 block truncate text-right font-mono text-[11px]">{article.slug}</span>
                    </div>
                    <BpTag tone={articleStatusTones[article.status]} size="md" withDot>{articleStatusLabels[article.status]}</BpTag>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-[12px]">
                    <span className="bp-muted">{article.category.name}</span>
                    <span className="bp-muted">{dateLabel(article)}</span>
                  </div>
                  <RowActions article={article} />
                </article>
              ))}
            </div>

            <AdminColumnVisibility tableId={ARTICLES_TABLE_ID} columns={articleColumns} initialHidden={initialHiddenColumns}>
              <AdminBulkEditor
                entity="articles"
                entityLabel="مقاله"
                ids={articles.map((article) => article.id)}
                actions={[]}
                beforeSelectAll={<AdminColumnSettingsButton />}
                extraAction={<AdminGenericBulkEditButton entity="articles" entityLabel="مقاله" changeTypes={[
                  { value: "status", label: "تغییر وضعیت انتشار", options: [{ value: "status:PUBLISHED", label: "انتشار" }, { value: "status:DRAFT", label: "بازگردانی به پیش‌نویس" }, { value: "status:ARCHIVED", label: "بایگانی" }] },
                  { value: "delete", label: "حذف مقالات", confirmation: { title: "حذف گروهی مقالات", description: "مقالات انتخاب‌شده برای همیشه حذف می‌شوند.", confirmLabel: "حذف مقالات" } },
                ]} />}
              >
                <BpTable ariaLabel="فهرست مقالات" minWidth={720}>
                  <thead>
                    <tr>
                      <BpTh className="w-10 text-center"><span className="sr-only">انتخاب</span></BpTh>
                      <BpTh className="w-10">#</BpTh>
                      <AdminColumn id="article"><BpTh>مقاله</BpTh></AdminColumn>
                      <AdminColumn id="category"><BpTh><span className="inline-flex items-center">دسته<AdminColumnFilter path="/admin/articles" ariaLabel="فیلتر دسته" groups={[{ name: "category", label: "دسته", value: filters.category, options: [{ value: "", label: "همه دسته‌ها" }, ...categories.map((category) => ({ value: category.id, label: category.name }))] }]} /></span></BpTh></AdminColumn>
                      <AdminColumn id="status"><BpTh><span className="inline-flex items-center">وضعیت<AdminColumnFilter path="/admin/articles" ariaLabel="فیلتر وضعیت" groups={[{ name: "status", label: "وضعیت", value: filters.status, options: [{ value: "", label: "همه وضعیت‌ها" }, ...Object.entries(articleStatusLabels).map(([value, label]) => ({ value, label }))] }]} /></span></BpTh></AdminColumn>
                      <AdminColumn id="publishedAt"><BpTh>تاریخ انتشار</BpTh></AdminColumn>
                      <BpTh className="text-center">عملیات</BpTh>
                    </tr>
                  </thead>
                  <tbody>
                    {articles.map((article, index) => (
                      <AdminBulkTr key={article.id} id={article.id}>
                        <BpTd className="w-10 text-center"><AdminBulkCheckbox id={article.id} label={`انتخاب مقاله ${article.title}`} /></BpTd>
                        <BpTd className="bp-muted w-10">{(pagination.skip + index + 1).toLocaleString("fa-IR")}</BpTd>
                        <AdminColumn id="article">
                          <BpTd className="max-w-[280px]">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <Cover article={article} />
                              <div className="min-w-0">
                                <strong className="block truncate text-[13px]">{article.title}</strong>
                                <span dir="ltr" className="bp-muted block truncate text-right font-mono text-[11px]">{article.slug}</span>
                              </div>
                            </div>
                          </BpTd>
                        </AdminColumn>
                        <AdminColumn id="category"><BpTd className="bp-muted max-w-[160px] truncate">{article.category.name}</BpTd></AdminColumn>
                        <AdminColumn id="status"><BpTd><BpTag tone={articleStatusTones[article.status]} size="md" withDot>{articleStatusLabels[article.status]}</BpTag></BpTd></AdminColumn>
                        <AdminColumn id="publishedAt"><BpTd className="bp-muted">{dateLabel(article)}</BpTd></AdminColumn>
                        <BpTd><RowActions article={article} /></BpTd>
                      </AdminBulkTr>
                    ))}
                  </tbody>
                </BpTable>
              </AdminBulkEditor>
            </AdminColumnVisibility>
            <AdminPagination page={pagination.page} pageSize={pagination.pageSize} totalItems={pagination.totalItems} totalPages={pagination.totalPages} />
          </>
        ) : (
          <AdminEmptyState title="مقاله‌ای پیدا نشد" description="فیلترها را تغییر دهید یا اولین مقاله را بنویسید." />
        )}
      </Panel>
    </div>
  );
}
