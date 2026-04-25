import type { SectionType } from "./shared";

export interface SectionDefinition {
  type: SectionType;
  order: number;
  required: boolean;
  notes?: string;
}

export interface TemplateProposal {
  proposedStructure: SectionDefinition[];
  diff: string;
  status: "pending" | "approved" | "rejected";
}

export interface JobRecord {
  category: "restaurant" | "salon" | "cafe";
  weekKey: string;
  status: "running" | "completed" | "failed";
  sourceCount: number;
  startedAt: Date;
  finishedAt?: Date;
  errors: Array<{ adapter: string; message: string }>;
}
