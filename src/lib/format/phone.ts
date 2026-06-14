/**
 * Converts a Korean phone number format to E.164 format for Firebase Phone Auth.
 * E.g., "010-1234-5678" -> "+821012345678"
 */
export function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("010") && digits.length === 11) {
    return `+8210${digits.slice(3)}`;
  }
  if (digits.startsWith("8210") && digits.length === 12) {
    return `+${digits}`;
  }
  return `+${digits}`;
}

/**
 * Converts E.164 formatted Korean phone number to 010-XXXX-XXXX format.
 * E.g., "+821012345678" -> "010-1234-5678"
 */
export function fromE164(phone: string): string {
  if (phone.startsWith("+8210") && phone.length === 13) {
    const rest = phone.slice(5); // "12345678"
    return `010-${rest.slice(0, 4)}-${rest.slice(4)}`;
  }
  if (phone.startsWith("8210") && phone.length === 12) {
    const rest = phone.slice(4); // "12345678"
    return `010-${rest.slice(0, 4)}-${rest.slice(4)}`;
  }
  return phone;
}

