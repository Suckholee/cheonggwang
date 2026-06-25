"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitQuoteRequestReview } from "@/app/actions/quote-actions";
import type { QuoteRequest } from "@/types/quote-request";
import { QUOTE_STATUS_LABELS } from "@/domain/quote-status";
import { Calendar, User, Phone, Users, Clock, Image as ImageIcon, Star, Heart } from "lucide-react";
import { PhotoUpload } from "@/components/editor/PhotoUpload";
import type { Photo } from "@/types/page";

interface Props {
  request: QuoteRequest;
}

export function RequestWorkflowCard({ request }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>("");
  const [wouldReuse, setWouldReuse] = useState<string>("yes");
  const [error, setError] = useState<string | null>(null);

  const status = request.status;
  const isFinished = status === "completed" || status === "settled";

  // 1. 작업 배정 정보
  const worker = request.workerAssignment;

  // 2. 결제 정보
  const payment = request.bookingPayment;

  // 3. 작업 전/후 사진
  const beforePhotos = request.photosBefore ?? [];
  const afterPhotos = request.photosAfter ?? [];

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!comment.trim()) {
      setError("후기 내용을 작성해 주세요.");
      return;
    }

    startTransition(async () => {
      const res = await submitQuoteRequestReview(request.id, {
        rating,
        comment,
        wouldReuse,
      });
      if (res.ok) {
        router.refresh();
      } else {
        setError(res.message ?? "후기 등록 실패");
      }
    });
  };

  return (
    <div className="mx-4 mt-6 space-y-4">
      {/* 8단계 상태 표시 배너 */}
      <div className="rounded-2xl border border-blue-150 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 shadow-sm dark:border-blue-900/40 dark:from-zinc-900 dark:to-zinc-950">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Current Status
            </p>
            <h3 className="mt-0.5 text-base font-black text-zinc-900 dark:text-zinc-50">
              {QUOTE_STATUS_LABELS[status]}
            </h3>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-extrabold text-blue-700 dark:bg-blue-950/50 dark:text-blue-400">
            실시간 연동중
          </span>
        </div>

        {/* 8단계 Stepper */}
        <div className="mt-4 grid grid-cols-8 gap-0.5">
          {["접수", "견적", "상담", "예약", "배정", "진행", "완료", "정산"].map((step, idx) => {
            const currentIdx = {
              submitted: 0,
              estimating: 1,
              quoted: 1,
              consulted: 2,
              negotiating: 2,
              booked: 3,
              assigned: 4,
              working: 5,
              completed: 6,
              settled: 7,
              cancelled: -1,
            }[status] ?? 0;

            const isCurrent = idx === currentIdx;
            const isPassed = idx < currentIdx;

            return (
              <div key={idx} className="flex flex-col items-center gap-1.5 min-w-0">
                <div
                  className={`h-2.5 w-full rounded-full transition-colors ${
                    isCurrent
                      ? "bg-blue-600 dark:bg-blue-500 animate-pulse"
                      : isPassed
                      ? "bg-blue-400 dark:bg-blue-700"
                      : "bg-zinc-200 dark:bg-zinc-800"
                  }`}
                />
                <span
                  className={`text-[9px] font-extrabold truncate ${
                    isCurrent
                      ? "text-blue-600 dark:text-blue-400"
                      : isPassed
                      ? "text-zinc-700 dark:text-zinc-400"
                      : "text-zinc-400 dark:text-zinc-500"
                  }`}
                >
                  {step}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 예약 및 결제 정보 */}
      {payment && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-850 dark:bg-zinc-950">
          <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100 border-b pb-2 mb-3">예약 및 결제 현황</h4>
          <dl className="grid grid-cols-[100px_1fr] gap-y-2 text-xs">
            <dt className="text-zinc-450 font-bold">예약 번호</dt>
            <dd className="font-extrabold text-zinc-800 dark:text-zinc-200">{payment.bookingNumber}</dd>
            
            <dt className="text-zinc-450 font-bold">결제 수단</dt>
            <dd className="font-extrabold text-zinc-800 dark:text-zinc-200">{payment.paymentMethod}</dd>

            <dt className="text-zinc-450 font-bold">계약금 현황</dt>
            <dd className="font-extrabold text-zinc-800 dark:text-zinc-200">
              {payment.hasDeposit ? `${payment.depositAmount.toLocaleString()}원 (완납)` : "입금 대기"}
            </dd>

            <dt className="text-zinc-450 font-bold">현장 잔금</dt>
            <dd className="font-extrabold text-zinc-800 dark:text-zinc-200">{payment.balanceAmount.toLocaleString()}원</dd>
          </dl>
        </div>
      )}

      {/* 작업자 배정 정보 */}
      {worker && worker.assignedTeam && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-850 dark:bg-zinc-950">
          <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100 border-b pb-2 mb-3">배정된 작업팀 정보</h4>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-zinc-400" />
              <div>
                <p className="text-[10px] text-zinc-400">배정팀</p>
                <p className="font-bold text-zinc-800 dark:text-zinc-200">{worker.assignedTeam}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-zinc-400" />
              <div>
                <p className="text-[10px] text-zinc-400">팀장명</p>
                <p className="font-bold text-zinc-800 dark:text-zinc-200">{worker.teamLeaderName}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-zinc-400" />
              <div>
                <p className="text-[10px] text-zinc-400">연락처</p>
                <p className="font-bold text-zinc-800 dark:text-zinc-200">{worker.teamLeaderPhone}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-zinc-400" />
              <div>
                <p className="text-[10px] text-zinc-400">예상시간 / 인원</p>
                <p className="font-bold text-zinc-800 dark:text-zinc-200">
                  {worker.estimatedHours}시간 / {worker.workerCount}명
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 작업 전/후 사진 관리 */}
      {(beforePhotos.length > 0 || afterPhotos.length > 0) && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-850 dark:bg-zinc-950 space-y-4">
          <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100 border-b pb-2 mb-1 flex items-center gap-1.5">
            <ImageIcon className="h-4 w-4 text-zinc-400" />
            현장 작업 사진 관리
          </h4>
          
          {beforePhotos.length > 0 && (
            <div>
              <p className="text-[10px] font-extrabold text-zinc-500 mb-1.5">작업 전 사진 ({beforePhotos.length}장)</p>
              <div className="grid grid-cols-3 gap-2">
                {beforePhotos.map((p, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-zinc-100 border dark:bg-zinc-900">
                    <img src={p.url} alt={`작업 전 ${i+1}`} className="object-cover w-full h-full" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {afterPhotos.length > 0 && (
            <div>
              <p className="text-[10px] font-extrabold text-emerald-600 mb-1.5">작업 후 완료 사진 ({afterPhotos.length}장)</p>
              <div className="grid grid-cols-3 gap-2">
                {afterPhotos.map((p, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-zinc-100 border border-emerald-100 dark:bg-zinc-900">
                    <img src={p.url} alt={`작업 후 ${i+1}`} className="object-cover w-full h-full" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 고객평가 등록 / 완료 정보 */}
      {isFinished && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-850 dark:bg-zinc-950">
          <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100 border-b pb-2 mb-3 flex items-center gap-1.5">
            <Star className="h-4 w-4 text-amber-500" />
            고객 평가 및 서비스 만족도
          </h4>

          {request.customerReview ? (
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, idx) => (
                  <Star
                    key={idx}
                    className={`h-4.5 w-4.5 ${
                      idx < request.customerReview!.rating
                        ? "fill-amber-400 text-amber-400"
                        : "text-zinc-200"
                    }`}
                  />
                ))}
                <span className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200 ml-1.5">
                  {request.customerReview.rating}점 만족
                </span>
              </div>
              <p className="text-xs font-semibold text-zinc-650 bg-zinc-50 p-3 rounded-lg dark:bg-zinc-900 dark:text-zinc-400 whitespace-pre-line leading-relaxed">
                {request.customerReview.comment}
              </p>
              <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-bold">
                <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500" />
                향후 서비스 재이용 의사: {request.customerReview.wouldReuse === "yes" ? "있음" : "없음"}
              </div>
            </div>
          ) : (
            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <p className="text-[11px] text-zinc-450">작업이 완료되었습니다. 서비스 만족도를 작성해 주시면 큰 도움이 됩니다.</p>
              
              {/* 별점 선택 */}
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-0.5 focus:outline-none cursor-pointer"
                  >
                    <Star
                      className={`h-6 w-6 transition-all ${
                        star <= rating ? "fill-amber-400 text-amber-400 scale-110" : "text-zinc-300 hover:text-amber-300"
                      }`}
                    />
                  </button>
                ))}
              </div>

              {/* 후기 텍스트 */}
              <div>
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value.slice(0, 500))}
                  placeholder="청소 완료 상태, 팀원 친절도 등 후기를 적어주세요."
                  className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-850 outline-none focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-900"
                />
              </div>

              {/* 재이용 의사 */}
              <div className="flex items-center gap-4 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                <span>향후 다시 이용하실 의향이 있으신가요?</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="wouldReuse"
                      value="yes"
                      checked={wouldReuse === "yes"}
                      onChange={(e) => setWouldReuse(e.target.value)}
                      className="accent-blue-600"
                    />
                    예
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="wouldReuse"
                      value="no"
                      checked={wouldReuse === "no"}
                      onChange={(e) => setWouldReuse(e.target.value)}
                      className="accent-blue-600"
                    />
                    아니오
                  </label>
                </div>
              </div>

              {error && <p className="text-[11px] font-bold text-red-500">{error}</p>}

              <button
                type="submit"
                disabled={isPending}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-xl text-xs transition active:scale-98"
              >
                {isPending ? "등록 중..." : "고객 평가 제출"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
