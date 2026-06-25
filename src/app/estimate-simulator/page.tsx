"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calculator,
  User,
  Phone,
  MapPin,
  ClipboardList,
  Layers,
  FileText,
  Printer,
  FileDown,
  Database,
  ArrowRight,
  TrendingUp,
  CheckCircle,
  Truck,
  Plus,
  RefreshCw,
  Trash2,
  HelpCircle,
  Search,
  Check,
  AlertTriangle
} from "lucide-react";

// 청소 종류별 단가 및 옵션 목록 정의
interface CleanOption {
  key: string;
  label: string;
  price: number;
  type: "boolean" | "number";
}

interface CleanCategory {
  key: string;
  label: string;
  pricePerPyung: number;
  options: CleanOption[];
}

const CLEAN_CATEGORIES: CleanCategory[] = [
  {
    key: "oneRoom",
    label: "원룸 청소",
    pricePerPyung: 13000,
    options: [
      { key: "mold", label: "곰팡이 제거", price: 50000, type: "boolean" },
      { key: "sickHouse", label: "새집증후군 케어", price: 100000, type: "boolean" },
      { key: "aircon", label: "에어컨 내부 세척", price: 80000, type: "number" },
      { key: "fridge", label: "냉장고 내부 스팀청소", price: 40000, type: "number" }
    ]
  },
  {
    key: "moveIn",
    label: "입주 청소",
    pricePerPyung: 10000,
    options: [
      { key: "sickHouse", label: "새집증후군 전문 케어", price: 150000, type: "boolean" },
      { key: "mold", label: "곰팡이 완전 박멸", price: 80000, type: "boolean" },
      { key: "phytoncide", label: "피톤치드 살균 탈취", price: 50000, type: "boolean" }
    ]
  },
  {
    key: "cafe",
    label: "카페/음식점 청소",
    pricePerPyung: 15000,
    options: [
      { key: "hood", label: "주방 후드 유지망 오염 제거", price: 120000, type: "boolean" },
      { key: "toilet", label: "화장실 추가 딥클리닝", price: 80000, type: "number" },
      { key: "waxing", label: "바닥 박리 및 고급 왁싱 코팅", price: 150000, type: "boolean" }
    ]
  }
];

// 가상 청명(프로) 리스트
interface VirtualPro {
  id: string;
  businessName: string;
  phone: string;
  region: string;
  grade: string;
}

const VIRTUAL_PROS: VirtualPro[] = [
  { id: "pro-1", businessName: "태평양 클린", phone: "010-1234-5678", region: "서울 중랑구 망우동 일대", grade: "마스터" },
  { id: "pro-2", businessName: "청명한 서울", phone: "010-9876-5432", region: "서울 성동구 왕십리 일대", grade: "우수" },
  { id: "pro-3", businessName: "올클리어 토탈홈케어", phone: "010-5555-4444", region: "서울 광진구 구의동 일대", grade: "마스터" }
];

// 로컬스토리지 저장 데이터 타입 정의
interface CustomerQuote {
  id: string; // 견적 번호 (예: 20260618-01)
  name: string;
  phone: string;
  address: string;
  cleanType: string;
  cleanTypeLabel: string;
  areaSize: number;
  baseAmount: number;
  optionsAmount: number;
  totalAmount: number;
  optionsList: Array<{ label: string; qty: number; price: number }>;
  status: "draft" | "submitted" | "matched" | "completed";
  createdAt: string;
}

interface FieldEstimate {
  id: string; // 견적 번호
  createdAt: string;
  customerName: string;
  proName: string;
  baseAmount: number;
  additionalAmount: number;
  reason: string;
  finalAmount: number;
}

