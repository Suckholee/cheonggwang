import { Suspense } from "react";
import { connection } from "next/server";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { providerRepository } from "@/lib/firebase/provider-repository";
import ProvidersList from "@/components/admin/ProvidersList";

export const metadata = {
  title: "Providers · 청광 운영",
  robots: { index: false, follow: false },
};

export default function AdminProvidersPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">청명 (Providers)</h1>
      <Suspense fallback={<ListSkeleton />}>
        <Body />
      </Suspense>
    </div>
  );
}

async function Body() {
  await connection();
  await requireAdminPage("/admin/providers");
  const providers = await providerRepository.listAll(200);
  return <ProvidersList providers={providers} />;
}

function ListSkeleton() {
  return <div className="h-64 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />;
}
