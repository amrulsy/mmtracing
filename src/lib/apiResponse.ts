/** Parse API responses without exposing proxy HTML/text as a JSON syntax error. */
export async function readApiJson<T = Record<string, unknown>>(res: Response): Promise<T> {
  try {
    const data: unknown = await res.json();
    if (data === null || typeof data !== 'object') throw new Error('Invalid API response');
    return data as T;
  } catch {
    const message = res.status >= 500
      ? `Layanan server sedang bermasalah (HTTP ${res.status}). Silakan coba lagi atau hubungi admin.`
      : `Respons server tidak valid (HTTP ${res.status}). Silakan coba lagi.`;
    throw new ApiError(message, res.status);
  }
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}