export default function EstimateSimulatorPage() {
  const [mounted, setMounted] = useState(false);
  // 활성화된 탭 관리: 'client' (1단계) | 'platform' (2단계) | 'pro' (3단계) | 'db' (4단계)
  const [activeTab, setActiveTab] = useState<"client" | "platform" | "pro" | "db">("client");

  // --- 1단계: 기본 견적 상태 ---
  const [clientName, setClientName] = useState("태평이");
  const [phone, setPhone] = useState("010-1234-9999");
  const [address, setAddress] = useState("서울 중랑구 망우동 123-45");
  const [cleanType, setCleanType] = useState("moveIn"); // 기본값: 입주 청소
  const [areaSize, setAreaSize] = useState(30); // 기본값: 30평
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({});
  const [quoteNumber, setQuoteNumber] = useState("");
  const [printAnimation, setPrintAnimation] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // --- 2단계: 현장 접수 및 매칭 상태 ---
  const [searchQuoteId, setSearchQuoteId] = useState("");
  const [activeQuote, setActiveQuote] = useState<CustomerQuote | null>(null);
  const [matchingStatus, setMatchingStatus] = useState<"idle" | "request_sent" | "matched">("idle");
  const [matchedPro, setMatchedPro] = useState<VirtualPro | null>(null);

  // --- 3단계: 2차 현장 견적 상태 ---
  const [additionalAmount, setAdditionalAmount] = useState<number>(30000); // 기본 추가금: 3만원
  const [additionalReason, setAdditionalReason] = useState("베란다 다용도실 추가 및 복층 구조 먼지 제거");
  const [proFinalAmount, setProFinalAmount] = useState(0);
  const [isFinalConfirmed, setIsFinalConfirmed] = useState(false);

  // --- 4단계: DB 대시보드 상태 ---
  const [customerDB, setCustomerDB] = useState<CustomerQuote[]>([]);
  const [fieldDB, setFieldDB] = useState<FieldEstimate[]>([]);
  const [dbSearchTerm, setDbSearchTerm] = useState("");

  // 토스트 메시지 헬퍼
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 초기화 및 로컬스토리지 불러오기
  useEffect(() => {
    setMounted(true);
    const cachedCustomers = localStorage.getItem("cg_customer_db");
    const cachedFields = localStorage.getItem("cg_field_db");

    if (cachedCustomers) setCustomerDB(JSON.parse(cachedCustomers));
    if (cachedFields) setFieldDB(JSON.parse(cachedFields));

    generateNewQuoteNumber();
  }, []);

  // 고객 DB, 현장 DB 로컬스토리지 동기화
  const saveCustomerDB = (db: CustomerQuote[]) => {
    setCustomerDB(db);
    localStorage.setItem("cg_customer_db", JSON.stringify(db));
  };

  const saveFieldDB = (db: FieldEstimate[]) => {
    setFieldDB(db);
    localStorage.setItem("cg_field_db", JSON.stringify(db));
  };

  // 견적 번호 생성 규칙: YYYYMMDD-NN (오늘 날짜 기준 몇 번째 견적인지)
  const generateNewQuoteNumber = () => {
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const cachedCustomers = localStorage.getItem("cg_customer_db");
    let count = 1;

    if (cachedCustomers) {
      const db: CustomerQuote[] = JSON.parse(cachedCustomers);
      const todayQuotes = db.filter((q) => q.id.startsWith(todayStr));
      count = todayQuotes.length + 1;
    }

    const formattedNum = `${todayStr}-${String(count).padStart(2, "0")}`;
    setQuoteNumber(formattedNum);
  };

  // 현재 선택한 카테고리 정보 조회
  const currentCategory = CLEAN_CATEGORIES.find((c) => c.key === cleanType) || CLEAN_CATEGORIES[0];

  // 금액 계산
  const baseAmount = areaSize * currentCategory.pricePerPyung;
  const optionsAmount = Object.entries(selectedOptions).reduce((acc, [optKey, qty]) => {
    const opt = currentCategory.options.find((o) => o.key === optKey);
    if (!opt) return acc;
    return acc + opt.price * qty;
  }, 0);
  const totalAmount = baseAmount + optionsAmount;

  // 옵션 변경 핸들러
  const handleOptionToggle = (optKey: string, isChecked: boolean, priceType: "boolean" | "number") => {
    setSelectedOptions((prev) => {
      const next = { ...prev };
      if (isChecked) {
        next[optKey] = 1;
      } else {
        delete next[optKey];
      }
      return next;
    });
  };

  const handleOptionQtyChange = (optKey: string, qty: number) => {
    setSelectedOptions((prev) => {
      const next = { ...prev };
      if (qty > 0) {
        next[optKey] = qty;
      } else {
        delete next[optKey];
      }
      return next;
    });
  };

  // 카테고리 변경 시 옵션 리셋
  useEffect(() => {
    setSelectedOptions({});
  }, [cleanType]);

  // 1단계: 기본 견적서 저장 (고객 DB 등록)
  const handleSaveCustomerQuote = () => {
    if (!clientName.trim() || !phone.trim() || !address.trim()) {
      triggerToast("고객명, 연락처, 주소를 모두 입력해주세요!");
      return;
    }

    // 이미 저장된 견적인지 확인
    const exists = customerDB.some((q) => q.id === quoteNumber);
    if (exists) {
      triggerToast("이미 저장 완료된 견적서입니다. 새 견적 번호를 발급합니다.");
      generateNewQuoteNumber();
      return;
    }

    const optionsList = Object.entries(selectedOptions).map(([optKey, qty]) => {
      const opt = currentCategory.options.find((o) => o.key === optKey)!;
      return {
        label: opt.label,
        qty,
        price: opt.price
      };
    });

    const newQuote: CustomerQuote = {
      id: quoteNumber,
      name: clientName,
      phone,
      address,
      cleanType,
      cleanTypeLabel: currentCategory.label,
      areaSize,
      baseAmount,
      optionsAmount,
      totalAmount,
      optionsList,
      status: "submitted",
      createdAt: new Date().toLocaleString()
    };

    const updatedDB = [newQuote, ...customerDB];
    saveCustomerDB(updatedDB);
    triggerToast(`견적서가 저장되었습니다! (견적번호: ${quoteNumber})`);
    
    // 현장 접수 단계로 바로 데이터를 흘려보내기 위한 사전 탑재
    setSearchQuoteId(quoteNumber);
    setActiveQuote(newQuote);

    // 인쇄 애니메이션 트리거
    setPrintAnimation(true);
    setTimeout(() => setPrintAnimation(false), 1200);
  };

  // 2단계: 견적서 번호로 불러오기
  const handleLoadQuote = (targetId?: string) => {
    const qid = targetId || searchQuoteId;
    if (!qid.trim()) {
      triggerToast("견적 번호를 입력해주세요.");
      return;
    }

    const found = customerDB.find((q) => q.id === qid);
    if (found) {
      setActiveQuote(found);
      setSearchQuoteId(qid);
      setMatchingStatus("idle");
      setMatchedPro(null);
      setIsFinalConfirmed(false);
      setAdditionalAmount(30000); // 2차 견적 초기화
      triggerToast(`견적서 [${qid}]를 정상적으로 불러왔습니다.`);
    } else {
      triggerToast("해당 견적 번호를 찾을 수 없습니다. 고객 DB에서 먼저 작성해주세요.");
    }
  };

  // 2단계: 가상 매칭 트리거
  const handleStartMatching = () => {
    if (!activeQuote) return;
    setMatchingStatus("request_sent");

    // 플랫폼 매칭 연출
    setTimeout(() => {
      // 주소나 지역 매칭 연출: 예시로 첫 번째 혹은 랜덤 파트너 매칭
      const randomIndex = Math.floor(Math.random() * VIRTUAL_PROS.length);
      const pro = VIRTUAL_PROS[randomIndex];
      setMatchedPro(pro);
      setMatchingStatus("matched");

      // 고객 DB 상태 업데이트
      const updatedDB = customerDB.map((q) => {
        if (q.id === activeQuote.id) {
          return { ...q, status: "matched" as const };
        }
        return q;
      });
      saveCustomerDB(updatedDB);
      setActiveQuote((prev) => (prev ? { ...prev, status: "matched" } : null));

      triggerToast(`매칭 완료! [${pro.businessName}] 파트너가 배정되었습니다.`);
    }, 1500);
  };

  // 3단계: 최종 현장 금액 계산 및 확정
  const handleFinalConfirm = () => {
    if (!activeQuote || !matchedPro) {
      triggerToast("먼저 견적을 불러오고 파트너 배정을 완료해야 합니다.");
      return;
    }

    // 이미 확정되었는지 검사
    if (fieldDB.some((f) => f.id === activeQuote.id)) {
      triggerToast("이미 최종 확정되어 현장 DB에 저장된 내역입니다.");
      setIsFinalConfirmed(true);
      return;
    }

    const finalSum = activeQuote.totalAmount + additionalAmount;
    
    const newFieldEst: FieldEstimate = {
      id: activeQuote.id,
      createdAt: new Date().toLocaleString(),
      customerName: activeQuote.name,
      proName: matchedPro.businessName,
      baseAmount: activeQuote.totalAmount,
      additionalAmount,
      reason: additionalReason,
      finalAmount: finalSum
    };

    const updatedFieldDB = [newFieldEst, ...fieldDB];
    saveFieldDB(updatedFieldDB);

    // 고객 DB 상태를 'completed'로 업데이트
    const updatedCustomerDB = customerDB.map((q) => {
      if (q.id === activeQuote.id) {
        return { ...q, status: "completed" as const };
      }
      return q;
    });
    saveCustomerDB(updatedCustomerDB);
    setActiveQuote((prev) => (prev ? { ...prev, status: "completed" } : null));

    setIsFinalConfirmed(true);
    triggerToast("최종 현장 견적서 확정 완료! 현장 DB로 정보가 안전하게 전송되었습니다.");
  };

  // 데이터베이스 완전 리셋
  const handleClearDB = () => {
    if (confirm("고객 DB 및 현장 DB의 모든 가상 데이터를 삭제하고 초기화하시겠습니까?")) {
      localStorage.removeItem("cg_customer_db");
      localStorage.removeItem("cg_field_db");
      setCustomerDB([]);
      setFieldDB([]);
      setActiveQuote(null);
      setMatchedPro(null);
      setMatchingStatus("idle");
      generateNewQuoteNumber();
      triggerToast("데이터베이스가 깨끗하게 초기화되었습니다.");
    }
  };

  // 특정 견적 삭제
  const handleDeleteCustomerQuote = (id: string) => {
    const filtered = customerDB.filter((q) => q.id !== id);
    saveCustomerDB(filtered);
    
    // 현장 DB에서도 연동 삭제
    const filteredField = fieldDB.filter((f) => f.id !== id);
    saveFieldDB(filteredField);

    if (activeQuote?.id === id) {
      setActiveQuote(null);
      setMatchedPro(null);
      setMatchingStatus("idle");
    }
    triggerToast(`견적서 [${id}] 삭제 완료.`);
  };

  // 견적 포맷용 함수
  const formatWon = (val: number) => {
    return val.toLocaleString("ko-KR") + "원";
  };

  // DB 검색 필터링
  const filteredCustomerDB = customerDB.filter((q) => {
    const term = dbSearchTerm.toLowerCase();
    return (
      q.name.toLowerCase().includes(term) ||
      q.id.toLowerCase().includes(term) ||
      q.phone.includes(term) ||
      q.address.toLowerCase().includes(term) ||
      q.cleanTypeLabel.toLowerCase().includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-zinc-50 pb-20 text-zinc-850 dark:bg-zinc-950 dark:text-zinc-100 animate-[fade-in_0.4s_ease-out]">
      {/* 토스트 팝업 */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3.5 text-sm font-semibold text-white shadow-xl animate-in fade-in slide-in-from-top-4 duration-200 dark:bg-white dark:text-zinc-950">
          <CheckCircle className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 헤더 */}
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/80 py-4 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-[0_4px_12px_rgba(37,99,235,0.25)]">
              <Calculator className="h-5.5 w-5.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Cheonggwang Simulator
                </span>
                <span className="inline-flex items-center rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  v1.5
                </span>
              </div>
              <h1 className="text-lg font-black tracking-tight text-zinc-900 dark:text-zinc-50">
                청광 2단계 매칭 및 견적 계산기 시스템
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-600 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              홈으로 복귀
            </Link>
            <button
              onClick={handleClearDB}
              className="flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 shadow-sm transition hover:bg-red-100 dark:border-red-950/50 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-900/40"
            >
              <Trash2 className="h-3.5 w-3.5" />
              가상 DB 초기화
            </button>
          </div>
        </div>
      </header>

      {/* 설명 안내 패널 */}
      <div className="mx-auto max-w-7xl px-6 pt-6">
        <div className="rounded-2xl border border-blue-105 bg-gradient-to-r from-blue-50/50 to-indigo-50/30 p-5 dark:border-blue-950/40 dark:from-zinc-900/60 dark:to-zinc-900/30">
          <div className="flex items-start gap-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                견적기 계산 및 현장 매칭 흐름 가이드
              </h2>
              <p className="mt-1 text-xs leading-5 text-zinc-600 dark:text-zinc-450">
                이 시뮬레이터는 고객이 1차로 플랫폼에서 정보를 입력해 기본 견적서를 받고, 현장 방문을 요청하면, 배정된 청소업체(청명)가 현장을 방문하여 추가 사유에 따른 추가 요금을 계산하는 2단계 견적 프로세스를 구현합니다. 아래 탭을 클릭하여 각 역할을 바꾸어가며 가상 DB 저장을 시험해 보세요!
              </p>
              {/* 타임라인 플로우 차트 */}
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-4">
                <div
                  onClick={() => setActiveTab("client")}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 transition duration-200 ${
                    activeTab === "client"
                      ? "border-blue-500 bg-white text-blue-600 shadow-sm dark:bg-zinc-900"
                      : "border-zinc-200/60 bg-transparent text-zinc-650 hover:border-zinc-300 dark:border-zinc-800"
                  }`}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-600 dark:bg-blue-900/60 dark:text-blue-400">
                    1
                  </span>
                  <div className="text-left">
                    <p className="text-[11px] font-bold leading-none">의뢰인 기본견적</p>
                    <span className="text-[9px] opacity-70">고객 DB로 저장</span>
                  </div>
                </div>

                <div
                  onClick={() => setActiveTab("platform")}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 transition duration-200 ${
                    activeTab === "platform"
                      ? "border-blue-500 bg-white text-blue-600 shadow-sm dark:bg-zinc-900"
                      : "border-zinc-200/60 bg-transparent text-zinc-650 hover:border-zinc-300 dark:border-zinc-800"
                  }`}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-600 dark:bg-blue-900/60 dark:text-blue-400">
                    2
                  </span>
                  <div className="text-left">
                    <p className="text-[11px] font-bold leading-none">현장접수 & 매칭</p>
                    <span className="text-[9px] opacity-70">견적 로드 및 프로 매칭</span>
                  </div>
                </div>

                <div
                  onClick={() => setActiveTab("pro")}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 transition duration-200 ${
                    activeTab === "pro"
                      ? "border-blue-500 bg-white text-blue-600 shadow-sm dark:bg-zinc-900"
                      : "border-zinc-200/60 bg-transparent text-zinc-650 hover:border-zinc-300 dark:border-zinc-800"
                  }`}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-600 dark:bg-blue-900/60 dark:text-blue-400">
                    3
                  </span>
                  <div className="text-left">
                    <p className="text-[11px] font-bold leading-none">2차 현장견적</p>
                    <span className="text-[9px] opacity-70">추가금 입력 및 최종확정</span>
                  </div>
                </div>

                <div
                  onClick={() => setActiveTab("db")}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 transition duration-200 ${
                    activeTab === "db"
                      ? "border-blue-500 bg-white text-blue-600 shadow-sm dark:bg-zinc-900"
                      : "border-zinc-200/60 bg-transparent text-zinc-650 hover:border-zinc-300 dark:border-zinc-800"
                  }`}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-600 dark:bg-blue-900/60 dark:text-blue-400">
                    4
                  </span>
                  <div className="text-left">
                    <p className="text-[11px] font-bold leading-none">DB 실시간 대시보드</p>
                    <span className="text-[9px] opacity-70">고객/현장 DB 표 모니터</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 영역 */}
      <main className="mx-auto max-w-7xl px-6 pt-8">
        {activeTab !== "db" ? (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* 왼쪽 조작 패널 (lg: 7칸) */}
            <div className="lg:col-span-7 space-y-6">
              {/* 1단계: 기본 견적서 입력 */}
              {activeTab === "client" && (
                <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-850 dark:bg-zinc-900">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-850">
                    <div className="flex items-center gap-2">
                      <Layers className="h-5 w-5 text-blue-600" />
                      <h3 className="font-bold text-zinc-900 dark:text-white">
                        [1단계] 의뢰인 기본 견적 입력 폼
                      </h3>
                    </div>
                    <button
                      onClick={generateNewQuoteNumber}
                      title="새로운 견적번호 발급"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="mt-5 space-y-4">
                    {/* 견적서 번호 미리 표시 */}
                    <div className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-850">
                      <span className="text-xs font-semibold text-zinc-550">신규 발급 견적 번호</span>
                      <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                        {quoteNumber}
                      </span>
                    </div>

                    {/* 기본 인적 정보 */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-[11px] font-bold text-zinc-500 block mb-1">고객명</label>
                        <div className="relative">
                          <User className="absolute top-2.5 left-3 h-4 w-4 text-zinc-400" />
                          <input
                            type="text"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            placeholder="고객명(상호명)"
                            className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-4 text-xs font-semibold text-zinc-800 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-zinc-500 block mb-1">연락처</label>
                        <div className="relative">
                          <Phone className="absolute top-2.5 left-3 h-4 w-4 text-zinc-400" />
                          <input
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="연락처"
                            className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-4 text-xs font-semibold text-zinc-800 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-zinc-500 block mb-1">현장 주소</label>
                      <div className="relative">
                        <MapPin className="absolute top-2.5 left-3 h-4 w-4 text-zinc-400" />
                        <input
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="현장 주소"
                          className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-4 text-xs font-semibold text-zinc-800 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                        />
                      </div>
                    </div>

                    {/* 청소 종류 선택 */}
                    <div>
                      <label className="text-[11px] font-bold text-zinc-500 block mb-1.5">청소 서비스 종류</label>
                      <div className="grid grid-cols-3 gap-2">
                        {CLEAN_CATEGORIES.map((cat) => (
                          <button
                            key={cat.key}
                            type="button"
                            onClick={() => setCleanType(cat.key)}
                            className={`rounded-xl border p-3 text-center transition duration-200 ${
                              cleanType === cat.key
                                ? "border-blue-600 bg-blue-50 text-blue-600 font-bold dark:bg-blue-950/40 dark:text-blue-400"
                                : "border-zinc-200 bg-white text-zinc-650 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400"
                            }`}
                          >
                            <span className="block text-xs">{cat.label}</span>
                            <span className="mt-0.5 block text-[10px] opacity-70">
                              평당 {cat.pricePerPyung.toLocaleString()}원
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 평수 선택 슬라이더 및 입력창 */}
                    <div className="rounded-2xl border border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-850 dark:bg-zinc-950/20">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[11px] font-bold text-zinc-500">평수 선택</label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={areaSize}
                            onChange={(e) => setAreaSize(Math.max(1, Number(e.target.value)))}
                            className="w-16 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-right text-xs font-bold focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                          />
                          <span className="text-xs font-bold text-zinc-650">평</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="120"
                        value={areaSize}
                        onChange={(e) => setAreaSize(Number(e.target.value))}
                        className="h-1.5 w-full cursor-pointer rounded-lg bg-zinc-200 accent-blue-600 dark:bg-zinc-800"
                      />
                      <div className="mt-2 flex justify-between text-[10px] text-zinc-400 font-semibold">
                        <span>5평</span>
                        <span>30평</span>
                        <span>60평</span>
                        <span>90평</span>
                        <span>120평</span>
                      </div>
                    </div>

                    {/* 동적 옵션 리스트 */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-bold text-zinc-500">
                          {currentCategory.label} 전용 추가 옵션 선택
                        </label>
                        <span className="text-[9px] text-zinc-400">카테고리별 맞춤 노출</span>
                      </div>
                      <div className="space-y-2.5">
                        {currentCategory.options.map((opt) => {
                          const isChecked = selectedOptions[opt.key] !== undefined;
                          const currentQty = selectedOptions[opt.key] || 0;

                          return (
                            <div
                              key={opt.key}
                              className={`flex items-center justify-between rounded-xl border p-3 transition-colors duration-200 ${
                                isChecked
                                  ? "border-blue-200 bg-blue-50/20 dark:border-blue-900/30 dark:bg-blue-950/10"
                                  : "border-zinc-100 bg-white hover:bg-zinc-50/50 dark:border-zinc-850"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  id={`opt-${opt.key}`}
                                  checked={isChecked}
                                  onChange={(e) =>
                                    handleOptionToggle(opt.key, e.target.checked, opt.type)
                                  }
                                  className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                                />
                                <div>
                                  <label
                                    htmlFor={`opt-${opt.key}`}
                                    className="cursor-pointer text-xs font-semibold text-zinc-800 dark:text-zinc-200 block"
                                  >
                                    {opt.label}
                                  </label>
                                  <span className="text-[10px] text-zinc-400 font-medium">
                                    + {opt.price.toLocaleString()}원
                                    {opt.type === "number" ? " (1회당)" : ""}
                                  </span>
                                </div>
                              </div>

                              {/* 수량 조절 노출 (수량 카운트 타입일 때) */}
                              {isChecked && opt.type === "number" && (
                                <div className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-950 animate-[fade-in_0.15s_ease-out]">
                                  <button
                                    type="button"
                                    onClick={() => handleOptionQtyChange(opt.key, currentQty - 1)}
                                    className="flex h-5 w-5 items-center justify-center rounded text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                  >
                                    -
                                  </button>
                                  <span className="w-5 text-center text-xs font-bold text-zinc-855 dark:text-zinc-200">
                                    {currentQty}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleOptionQtyChange(opt.key, currentQty + 1)}
                                    className="flex h-5 w-5 items-center justify-center rounded text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                  >
                                    +
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* DB 저장 버튼 */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleSaveCustomerQuote}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-xs font-bold text-white shadow-md transition hover:bg-blue-700 hover:shadow-lg active:scale-[0.99] cursor-pointer"
                      >
                        <Database className="h-4 w-4" />
                        기본 견적 완료 및 고객 DB 저장
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 2단계: 현장 접수 및 매칭 */}
              {activeTab === "platform" && (
                <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-850 dark:bg-zinc-900">
                  <div className="flex items-center gap-2 border-b border-zinc-100 pb-4 dark:border-zinc-850">
                    <Truck className="h-5 w-5 text-blue-600" />
                    <h3 className="font-bold text-zinc-900 dark:text-white">
                      [2단계] 현장 접수 신청 및 청명(파트너) 배정
                    </h3>
                  </div>

                  <div className="mt-5 space-y-5">
                    {/* 견적서 불러오기 */}
                    <div className="rounded-2xl border border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-850 dark:bg-zinc-950/20">
                      <h4 className="text-[11px] font-bold text-zinc-500 mb-2">
                        1. 고객 DB에서 견적서 불러오기
                      </h4>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute top-2.5 left-3 h-3.5 w-3.5 text-zinc-400" />
                          <input
                            type="text"
                            value={searchQuoteId}
                            onChange={(e) => setSearchQuoteId(e.target.value)}
                            placeholder="견적 번호 입력 (예: 20260618-01)"
                            className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-4 text-xs font-mono font-bold text-zinc-800 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleLoadQuote()}
                          className="rounded-xl bg-zinc-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 cursor-pointer"
                        >
                          로드
                        </button>
                      </div>

                      {/* 최근 작성된 견적 퀵 링크 */}
                      {customerDB.length > 0 && (
                        <div className="mt-3">
                          <p className="text-[9px] font-bold text-zinc-400 mb-1">최근 작성된 견적 목록</p>
                          <div className="flex flex-wrap gap-1.5">
                            {customerDB.slice(0, 3).map((q) => (
                              <button
                                key={q.id}
                                onClick={() => handleLoadQuote(q.id)}
                                className={`rounded-lg border px-2 py-1 text-[10px] font-mono font-semibold transition cursor-pointer ${
                                  activeQuote?.id === q.id
                                    ? "border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-950/40"
                                    : "border-zinc-200 bg-white text-zinc-650 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
                                }`}
                              >
                                {q.id} ({q.name})
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {activeQuote ? (
                      <div className="space-y-4">
                        {/* 불러온 견적서 요약 정보 */}
                        <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-inner dark:border-zinc-850 dark:bg-zinc-950/40">
                          <h5 className="text-[11px] font-bold text-zinc-500 mb-2.5">
                            로드된 기본 견적 요약
                          </h5>
                          <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                            <div className="flex justify-between border-b border-zinc-50 pb-1.5 dark:border-zinc-850">
                              <span className="text-zinc-450">고객명</span>
                              <span className="font-semibold">{activeQuote.name}</span>
                            </div>
                            <div className="flex justify-between border-b border-zinc-50 pb-1.5 dark:border-zinc-850">
                              <span className="text-zinc-455">주소</span>
                              <span className="font-semibold truncate max-w-[120px]">{activeQuote.address}</span>
                            </div>
                            <div className="flex justify-between border-b border-zinc-50 pb-1.5 dark:border-zinc-850">
                              <span className="text-zinc-455">청소 종류</span>
                              <span className="font-semibold">{activeQuote.cleanTypeLabel}</span>
                            </div>
                            <div className="flex justify-between border-b border-zinc-50 pb-1.5 dark:border-zinc-850">
                              <span className="text-zinc-455">평수</span>
                              <span className="font-semibold">{activeQuote.areaSize}평</span>
                            </div>
                            <div className="col-span-2 flex justify-between pt-1">
                              <span className="text-zinc-455">기본 합계 금액</span>
                              <span className="font-bold text-blue-600 dark:text-blue-400">
                                {formatWon(activeQuote.totalAmount)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 매칭 프로세스 */}
                        <div className="rounded-2xl border border-zinc-150 bg-gradient-to-br from-zinc-50/50 to-blue-50/20 p-4 dark:border-zinc-800 dark:from-zinc-900/40 dark:to-zinc-950/20">
                          <h4 className="text-[11px] font-bold text-zinc-500 mb-2">
                            2. 현장 방문 배정 실행
                          </h4>

                          {matchingStatus === "idle" && (
                            <button
                              type="button"
                              onClick={handleStartMatching}
                              className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3 text-xs font-bold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 cursor-pointer animate-pulse"
                            >
                              매칭 가능한 청명(파트너) 조회 및 배정
                            </button>
                          )}

                          {matchingStatus === "request_sent" && (
                            <div className="flex flex-col items-center justify-center py-4 text-center">
                              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-2" />
                              <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                                해당 지역 청명 파트너들에게 현장접수 건 전송 중...
                              </p>
                              <span className="text-[10px] text-zinc-400 mt-1">지역: {activeQuote.address.split(" ")[1] || "성동구"} 인근</span>
                            </div>
                          )}

                          {matchingStatus === "matched" && matchedPro && (
                            <div className="space-y-3 animate-[fade-in_0.3s_ease-out]">
                              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                                <CheckCircle className="h-4 w-4 shrink-0" />
                                <span>최적의 파트너와 매칭이 완료되었습니다.</span>
                              </div>

                              <div className="rounded-xl border border-emerald-100 bg-white p-3 dark:border-emerald-950/30 dark:bg-zinc-950 shadow-sm">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                                    CHG 인증 파트너 ({matchedPro.grade})
                                  </span>
                                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300">
                                    매칭완료
                                  </span>
                                </div>
                                <h5 className="mt-1 text-sm font-black text-zinc-900 dark:text-white">
                                  {matchedPro.businessName}
                                </h5>
                                <p className="mt-1 text-[11px] text-zinc-550">
                                  연락처: {matchedPro.phone} | 매장 주소: {matchedPro.region}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => setActiveTab("pro")}
                                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-3 text-xs font-bold text-white transition hover:bg-blue-700 cursor-pointer"
                              >
                                다음 단계로: 2차 현장 견적서 작성하러 가기
                                <ArrowRight className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-400">
                        <AlertTriangle className="h-8 w-8 text-zinc-300 mb-2" />
                        <p className="text-xs font-semibold">아직 로드된 견적 정보가 없습니다.</p>
                        <span className="text-[10px] mt-1">상단에서 견적 번호를 넣고 로드하거나, 1단계에서 견적을 저장해주세요.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 3단계: 2차 현장 견적 */}
              {activeTab === "pro" && (
                <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-850 dark:bg-zinc-900">
                  <div className="flex items-center gap-2 border-b border-zinc-100 pb-4 dark:border-zinc-850">
                    <ClipboardList className="h-5 w-5 text-blue-600" />
                    <h3 className="font-bold text-zinc-900 dark:text-white">
                      [3단계] 청소업체(청명) 2차 현장 견적 작성
                    </h3>
                  </div>

                  <div className="mt-5 space-y-4">
                    {activeQuote && matchedPro ? (
                      <>
                        {/* 매칭 파트너 & 기본견적 정보 요약 */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3 text-xs dark:border-zinc-850 dark:bg-zinc-950/20">
                            <span className="text-[10px] text-zinc-400 block font-bold">배정된 업체</span>
                            <span className="font-bold text-zinc-900 dark:text-zinc-100 block mt-0.5">
                              {matchedPro.businessName}
                            </span>
                            <span className="text-[10px] text-zinc-500">{matchedPro.phone}</span>
                          </div>
                          <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3 text-xs dark:border-zinc-850 dark:bg-zinc-950/20">
                            <span className="text-[10px] text-zinc-400 block font-bold">의뢰인 기본 견적가</span>
                            <span className="font-bold text-blue-600 dark:text-blue-400 block mt-0.5">
                              {formatWon(activeQuote.totalAmount)}
                            </span>
                            <span className="text-[10px] text-zinc-550">번호: {activeQuote.id}</span>
                          </div>
                        </div>

                        {/* 추가 금액 조절 입력창 */}
                        <div className="rounded-2xl border border-zinc-100 bg-zinc-50/30 p-4 dark:border-zinc-850 dark:bg-zinc-950/20">
                          <h4 className="text-[11px] font-bold text-zinc-500 mb-2">
                            현장 방문 후 실측 추가 금액 입력 (2차 견적)
                          </h4>

                          <div className="space-y-3">
                            <div>
                              <label className="text-[10px] font-bold text-zinc-400 block mb-1">추가 금액 설정 (원)</label>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => setAdditionalAmount(0)}
                                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold cursor-pointer transition ${
                                    additionalAmount === 0
                                      ? "border-blue-600 bg-blue-50 text-blue-600 dark:bg-blue-950/40"
                                      : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
                                  }`}
                                >
                                  추가금 없음
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setAdditionalAmount(30000)}
                                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold cursor-pointer transition ${
                                    additionalAmount === 30000
                                      ? "border-blue-600 bg-blue-50 text-blue-600 dark:bg-blue-950/40"
                                      : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
                                  }`}
                                >
                                  +3만원
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setAdditionalAmount(100000)}
                                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold cursor-pointer transition ${
                                    additionalAmount === 100000
                                      ? "border-blue-600 bg-blue-50 text-blue-600 dark:bg-blue-950/40"
                                      : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
                                  }`}
                                >
                                  +10만원
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setAdditionalAmount(300000)}
                                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold cursor-pointer transition ${
                                    additionalAmount === 300000
                                      ? "border-blue-600 bg-blue-50 text-blue-600 dark:bg-blue-950/40"
                                      : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
                                  }`}
                                >
                                  +30만원
                                </button>
                              </div>
                              <input
                                type="number"
                                value={additionalAmount}
                                onChange={(e) => setAdditionalAmount(Number(e.target.value))}
                                placeholder="직접 추가금 입력"
                                className="w-full mt-2 rounded-xl border border-zinc-200 bg-white py-2 px-3 text-xs font-bold text-zinc-800 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-zinc-400 block mb-1">현장 추가 상세 사유</label>
                              <textarea
                                value={additionalReason}
                                onChange={(e) => setAdditionalReason(e.target.value)}
                                placeholder="예: 베란다 다용도실 곰팡이 오염이 예상보다 심각하여 약품 처리 비용 추가 발생"
                                rows={3}
                                className="w-full rounded-xl border border-zinc-200 bg-white py-2 px-3 text-xs font-medium text-zinc-800 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                              />
                            </div>
                          </div>
                        </div>

                        {/* 최종 합계 계산결과 피드백 */}
                        <div className="rounded-2xl bg-zinc-900 p-4 text-white dark:bg-white dark:text-zinc-950 shadow-md">
                          <div className="flex justify-between items-center text-xs opacity-80 border-b border-white/10 pb-2 mb-2 dark:border-zinc-200">
                            <span>기본 계약금액</span>
                            <span>{formatWon(activeQuote.totalAmount)}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs opacity-80 border-b border-white/10 pb-2 mb-2 dark:border-zinc-200">
                            <span>현장 추가금액</span>
                            <span className="text-amber-400 font-bold dark:text-blue-600">
                              + {formatWon(additionalAmount)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold">최종 확정 견적금액</span>
                            <span className="text-lg font-black text-blue-400 dark:text-blue-600">
                              {formatWon(activeQuote.totalAmount + additionalAmount)}
                            </span>
                          </div>
                        </div>

                        {/* 확정 버튼 */}
                        <button
                          type="button"
                          onClick={handleFinalConfirm}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-md transition hover:bg-emerald-700 active:scale-[0.99] cursor-pointer"
                        >
                          <Check className="h-4 w-4" />
                          최종 견적서 확정 및 현장 DB 전송
                        </button>

                        {isFinalConfirmed && (
                          <div className="rounded-2xl border border-emerald-105 bg-emerald-50/30 p-4 text-xs dark:border-emerald-950/20 animate-[fade-in_0.3s_ease-out]">
                            <p className="font-bold text-emerald-700 dark:text-emerald-400">
                              🎉 완료되었습니다!
                            </p>
                            <p className="mt-1 text-zinc-550">
                              현장 DB 탭에서 기록을 모니터링할 수 있으며, 의뢰인에게 최종 현장 견적서가 PDF/웹 형태로 발송된 상태로 설정되었습니다.
                            </p>
                            <button
                              type="button"
                              onClick={() => setActiveTab("db")}
                              className="mt-2 text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                            >
                              실시간 DB 대시보드로 이동 →
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-400">
                        <AlertTriangle className="h-8 w-8 text-zinc-300 mb-2" />
                        <p className="text-xs font-semibold">배정된 매칭 정보가 없습니다.</p>
                        <span className="text-[10px] mt-1">
                          2단계 탭에서 먼저 견적서를 불러오고 파트너 배정을 끝내주세요.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 오른쪽: 견적서 모크업 (lg: 5칸) */}
            <div className="lg:col-span-5">
              <div className="sticky top-24">
                <div className="flex items-center justify-between mb-3.5">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                    Realtime Quote Preview
                  </h4>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => {
                        window.print();
                      }}
                      title="페이지 인쇄"
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 cursor-pointer"
                    >
                      <Printer className="h-3.5 w-3.5" />
                    </button>
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-600 dark:bg-blue-950/40">
                      자동 생성 양식
                    </span>
                  </div>
                </div>

                {/* 견적서 종이 질감 모크업 */}
                <div
                  className={`relative rounded-3xl border border-zinc-250 bg-white p-6 shadow-xl transition-all duration-300 dark:border-zinc-800 dark:bg-zinc-900/90 ${
                    printAnimation ? "scale-[1.02] shadow-[0_20px_40px_rgba(37,99,235,0.15)]" : ""
                  }`}
                  style={{
                    backgroundImage: "radial-gradient(#2563EB05 1px, transparent 1px)",
                    backgroundSize: "20px 20px"
                  }}
                >
                  {/* 상단 장식 구멍 효과 (영수증 느낌) */}
                  <div className="absolute top-0 left-6 right-6 flex justify-between -translate-y-1">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="h-2 w-2 rounded-full bg-zinc-50 dark:bg-zinc-950" />
                    ))}
                  </div>

                  <div className="mt-2 text-center animate-[fade-in_0.3s_ease-out]">
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
                      CHG CLEANING ESTIMATE
                    </span>
                    <h2 className="mt-1 text-xl font-black text-zinc-950 dark:text-zinc-50">
                      {currentCategory.label} 견적서
                    </h2>
                    <p className="mt-1 text-[9px] font-mono text-zinc-400">
                      NO. {activeQuote?.id || quoteNumber}
                    </p>
                  </div>

                  {/* 세부 인적 사항 */}
                  <div className="mt-5 border-t-2 border-dashed border-zinc-200 pt-4 text-xs space-y-2 dark:border-zinc-800">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">발행 일자 :</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-250">
                        {activeQuote?.createdAt ? activeQuote.createdAt.split(" ")[0] : (mounted ? new Date().toLocaleDateString() : "")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">고 객 명 :</span>
                      <span className="font-bold text-zinc-800 dark:text-zinc-250">
                        {activeQuote?.name || clientName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">연 락 처 :</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-250">
                        {activeQuote?.phone || phone}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">현장 주소 :</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-250 truncate max-w-[180px]">
                        {activeQuote?.address || address}
                      </span>
                    </div>
                  </div>

                  {/* 내역 명세표 */}
                  <div className="mt-5 border-t border-zinc-150 pt-4 dark:border-zinc-800">
                    <span className="text-[10px] font-bold text-zinc-400 block mb-2">세부 명세 내역</span>
                    <div className="space-y-2.5">
                      {/* 기본 청소금액 */}
                      <div className="flex justify-between items-start text-xs text-zinc-800 dark:text-zinc-250">
                        <div>
                          <p className="font-bold">기본 {currentCategory.label}</p>
                          <span className="text-[10px] text-zinc-400">{areaSize}평 x {currentCategory.pricePerPyung.toLocaleString()}원</span>
                        </div>
                        <span className="font-bold">{formatWon(baseAmount)}</span>
                      </div>

                      {/* 추가 옵션들 */}
                      {activeTab === "client" ? (
                        Object.entries(selectedOptions).map(([optKey, qty]) => {
                          const opt = currentCategory.options.find((o) => o.key === optKey);
                          if (!opt) return null;
                          return (
                            <div key={opt.key} className="flex justify-between items-start text-xs text-zinc-800 dark:text-zinc-250 animate-in fade-in duration-200">
                              <div>
                                <p className="font-medium text-zinc-700 dark:text-zinc-300">└ {opt.label}</p>
                                {opt.type === "number" && (
                                  <span className="text-[9px] text-zinc-400">수량: {qty}개</span>
                                )}
                              </div>
                              <span className="font-semibold">{formatWon(opt.price * qty)}</span>
                            </div>
                          );
                        })
                      ) : (
                        activeQuote?.optionsList.map((opt, i) => (
                          <div key={i} className="flex justify-between items-start text-xs text-zinc-800 dark:text-zinc-250">
                            <div>
                              <p className="font-medium text-zinc-700 dark:text-zinc-300">└ {opt.label}</p>
                              {opt.qty > 1 && (
                                <span className="text-[9px] text-zinc-400">수량: {opt.qty}개</span>
                              )}
                            </div>
                            <span className="font-semibold">{formatWon(opt.price * opt.qty)}</span>
                          </div>
                        ))
                      )}

                      {/* 2차 현장 추가금액 (현장접수/프로 탭일 때 노출) */}
                      {(activeTab === "platform" || activeTab === "pro") && additionalAmount > 0 && (
                        <div className="flex justify-between items-start border-t border-dashed border-zinc-150 pt-2.5 text-xs text-zinc-850 dark:text-zinc-200 animate-in slide-in-from-bottom-2 duration-300">
                          <div>
                            <p className="font-bold text-amber-600 dark:text-amber-450">[현장방문 실측 추가비용]</p>
                            <p className="text-[9px] text-zinc-400 truncate max-w-[200px]" title={additionalReason}>
                              사유: {additionalReason}
                            </p>
                          </div>
                          <span className="font-extrabold text-amber-600 dark:text-amber-450">
                            + {formatWon(additionalAmount)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 합계 */}
                  <div className="mt-5 border-t-2 border-dashed border-zinc-200 pt-4 dark:border-zinc-800">
                    <div className="flex justify-between items-end">
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">최종 청구 금액</span>
                      <div className="text-right">
                        {additionalAmount > 0 && (activeTab === "platform" || activeTab === "pro") ? (
                          <>
                            <span className="text-[10px] line-through text-zinc-400 block">
                              {formatWon(activeQuote?.totalAmount || totalAmount)}
                            </span>
                            <span className="text-xl font-black text-blue-600 dark:text-blue-400">
                              {formatWon((activeQuote?.totalAmount || totalAmount) + additionalAmount)}
                            </span>
                          </>
                        ) : (
                          <span className="text-xl font-black text-blue-600 dark:text-blue-400">
                            {formatWon(totalAmount)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 하단 면책 및 홍보 텍스트 (VBA 엑셀 필수 구현사항) */}
                  <div className="mt-6 border-t border-zinc-100 pt-4 text-center dark:border-zinc-850">
                    <p className="text-[10px] font-bold text-blue-700 bg-blue-50/50 py-1.5 rounded-lg dark:text-blue-450 dark:bg-blue-950/20">
                      ✨ 청광과 함께 하시면 청소후 사업장 홍보까지 이어집니다.
                    </p>
                    <p className="mt-2 text-[9px] leading-4 text-zinc-400 text-left">
                      ※ 본 견적서는 방문 전 기본 사항을 바탕으로 작성된 것으로 현장 상태에 따라 실제 금액과 달라질 수 있습니다.
                    </p>
                  </div>

                  {/* 담당 확인 인감 마크 (인쇄 스타일) */}
                  <div className="mt-5 flex justify-end items-center gap-2">
                    <span className="text-[9px] text-zinc-400 font-bold">청광 플랫폼 담당자</span>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-red-500 text-[9px] font-extrabold text-red-500 rotate-[-12deg] shadow-inner select-none bg-white">
                      확인
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* 4단계: DB 대시보드 뷰어 */
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-855 dark:bg-zinc-900">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-zinc-100 pb-5 dark:border-zinc-850">
                <div className="flex items-center gap-2">
                  <Database className="h-5.5 w-5.5 text-blue-600" />
                  <div>
                    <h3 className="font-bold text-zinc-900 dark:text-white">
                      청광 가상 데이터베이스 실시간 모니터
                    </h3>
                    <p className="text-xs text-zinc-400">
                      로컬 스토리지에 동기화되는 고객 DB 및 현장 견적 완료 데이터를 조회합니다.
                    </p>
                  </div>
                </div>
                
                {/* 검색 필터 */}
                <div className="relative w-full max-w-xs shrink-0">
                  <Search className="absolute top-2.5 left-3 h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    value={dbSearchTerm}
                    onChange={(e) => setDbSearchTerm(e.target.value)}
                    placeholder="고객명, 견적번호, 주소 검색"
                    className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-4 text-xs font-semibold text-zinc-800 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </div>
              </div>

              {/* 고객 DB 테이블 */}
              <div className="mt-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    1차 고객 DB 목록 ({filteredCustomerDB.length}건)
                  </h4>
                </div>

                <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50 font-bold text-zinc-500 dark:border-zinc-850 dark:bg-zinc-950">
                        <th className="p-3">견적 번호</th>
                        <th className="p-3">고객명</th>
                        <th className="p-3">연락처</th>
                        <th className="p-3">현장 주소</th>
                        <th className="p-3">청소종류</th>
                        <th className="p-3 text-right">평수</th>
                        <th className="p-3 text-right">기본견적가</th>
                        <th className="p-3">진행 상태</th>
                        <th className="p-3">생성 일시</th>
                        <th className="p-3 text-center">액션</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomerDB.length > 0 ? (
                        filteredCustomerDB.map((q) => (
                          <tr
                            key={q.id}
                            className="border-b border-zinc-150 hover:bg-zinc-50/50 dark:border-zinc-850 dark:hover:bg-zinc-950/40"
                          >
                            <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">{q.id}</td>
                            <td className="p-3 font-bold">{q.name}</td>
                            <td className="p-3">{q.phone}</td>
                            <td className="p-3 truncate max-w-[150px]" title={q.address}>{q.address}</td>
                            <td className="p-3 font-medium">{q.cleanTypeLabel}</td>
                            <td className="p-3 text-right font-semibold">{q.areaSize}평</td>
                            <td className="p-3 text-right font-bold">{formatWon(q.totalAmount)}</td>
                            <td className="p-3">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  q.status === "completed"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
                                    : q.status === "matched"
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400"
                                    : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-400"
                                }`}
                              >
                                {q.status === "completed"
                                  ? "최종확정"
                                  : q.status === "matched"
                                  ? "현장접수완료"
                                  : "기본견적제출"}
                              </span>
                            </td>
                            <td className="p-3 text-zinc-400">{q.createdAt}</td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => {
                                    handleLoadQuote(q.id);
                                    setActiveTab("platform");
                                  }}
                                  className="rounded bg-zinc-100 px-2 py-1 text-[10px] font-semibold text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 cursor-pointer"
                                >
                                  불러오기
                                </button>
                                <button
                                  onClick={() => handleDeleteCustomerQuote(q.id)}
                                  className="rounded bg-red-50 p-1 text-red-655 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 cursor-pointer"
                                  title="삭제"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={10} className="p-8 text-center text-zinc-400">
                            저장된 고객 견적이 존재하지 않습니다. 1단계에서 견적을 저장해주세요.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 현장 DB 테이블 */}
              <div className="mt-8">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    2차 현장 DB 목록 ({fieldDB.length}건)
                  </h4>
                </div>

                <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50 font-bold text-zinc-500 dark:border-zinc-850 dark:bg-zinc-950">
                        <th className="p-3">견적 번호</th>
                        <th className="p-3">고객명</th>
                        <th className="p-3">배정 청소업체</th>
                        <th className="p-3 text-right">1차기본금액</th>
                        <th className="p-3 text-right text-amber-600 dark:text-amber-400">추가금액</th>
                        <th className="p-3">추가 사유 내역</th>
                        <th className="p-3 text-right text-emerald-600 dark:text-emerald-400">최종확정금액</th>
                        <th className="p-3">처리 일시</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fieldDB.length > 0 ? (
                        fieldDB.map((f) => (
                          <tr
                            key={f.id}
                            className="border-b border-zinc-150 hover:bg-zinc-50/50 dark:border-zinc-850 dark:hover:bg-zinc-950/40"
                          >
                            <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">{f.id}</td>
                            <td className="p-3 font-bold">{f.customerName}</td>
                            <td className="p-3 font-semibold text-zinc-700 dark:text-zinc-300">{f.proName}</td>
                            <td className="p-3 text-right">{formatWon(f.baseAmount)}</td>
                            <td className="p-3 text-right font-bold text-amber-600 dark:text-amber-400">
                              + {formatWon(f.additionalAmount)}
                            </td>
                            <td className="p-3 truncate max-w-[200px]" title={f.reason}>{f.reason}</td>
                            <td className="p-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400">
                              {formatWon(f.finalAmount)}
                            </td>
                            <td className="p-3 text-zinc-400">{f.createdAt}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-zinc-400">
                            최종 확정된 현장 방문 견적 내역이 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
