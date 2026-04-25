import { ImageResponse } from "next/og";
import { providerRepository } from "@/lib/firebase/provider-repository";

export const runtime = "nodejs";
export const alt = "청명 프로필 · 청광";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Params = { providerId: string };

export default async function OgImage(props: {
  params: Promise<Params>;
}) {
  const { providerId } = await props.params;
  const provider = await providerRepository.get(providerId);

  const name = provider?.companyName ?? "청명 프로필";
  const region = provider?.regions?.[0]
    ? `${provider.regions[0].city} ${provider.regions[0].district}`
    : "전국";
  const ratingPrefix =
    provider?.rating !== null && provider?.rating !== undefined
      ? `★ ${provider.rating} · `
      : "";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          backgroundColor: "#ffffff",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: 64,
        }}
      >
        <div
          style={{
            fontSize: 84,
            fontWeight: 800,
            color: "#111",
            lineHeight: 1.2,
          }}
        >
          {name}
        </div>
        <div
          style={{
            marginTop: 20,
            fontSize: 36,
            color: "#666",
          }}
        >
          {ratingPrefix}
          {region}
        </div>
        <div
          style={{
            marginTop: 48,
            fontSize: 28,
            fontWeight: 600,
            color: "#4f46e5",
          }}
        >
          청광 마켓플레이스
        </div>
      </div>
    ),
    { ...size },
  );
}
