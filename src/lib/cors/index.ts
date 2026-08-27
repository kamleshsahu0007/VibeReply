const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

export function corsHeaders(methods: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": `${methods}, OPTIONS`,
    "Access-Control-Allow-Headers": "Content-Type, X-Device-Id",
  };
}
