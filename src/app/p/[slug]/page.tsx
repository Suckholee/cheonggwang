import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicPageView } from "@/services/page-service";
import { PromoPage } from "@/components/promo/PromoPage";

type PageParams = { slug: string };

export async function generateMetadata(props: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const view = await getPublicPageView(slug);
  if (!view) {
    return { title: "페이지를 찾을 수 없어요 · 청광" };
  }
  const { page } = view;
  const title = page.sections.hero.title || page.businessName;
  const description =
    page.sections.intro.body?.slice(0, 160) || page.businessName;
  const coverUrl = page.photos[0]?.url;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images:
        coverUrl && !coverUrl.startsWith("about:")
          ? [{ url: coverUrl }]
          : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function PublicPromoPage(props: {
  params: Promise<PageParams>;
}) {
  return (
    <Suspense fallback={<PromoSkeleton />}>
      <PromoContent params={props.params} />
    </Suspense>
  );
}

async function PromoContent({ params }: { params: Promise<PageParams> }) {
  const { slug } = await params;
  const view = await getPublicPageView(slug);
  if (!view) notFound();
  return <PromoPage page={view.page} partner={view.partner} />;
}

function PromoSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-900">
      <div className="h-[60vh] animate-pulse bg-zinc-800" />
      <div className="mx-auto max-w-3xl p-6">
        <div className="h-6 w-2/3 animate-pulse rounded bg-zinc-700" />
        <div className="mt-4 h-4 w-1/2 animate-pulse rounded bg-zinc-700" />
      </div>
    </div>
  );
}
