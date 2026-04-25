/**
 * v1.7 partner-promo — 운영진 파트너 발급 CLI.
 *
 * 사용법:
 *   pnpm tsx scripts/issue-partner.ts \
 *     --uid=<firebase-auth-uid> \
 *     --businessName=<매장명> \
 *     [--region=<지역 라벨>] \
 *     [--category=<quote-category>] \
 *     [--logoUrl=<https://...>] \
 *     [--notes=<메모>] \
 *     [--by=<운영진 이름>] \
 *     [--dry-run]
 *
 *   pnpm tsx scripts/issue-partner.ts --suspend=<partnerId>
 *   pnpm tsx scripts/issue-partner.ts --activate=<partnerId>
 *
 * 환경:
 *   FIREBASE_ADMIN_SA_BASE64 또는 GOOGLE_APPLICATION_CREDENTIALS 필요.
 *   OPERATOR_NAME (없으면 --by 인자 또는 'operator' 디폴트).
 */

import { nanoid } from "nanoid";
import { adminAuth } from "../src/lib/firebase/admin";
import { partnerRepository } from "../src/lib/firebase/partner-repository";
import type { QuoteCategory } from "../src/domain/quote-category";

interface Args {
  uid?: string;
  businessName?: string;
  region?: string;
  category?: QuoteCategory;
  logoUrl?: string;
  notes?: string;
  by?: string;
  dryRun: boolean;
  suspend?: string;
  activate?: string;
}

function parseArgs(argv: string[]): Args {
  const out: Args = { dryRun: false };
  for (const a of argv) {
    if (a === "--dry-run") {
      out.dryRun = true;
      continue;
    }
    const m = /^--([a-zA-Z]+)=(.*)$/.exec(a);
    if (!m) continue;
    const [, k, v] = m;
    switch (k) {
      case "uid":
        out.uid = v;
        break;
      case "businessName":
        out.businessName = v;
        break;
      case "region":
        out.region = v;
        break;
      case "category":
        out.category = v as QuoteCategory;
        break;
      case "logoUrl":
        out.logoUrl = v;
        break;
      case "notes":
        out.notes = v;
        break;
      case "by":
        out.by = v;
        break;
      case "suspend":
        out.suspend = v;
        break;
      case "activate":
        out.activate = v;
        break;
    }
  }
  return out;
}

async function issue(args: Args): Promise<void> {
  if (!args.uid) throw new Error("--uid required");
  if (!args.businessName) throw new Error("--businessName required");

  // Firebase Auth uid 존재 확인
  let userExists = false;
  try {
    await adminAuth.getUser(args.uid);
    userExists = true;
  } catch {
    userExists = false;
  }
  if (!userExists) {
    throw new Error(
      `Firebase Auth에 uid=${args.uid} 사용자가 없습니다. 먼저 가입을 완료해 주세요.`,
    );
  }

  const existing = await partnerRepository.getByOwnerUid(args.uid);
  if (existing) {
    throw new Error(
      `이미 partner가 발급됨: id=${existing.id}, status=${existing.status}, businessName=${existing.businessName}`,
    );
  }

  const partnerId = nanoid(12);
  const issuedBy =
    args.by ?? process.env.OPERATOR_NAME ?? "operator";

  const summary = {
    partnerId,
    ownerUid: args.uid,
    businessName: args.businessName,
    regionLabel: args.region ?? null,
    category: args.category ?? null,
    logoUrl: args.logoUrl ?? null,
    issuedBy,
    notes: args.notes ?? null,
  };

  if (args.dryRun) {
    console.log("[dry-run] 발급될 partner 문서:");
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  await partnerRepository.create({
    id: partnerId,
    ownerUid: args.uid,
    businessName: args.businessName,
    logoUrl: args.logoUrl ?? null,
    category: args.category ?? null,
    regionLabel: args.region ?? null,
    status: "active",
    issuedBy,
    notes: args.notes ?? null,
  });

  await partnerRepository.appendEvent(partnerId, {
    type: "status-changed",
    from: "invited",
    to: "active",
    by: issuedBy,
    decidedAt: new Date(),
  });

  console.log(`✓ partner 발급 완료`);
  console.log(JSON.stringify(summary, null, 2));
}

async function changeStatus(
  partnerId: string,
  next: "active" | "suspended",
  by: string,
): Promise<void> {
  const p = await partnerRepository.getById(partnerId);
  if (!p) throw new Error(`partner 없음: ${partnerId}`);
  if (p.status === next) {
    console.log(`이미 ${next} 상태: ${partnerId}`);
    return;
  }
  await partnerRepository.setStatus(partnerId, next);
  await partnerRepository.appendEvent(partnerId, {
    type: "status-changed",
    from: p.status,
    to: next,
    by,
    decidedAt: new Date(),
  });
  console.log(
    `✓ ${partnerId} status: ${p.status} → ${next} (by ${by})`,
  );
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const issuedBy =
    args.by ?? process.env.OPERATOR_NAME ?? "operator";
  if (args.suspend) {
    await changeStatus(args.suspend, "suspended", issuedBy);
    return;
  }
  if (args.activate) {
    await changeStatus(args.activate, "active", issuedBy);
    return;
  }
  await issue(args);
}

main().catch((e) => {
  console.error("[issue-partner] 실패:", e instanceof Error ? e.message : e);
  process.exit(1);
});
