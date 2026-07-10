"use client";

import React, { useState } from "react";
import { CLEANING_CATEGORIES } from "@/domain/cleaning-data";

export default function QuotationPage() {
  const [customerName, setCustomerName] = useState("");
  const [cleaningCategory, setCleaningCategory] = useState("move-in");
  const [basePrice, setBasePrice] = useState("");
  const [memo, setMemo] = useState("");

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-8 flex items-center justify-between no-print">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">간편 견적서 발급</h1>
        <button
          onClick={handlePrint}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          인쇄 / PDF 저장
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-2 no-print mb-8">
        {/* 입력 폼 */}
        <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-bold">견적 정보 입력</h2>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">고객명/상호</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="홍길동"
              className="w-full rounded-md border border-zinc-300 bg-transparent p-2 outline-none dark:border-zinc-700"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">청소 종류</label>
            <select
              value={cleaningCategory}
              onChange={(e) => setCleaningCategory(e.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-transparent p-2 outline-none dark:border-zinc-700"
            >
              {Object.values(CLEANING_CATEGORIES).map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">총 견적 금액</label>
            <input
              type="number"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              placeholder="0"
              className="w-full rounded-md border border-zinc-300 bg-transparent p-2 outline-none dark:border-zinc-700"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">메모 및 주의사항</label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="특이사항 입력"
              rows={3}
              className="w-full rounded-md border border-zinc-300 bg-transparent p-2 outline-none dark:border-zinc-700"
            />
          </div>
        </div>
        
        {/* 설명 및 안내 */}
        <div className="rounded-xl bg-blue-50 p-6 dark:bg-blue-900/20">
          <h3 className="mb-2 font-bold text-blue-800 dark:text-blue-300">이용 안내</h3>
          <ul className="list-inside list-disc space-y-2 text-sm text-blue-700 dark:text-blue-400">
            <li>입력한 내용은 아래 인쇄용 견적서에 실시간 반영됩니다.</li>
            <li>우측 상단의 "인쇄 / PDF 저장" 버튼을 눌러 고객에게 전달할 견적서를 만드세요.</li>
            <li>인쇄 창에서 'PDF로 저장' 옵션을 선택하여 전자문서로 보관하실 수 있습니다.</li>
          </ul>
        </div>
      </div>

      {/* 인쇄용 견적서 프리뷰 */}
      <div className="print-section min-h-[297mm] w-full max-w-[210mm] bg-white p-12 text-black shadow-lg mx-auto border border-zinc-200">
        <div className="mb-12 border-b-2 border-black pb-4 text-center">
          <h1 className="text-3xl font-extrabold tracking-widest">견 적 서</h1>
        </div>

        <div className="mb-12 flex justify-between">
          <div className="w-1/2 pr-8">
            <div className="mb-2 flex border-b border-zinc-300 pb-1">
              <span className="w-24 font-bold">수신:</span>
              <span>{customerName || "고객"} 님 귀하</span>
            </div>
            <div className="mb-2 flex border-b border-zinc-300 pb-1">
              <span className="w-24 font-bold">일자:</span>
              <span>{new Date().toLocaleDateString()}</span>
            </div>
            <div className="mt-8">
              <p className="text-sm">아래와 같이 견적합니다.</p>
            </div>
          </div>
          <div className="w-1/2 rounded border border-black p-4 text-sm">
            <div className="mb-1 flex"><span className="w-16 font-bold">공급자</span><span>청광 파트너</span></div>
            <div className="mb-1 flex"><span className="w-16 font-bold">연락처</span><span>010-0000-0000</span></div>
            <div className="flex"><span className="w-16 font-bold">주소</span><span>서울시 </span></div>
          </div>
        </div>

        <div className="mb-12">
          <table className="w-full border-collapse border border-black text-sm">
            <thead className="bg-zinc-100">
              <tr>
                <th className="border border-black p-2">품목 / 청소종류</th>
                <th className="border border-black p-2">수량</th>
                <th className="border border-black p-2">단가</th>
                <th className="border border-black p-2">금액</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-2 text-center">{CLEANING_CATEGORIES[cleaningCategory]?.label || "청소 서비스"}</td>
                <td className="border border-black p-2 text-center">1</td>
                <td className="border border-black p-2 text-right">{Number(basePrice).toLocaleString()} 원</td>
                <td className="border border-black p-2 text-right">{Number(basePrice).toLocaleString()} 원</td>
              </tr>
              {/* 추가 행을 위한 빈 칸 */}
              <tr>
                <td className="border border-black p-2">&nbsp;</td>
                <td className="border border-black p-2">&nbsp;</td>
                <td className="border border-black p-2">&nbsp;</td>
                <td className="border border-black p-2">&nbsp;</td>
              </tr>
              <tr>
                <td className="border border-black p-2">&nbsp;</td>
                <td className="border border-black p-2">&nbsp;</td>
                <td className="border border-black p-2">&nbsp;</td>
                <td className="border border-black p-2">&nbsp;</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <th colSpan={3} className="border border-black bg-zinc-100 p-2 text-center">합 계</th>
                <th className="border border-black bg-zinc-100 p-2 text-right text-lg">{Number(basePrice).toLocaleString()} 원</th>
              </tr>
            </tfoot>
          </table>
        </div>

        {memo && (
          <div className="mb-8 rounded border border-zinc-300 p-4 text-sm">
            <h3 className="mb-2 font-bold">특이사항 및 메모</h3>
            <p className="whitespace-pre-wrap">{memo}</p>
          </div>
        )}

        <div className="mt-16 text-center text-sm text-zinc-500">
          <p>이 견적서는 발행일로부터 14일간 유효합니다.</p>
        </div>
      </div>
      
      {/* 인쇄용 CSS 추가 */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .no-print {
            display: none !important;
          }
          .print-section, .print-section * {
            visibility: visible;
          }
          .print-section {
            position: absolute;
            left: 0;
            top: 0;
            margin: 0 !important;
            padding: 20px !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}} />
    </div>
  );
}
