export type CashbookEntryType = "income" | "expense";

export interface CashbookEntry {
  id: string;
  providerUid: string;
  date: Date;
  type: CashbookEntryType;
  category: string; // e.g., "청소매출", "인건비", "약품비", "기타"
  amount: number;
  description: string;
  quoteId?: string; // Optional link to a specific quote/job
  createdAt: Date;
  updatedAt: Date;
}
