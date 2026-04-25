import { Suspense } from "react";
import { PromoSettingsForm } from "./PromoSettingsForm";
import { CreatePromoPostButton } from "./CreatePromoPostButton";
import { MyPromoPostsList } from "./MyPromoPostsList";
import type { Provider } from "@/types/provider";

interface Props {
  provider: Provider;
}

export function PromoTab({ provider }: Props) {
  return (
    <div className="space-y-4">
      <PromoSettingsForm provider={provider} />
      <CreatePromoPostButton provider={provider} />
      <Suspense fallback={null}>
        <MyPromoPostsList providerId={provider.id} />
      </Suspense>
    </div>
  );
}
