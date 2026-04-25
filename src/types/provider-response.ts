export type ProviderResponseStatus = "passed" | "quoted";

export interface ProviderResponse {
  /** composite id `${providerId}_${requestId}` */
  id: string;
  providerId: string;
  requestId: string;
  status: ProviderResponseStatus;
  respondedAt: Date;
}

export function buildProviderResponseId(
  providerId: string,
  requestId: string,
): string {
  return `${providerId}_${requestId}`;
}
