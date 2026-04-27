/**
 * Cloud Functions root entry — re-exports all module entry points.
 *
 * - cycle #20 quote-trend-keywords: research scheduled functions (배포 보류 — NAVER/RESEND secret 미등록)
 * - cycle #26 partner-auto-series: autoSeriesTick scheduled function
 *
 * research 모듈은 secret 등록 후 별도 deploy. 현재는 auto-series만 active.
 */

// export * from "./research"; // cycle #20 — secret 등록 후 활성화
export * from "./auto-series";
