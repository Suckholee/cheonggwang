"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { QuoteRequest, QuoteStatus } from "@/types/quote-request";
import { QUOTE_CATEGORY_LABELS, QUOTE_CATEGORY_EMOJIS } from "@/domain/quote-category";
import { QUOTE_STATUS_LABELS } from "@/domain/quote-status";
import {
  updateAdminQuoteRequestStatus,
  updateAdminQuoteRequestWorker,
  updateAdminQuoteRequestPayment,
  updateAdminQuoteRequestPhotos,
  updateAdminQuoteRequestProviderPayment,
} from "@/app/actions/admin-quote-actions";
import { AdminPhotoUpload } from "./AdminPhotoUpload";
import { Calendar, User, Phone, MapPin, Building, Car, Info, DollarSign, Users, ShieldAlert, Award } from "lucide-react";
import type { Photo } from "@/types/page";

interface Props {
  request: QuoteRequest;
}

export default function RequestDetailManager({ request }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Panels States
  const [status, setStatus] = useState<QuoteStatus>(request.status);
  
  // Payment States
  const [bookingNumber, setBookingNumber] = useState(
    request.bookingPayment?.bookingNumber || `CG-${request.id.slice(0, 6).toUpperCase()}`
  );
  const [paymentMethod, setPaymentMethod] = useState(request.bookingPayment?.paymentMethod || "카드");
  const [hasDeposit, setHasDeposit] = useState(request.bookingPayment?.hasDeposit ?? false);
  const [depositAmount, setDepositAmount] = useState(request.bookingPayment?.depositAmount || 0);
  const [balanceAmount, setBalanceAmount] = useState(request.bookingPayment?.balanceAmount || 0);
  const [contractTotalAmount, setContractTotalAmount] = useState(request.totalAmount || 0);

  // Worker States
  const [assignedTeam, setAssignedTeam] = useState(request.workerAssignment?.assignedTeam || "");
  const [teamLeaderName, setTeamLeaderName] = useState(request.workerAssignment?.teamLeaderName || "");
  const [teamLeaderPhone, setTeamLeaderPhone] = useState(request.workerAssignment?.teamLeaderPhone || "");
  const [workerCount, setWorkerCount] = useState(request.workerAssignment?.workerCount || 1);
  const [estimatedHours, setEstimatedHours] = useState(request.workerAssignment?.estimatedHours || 2);

  // Profit States
  const [providerPayment, setProviderPayment] = useState(request.providerPayment || 0);

  // Photos States
  const [beforePhotos, setBeforePhotos] = useState<Photo[]>(request.photosBefore || []);
  const [afterPhotos, setAfterPhotos] = useState<Photo[]>(request.photosAfter || []);

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleStatusUpdate = () => {
    startTransition(async () => {
      const res = await updateAdminQuoteRequestStatus(request.id, status);
      if (res.ok) {
        showMessage("success", "상태가 변경되었습니다.");
        router.refresh();
      } else {
        showMessage("error", res.message || "상태 변경에 실패했습니다.");
      }
    });
  };

  const handlePaymentUpdate = () => {
    startTransition(async () => {
      const res = await updateAdminQuoteRequestPayment(request.id, {
        bookingNumber,
        hasDeposit,
        depositAmount,
        balanceAmount,
        paymentMethod,
      }, contractTotalAmount);
      
      if (res.ok) {
        showMessage("success", "예약 및 결제 정보가 저장되었습니다.");
        router.refresh();
      } else {
        showMessage("error", res.message || "결제 정보 저장 실패");
      }
    });
  };

  const handleWorkerUpdate = () => {
    startTransition(async () => {
      const res = await updateAdminQuoteRequestWorker(request.id, {
        assignedTeam,
        teamLeaderName,
        teamLeaderPhone,
        workerCount,
        estimatedHours,
      });
      if (res.ok) {
        showMessage("success", "작업자 배정 정보가 저장되었습니다.");
        router.refresh();
      } else {
        showMessage("error", res.message || "작업자 배정 실패");
      }
    });
  };

  const handleProviderPaymentUpdate = () => {
    startTransition(async () => {
      const res = await updateAdminQuoteRequestProviderPayment(request.id, providerPayment);
      if (res.ok) {
        showMessage("success", "수익 정산 정보가 저장되었습니다.");
        router.refresh();
      } else {
        showMessage("error", res.message || "수익 정산 실패");
      }
    });
  };

  const handlePhotosUpdate = (type: "before" | "after", newPhotos: Photo[]) => {
    if (type === "before") {
      setBeforePhotos(newPhotos);
    } else {
      setAfterPhotos(newPhotos);
    }
    startTransition(async () => {
      const res = await updateAdminQuoteRequestPhotos(request.id, type, newPhotos);
      if (res.ok) {
        router.refresh();
      } else {
        showMessage("error", res.message || "사진 업데이트 실패");
      }
    });
  };

  const platformProfit = contractTotalAmount - providerPayment;
  const formattedDate = request.createdAt ? new Date(request.createdAt).toLocaleString() : "-";
  const catLabel = QUOTE_CATEGORY_LABELS[request.category] || request.category;
  const emoji = QUOTE_CATEGORY_EMOJIS[request.category] || "🧹";

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {message && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-2xl border px-4 py-3 text-xs font-black shadow-lg backdrop-blur-md animate-fade-in ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/90 dark:border-emerald-900"
              : "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/90 dark:border-red-900"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
        
        {/* Left Column: Specifications (Read-only) */}
        <div className="space-y-6">
          {/* 고객 의뢰 정보 카드 */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b pb-3 mb-4 dark:border-zinc-800">
              <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
                <Info className="h-4.5 w-4.5 text-blue-500" />
                기본 접수 정보
              </h2>
              <span className="text-[10px] text-zinc-400 font-bold">접수일시: {formattedDate}</span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-zinc-400" />
                <div>
                  <p className="text-[10px] text-zinc-400 font-bold">의뢰인명 / 연락처</p>
                  <p className="font-extrabold text-zinc-800 dark:text-zinc-200">
                    {request.clientName} ({request.contactPhone})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-base">{emoji}</span>
                <div>
                  <p className="text-[10px] text-zinc-400 font-bold">청소 서비스 종류</p>
                  <p className="font-extrabold text-zinc-850 dark:text-zinc-200">
                    {catLabel} · {request.subService} {request.size ? `(${request.size}평)` : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-zinc-400" />
                <div>
                  <p className="text-[10px] text-zinc-400 font-bold">희망 작업 지역 / 주소</p>
                  <p className="font-extrabold text-zinc-800 dark:text-zinc-200">
                    [{request.region.city} {request.region.district}] {request.address || "상세주소 미지정"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-zinc-400" />
                <div>
                  <p className="text-[10px] text-zinc-400 font-bold">희망 일정 / 시간</p>
                  <p className="font-extrabold text-zinc-800 dark:text-zinc-200">
                    {request.preferredDate ? new Date(request.preferredDate).toLocaleDateString() : "일정 미정"} · {request.preferredTime || "시간 미정"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-zinc-400" />
                <div>
                  <p className="text-[10px] text-zinc-400 font-bold">엘리베이터 유무</p>
                  <p className="font-extrabold text-zinc-800 dark:text-zinc-200">
                    {request.hasElevator === "yes" ? "있음 (엘리베이터 이용 가능)" : "없음"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-zinc-400" />
                <div>
                  <p className="text-[10px] text-zinc-400 font-bold">주차 지원 여부</p>
                  <p className="font-extrabold text-zinc-800 dark:text-zinc-200">
                    {request.parkingAvailable === "yes" ? "가능" : request.parkingAvailable === "no" ? "불가능" : "상담 필요"}
                  </p>
                </div>
              </div>
            </div>

            {request.note && (
              <div className="mt-4 border-t pt-3 dark:border-zinc-800">
                <p className="text-[10px] text-zinc-400 font-bold">고객 메모 및 특이사항</p>
                <p className="mt-1 text-xs font-semibold text-zinc-700 bg-zinc-50 p-2.5 rounded-xl dark:bg-zinc-850 dark:text-zinc-350 leading-relaxed whitespace-pre-line">
                  {request.note}
                </p>
              </div>
            )}

            {/* 견적 내역 영수증 */}
            <div className="mt-5 rounded-2xl bg-zinc-50/60 p-4 border border-zinc-150 dark:bg-zinc-850/50 dark:border-zinc-800/80">
              <h3 className="text-xs font-black text-zinc-800 dark:text-zinc-200 mb-2.5">실시간 기본 견적 내역 (1차 산출)</h3>
              <dl className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <dt className="text-zinc-450 font-bold">기본 청소 금액</dt>
                  <dd className="font-extrabold">{request.baseAmount ? `${request.baseAmount.toLocaleString()}원` : "실측후 확정"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-450 font-bold">옵션/추가공간 선택</dt>
                  <dd className="font-extrabold">{request.optionsAmount !== undefined ? `${request.optionsAmount.toLocaleString()}원` : "실측후 확정"}</dd>
                </div>
                <div className="flex justify-between border-t border-dashed pt-1.5 mt-1.5 font-extrabold dark:border-zinc-700">
                  <dt className="text-zinc-900 dark:text-zinc-100 font-black">예상 총 견적액</dt>
                  <dd className="text-blue-600 dark:text-blue-400 font-black">
                    {request.totalAmount ? `${request.totalAmount.toLocaleString()}원` : "실측후 확정"}
                  </dd>
                </div>
              </dl>
              
              {request.optionsList && request.optionsList.length > 0 && (
                <div className="mt-3 border-t border-zinc-200/50 pt-2 dark:border-zinc-800">
                  <p className="text-[10px] text-zinc-400 font-bold mb-1">상세 선택 사항</p>
                  <ul className="space-y-1 text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                    {request.optionsList.map((opt, i) => (
                      <li key={i} className="flex justify-between">
                        <span>{opt.label} ({opt.qty}개)</span>
                        <span>{opt.price === 0 ? "현장확인" : `${opt.price.toLocaleString()}원`}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* 의뢰인이 첨부한 현장 사진 */}
            {request.photos && request.photos.length > 0 && (
              <div className="mt-5 border-t pt-4 dark:border-zinc-800">
                <p className="text-xs font-black text-zinc-900 dark:text-zinc-50 mb-2">고객 등록 현장 사진</p>
                <div className="grid grid-cols-3 gap-2">
                  {request.photos.map((photo, i) => (
                    <div key={i} className="relative aspect-square overflow-hidden rounded-xl bg-zinc-100 border dark:bg-zinc-800">
                      <img src={photo.url} alt={`고객 현장 사진 ${i+1}`} className="object-cover w-full h-full" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 현장 작업 전/후 사진 관리 패널 */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900 space-y-5">
            <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-50 border-b pb-3 flex items-center gap-1.5 dark:border-zinc-800">
              <Award className="h-4.5 w-4.5 text-blue-500" />
              현장 완료 증빙 사진 관리
            </h2>

            <AdminPhotoUpload
              requestId={request.id}
              photos={beforePhotos}
              onChange={(photos) => handlePhotosUpdate("before", photos)}
              label="작업 전 사진"
              maxPhotos={3}
            />

            <div className="border-t border-zinc-100 my-4 dark:border-zinc-800" />

            <AdminPhotoUpload
              requestId={request.id}
              photos={afterPhotos}
              onChange={(photos) => handlePhotosUpdate("after", photos)}
              label="작업 완료 후 사진"
              maxPhotos={3}
            />
          </div>
        </div>

        {/* Right Column: Editable Forms */}
        <div className="space-y-6">
          
          {/* 1. 상태 관리 패널 */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900">
            <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-50 border-b pb-3 mb-4 flex items-center gap-1.5 dark:border-zinc-800">
              <ShieldAlert className="h-4.5 w-4.5 text-blue-500" />
              접수 상태 관리 (8단계)
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-zinc-400 font-bold block mb-1">진행 현황 지정</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as QuoteStatus)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <option value="submitted">1. 고객접수 (submitted)</option>
                  <option value="estimating">2. 견적산출 (estimating)</option>
                  <option value="quoted">2b. 견적발송 (quoted)</option>
                  <option value="consulted">3. 고객상담 (consulted)</option>
                  <option value="negotiating">3b. 계약조율 (negotiating)</option>
                  <option value="booked">4. 예약확정 (booked)</option>
                  <option value="assigned">5. 작업배정 (assigned)</option>
                  <option value="working">6. 작업진행 (working)</option>
                  <option value="completed">7. 작업완료 (completed)</option>
                  <option value="settled">8. 정산완료 (settled)</option>
                  <option value="cancelled">취소됨 (cancelled)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleStatusUpdate}
                disabled={isPending}
                className="w-full bg-[#2563EB] hover:bg-blue-750 text-white font-extrabold py-2.5 rounded-xl text-xs transition active:scale-98 disabled:opacity-50"
              >
                상태 저장하기
              </button>
            </div>
          </div>

          {/* 2. 예약 및 결제 관리 패널 */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900">
            <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-50 border-b pb-3 mb-4 flex items-center gap-1.5 dark:border-zinc-800">
              <DollarSign className="h-4.5 w-4.5 text-blue-500" />
              예약 및 결제 금액 관리
            </h2>
            <div className="space-y-3.5 text-xs font-bold">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-400 font-bold block mb-1">예약 번호</label>
                  <input
                    type="text"
                    value={bookingNumber}
                    onChange={(e) => setBookingNumber(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 font-bold block mb-1">결제 수단</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <option value="카드">신용카드</option>
                    <option value="계좌이체">무통장 계좌이체</option>
                    <option value="현금">현장 현금결제</option>
                    <option value="간편결제">간편결제</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 font-bold block mb-1">최종 계약 확정 금액 (총금액)</label>
                <input
                  type="number"
                  value={contractTotalAmount}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setContractTotalAmount(val);
                    setBalanceAmount(val - depositAmount);
                  }}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-900"
                />
              </div>

              <div className="border-t border-dashed my-2 dark:border-zinc-850" />

              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="hasDeposit"
                  checked={hasDeposit}
                  onChange={(e) => setHasDeposit(e.target.checked)}
                  className="h-4 w-4 rounded-md border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="hasDeposit" className="text-xs text-zinc-700 dark:text-zinc-300 font-bold cursor-pointer">
                  계약금 완납 여부
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-400 font-bold block mb-1">계약금 (원)</label>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setDepositAmount(val);
                      setBalanceAmount(contractTotalAmount - val);
                    }}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 font-bold block mb-1">현장 잔금 (원)</label>
                  <input
                    type="number"
                    value={balanceAmount}
                    onChange={(e) => setBalanceAmount(Number(e.target.value))}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-900"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handlePaymentUpdate}
                disabled={isPending}
                className="w-full bg-[#2563EB] hover:bg-blue-750 text-white font-extrabold py-2.5 rounded-xl text-xs transition active:scale-98 disabled:opacity-50"
              >
                예약/결제정보 저장하기
              </button>
            </div>
          </div>

          {/* 3. 작업자 배정 관리 패널 */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900">
            <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-50 border-b pb-3 mb-4 flex items-center gap-1.5 dark:border-zinc-800">
              <Users className="h-4.5 w-4.5 text-blue-500" />
              현장 작업자 배정 관리
            </h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-400 font-bold block mb-1">배정팀명</label>
                  <input
                    type="text"
                    placeholder="예: 서울 청광 2팀"
                    value={assignedTeam}
                    onChange={(e) => setAssignedTeam(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 font-bold block mb-1">팀장명</label>
                  <input
                    type="text"
                    placeholder="김팀장"
                    value={teamLeaderName}
                    onChange={(e) => setTeamLeaderName(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 font-bold block mb-1">팀장 연락처</label>
                <input
                  type="text"
                  placeholder="010-0000-0000"
                  value={teamLeaderPhone}
                  onChange={(e) => setTeamLeaderPhone(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 font-bold">
                <div>
                  <label className="text-[10px] text-zinc-400 font-bold block mb-1">투입 작업 인원 (명)</label>
                  <input
                    type="number"
                    value={workerCount}
                    onChange={(e) => setWorkerCount(Number(e.target.value))}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 font-bold block mb-1">예상 소요 시간 (시간)</label>
                  <input
                    type="number"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(Number(e.target.value))}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-900"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleWorkerUpdate}
                disabled={isPending}
                className="w-full bg-[#2563EB] hover:bg-blue-750 text-white font-extrabold py-2.5 rounded-xl text-xs transition active:scale-98 disabled:opacity-50"
              >
                배정 정보 저장하기
              </button>
            </div>
          </div>

          {/* 4. 플랫폼 수익 정산 패널 */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900">
            <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-50 border-b pb-3 mb-4 flex items-center gap-1.5 dark:border-zinc-800">
              <DollarSign className="h-4.5 w-4.5 text-blue-500" />
              플랫폼 수익 및 정산 관리
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs font-bold">
                <div>
                  <label className="text-[10px] text-zinc-400 font-bold block mb-1">총 계약금액 (A)</label>
                  <div className="w-full rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2 text-xs font-extrabold text-zinc-800 dark:border-zinc-800 dark:bg-zinc-850 dark:text-zinc-200">
                    {contractTotalAmount.toLocaleString()}원
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 font-bold block mb-1">용역사 지급액 (B)</label>
                  <input
                    type="number"
                    value={providerPayment}
                    onChange={(e) => setProviderPayment(Number(e.target.value))}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-900"
                  />
                </div>
              </div>

              {/* 수익 마진 실시간 계산 */}
              <div className="rounded-2xl bg-blue-50/40 p-4 border border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/40">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-zinc-700 dark:text-zinc-300">플랫폼 순 수익 (A - B)</span>
                  <span className="text-base font-extrabold text-blue-600 dark:text-blue-400">
                    {platformProfit.toLocaleString()}원
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold text-zinc-450 mt-1">
                  <span>예상 수익률</span>
                  <span>
                    {contractTotalAmount > 0
                      ? `${((platformProfit / contractTotalAmount) * 100).toFixed(1)}%`
                      : "0.0%"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleProviderPaymentUpdate}
                disabled={isPending}
                className="w-full bg-[#2563EB] hover:bg-blue-750 text-white font-extrabold py-2.5 rounded-xl text-xs transition active:scale-98 disabled:opacity-50"
              >
                정산 정보 저장하기
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
