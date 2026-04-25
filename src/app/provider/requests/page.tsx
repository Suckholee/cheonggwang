import { Suspense } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
  verifySessionCookie,
} from "@/lib/firebase/auth-admin";
import { userRepository } from "@/lib/firebase/user-repository";
import { providerRepository } from "@/lib/firebase/provider-repository";
import { quoteRequestRepository } from "@/lib/firebase/quote-request-repository";
import { providerResponseRepository } from "@/lib/firebase/provider-response-repository";
import { TriageClient } from "@/components/provider/TriageClient";

export const metadata = {
  title: "받은 요청 · 청광",
};

export default function ProviderRequestsPage() {
  return (
    <div className="mx-auto min-h-screen max-w-xl px-4 py-6">
      <Suspense fallback={<TriageSkeleton />}>
        <TriageBody />
      </Suspense>
    </div>
  );
}

function TriageSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-4 flex justify-between">
        <div className="h-6 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="h-96 w-full rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
    </div>
  );
}

async function TriageBody() {
  const jar = await cookies();
  let uid: string;
  try {
    uid = await verifySessionCookie(jar.get(SESSION_COOKIE_NAME)?.value);
  } catch {
    redirect(`/login?next=${encodeURIComponent("/provider/requests")}`);
  }

  const user = await userRepository.get(uid);
  const providerId = (user as { providerId?: string } | null)?.providerId;
  if (!providerId) {
    redirect("/signup-provider");
  }

  const provider = await providerRepository.get(providerId);
  if (!provider) {
    redirect("/signup-provider");
  }

  const excludeRequestIds =
    await providerResponseRepository.listRespondedRequestIds(providerId);

  const requests = await quoteRequestRepository.listForTriage({
    providerCategories: provider.categories,
    excludeRequestIds,
    limit: 50,
  });

  return <TriageClient initialRequests={requests} provider={provider} />;
}
