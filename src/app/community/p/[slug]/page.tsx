import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { postRepository } from "@/lib/firebase/post-repository";
import { providerRepository } from "@/lib/firebase/provider-repository";
import { PostDetailView } from "@/components/community/PostDetailView";
import { PostProviderInfoCard } from "@/components/community/PostProviderInfoCard";
import { QuoteCTAButton } from "@/components/community/QuoteCTAButton";
import { buildArticleGraphJsonLd } from "@/lib/seo/article-jsonld";
import { getBaseUrl } from "@/lib/seo/base-url";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import {
  postTypeToPanelSlug,
  panelLabelForPost,
} from "@/lib/feed/post-panel";
import {
  SESSION_COOKIE_NAME,
  tryVerifySessionCookie,
} from "@/lib/firebase/auth-admin";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminToken,
} from "@/lib/auth/admin-session";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * v1.6 Phase 5 — 정적 기본 메타데이터.
 * 동적 title/description/og는 PostBody 내부에서 React 19 metadata hoisting 으로 주입.
 * (Next 16 cacheComponents 는 uncached 데이터의 generateMetadata 사용을 막음)
 */
export const metadata: Metadata = {
  title: "포스트 · 청광",
};

export default function PostBySlugPage(props: PageProps) {
  return (
    <div className="min-h-screen w-full bg-[linear-gradient(180deg,#f4f9ff_0%,#ffffff_18%,#ffffff_100%)] px-5 pt-3 pb-28 dark:bg-none">
      <Suspense fallback={<PostSkeleton />}>
        <PostBody params={props.params} />
      </Suspense>
    </div>
  );
}

function PostSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="aspect-[16/10] w-full rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
      <div className="h-8 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-4 w-full rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-4 w-5/6 rounded bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}

/**
 * Next 16 Turbopack이 한국어 동적 세그먼트를 URL-encoded(`%EC%9A%A9...`) 로 전달하는 것을 확인.
 * Firestore slug는 디코드된 상태로 저장되므로 반드시 `decodeURIComponent` 필요.
 */
function decodeSlug(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

async function PostBody({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const slug = decodeSlug(rawSlug);
  const post = await postRepository.findBySlug(slug);
  if (!post) notFound();

  // v1.7 Design §3.3 — publishStatus !== 'published' 시 본인만 접근 (preview 모드).
  // admin도 운영 검토를 위해 preview 허용.
  // 그 외 (비로그인·다른 파트너·일반 사용자)는 404로 떨어뜨려 비공개 글의 존재 자체를 숨김.
  let isPreview = false;
  if (post.publishStatus !== "published") {
    const jar = await cookies();
    const viewerUid = await tryVerifySessionCookie(
      jar.get(SESSION_COOKIE_NAME)?.value,
    );
    const isAdmin = await verifyAdminToken(
      jar.get(ADMIN_SESSION_COOKIE)?.value,
    );
    if ((!viewerUid || viewerUid !== post.providerOwnerUid) && !isAdmin) {
      notFound();
    }
    isPreview = true;
  }

  // C3: provider/tip 포스트는 기존 info card + CTA 보존.
  const showProviderBlock =
    (post.postType === "provider" || post.postType === "tip") &&
    post.providerId &&
    post.providerId !== "customer";
  const provider = showProviderBlock
    ? await providerRepository.get(post.providerId)
    : null;

  const panelSlug = postTypeToPanelSlug(post.postType);
  const panelLabel = panelLabelForPost(post);
  const jsonLd = await buildArticleGraphJsonLd(post, {
    breadcrumb: { panelLabel, panelSlug },
  });
  // v1.17 cycle #30 §3.12 — photoless tip의 og:image fallback (logo).
  const ogImageFallback = `${await getBaseUrl()}/logo.png`;

  return (
    <div className="space-y-6">
      {/* React 19 metadata hoisting: <head>로 자동 이동 */}
      <title>{`${post.title} · 청광`}</title>
      <meta name="description" content={post.summary80} />
      <link rel="canonical" href={`/community/p/${post.slug}`} />
      <meta property="og:title" content={post.title} />
      <meta property="og:description" content={post.summary80} />
      <meta property="og:type" content="article" />
      {/* v1.7: 비공개 글의 미리보기는 검색엔진 인덱싱 차단. */}
      {isPreview && <meta name="robots" content="noindex, nofollow" />}
      {post.coverImageUrl ? (
        <meta property="og:image" content={post.coverImageUrl} />
      ) : (
        <meta property="og:image" content={ogImageFallback} />
      )}
      <JsonLdScript data={jsonLd} />
      {/* Sticky App Header */}
      <header className="sticky top-0 z-40 -mx-5 -mt-3 mb-5 border-b border-white/70 bg-[#f4f9ff]/90 px-5 py-3.5 backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/90">
        <div className="flex items-center justify-between">
          <Link
            href={`/community/${panelSlug}`}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/80 border border-zinc-200 text-zinc-600 hover:text-zinc-900 shadow-sm transition-all hover:scale-105 active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
            aria-label="이전 화면으로 가기"
          >
            <ChevronLeft className="h-4.5 w-4.5" strokeWidth={2.5} />
          </Link>
          <h1 className="text-[17px] font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
            {panelLabel}
          </h1>
          <div className="w-8" />
        </div>
      </header>
      {isPreview && (
        <div
          role="status"
          className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
        >
          {post.publishStatus === "draft"
            ? "📝 초고 미리보기 — 발행 전에는 다른 사용자에게 보이지 않습니다."
            : "🚫 철회된 글 — 본인만 볼 수 있습니다. 다시 발행하면 공개됩니다."}
        </div>
      )}
      <PostDetailView post={post} />
      {provider && <PostProviderInfoCard provider={provider} />}
      {showProviderBlock && (
        <QuoteCTAButton
          providerId={post.providerId}
          category={post.categories[0] ?? "move-in"}
        />
      )}
    </div>
  );
}
