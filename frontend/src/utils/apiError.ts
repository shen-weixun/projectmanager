import axios from "axios";

export function extractApiErrorMessage(
  error: unknown,
  fallback = "儲存失敗"
): string {
  if (!axios.isAxiosError(error)) {
    return fallback;
  }

  const detail = error.response?.data?.detail;
  if (typeof detail === "object" && detail !== null && "message" in detail) {
    return String((detail as { message: string }).message);
  }
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  const message = error.response?.data?.message;
  if (typeof message === "string" && message.trim()) {
    return message;
  }

  return fallback;
}
