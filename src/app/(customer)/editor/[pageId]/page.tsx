import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import {
  SESSION_COOKIE_NAME,
  verifySessionCookie,
} from "@/lib/firebase/auth-admin";
import { pageService } from "@/services/page-service";
import { userRepository } from "@/lib/firebase/user-repository";
import { AppError } from "@/lib/errors";
import { EditorShell } from "@/components/editor/EditorShell";

export const metadata = {
  title: "페이지 편집 · 청광",
};

export default async function EditorPage(props: {
  params: Promise<{ pageId: string }>;
}) {
  const { pageId } = await props.params;

  const jar = await cookies();
  const uid = await verifySessionCookie(jar.get(SESSION_COOKIE_NAME)?.value);

  let page;
  try {
    page = await pageService.getForOwner(pageId, uid);
  } catch (e) {
    if (e instanceof AppError && e.code === "PAGE_NOT_FOUND") notFound();
    throw e;
  }

  const partner = await userRepository.getPartnerFlag(uid);

  return (
    <EditorShell
      initialPage={page}
      isPartner={partner.isCheonggwangPartner}
    />
  );
}
