import { normalizeParams, type ModelParams } from "./model/types";

/** Encode des params en token base64url stable. */
export function encodeToken(params: ModelParams): string {
  const json = JSON.stringify(params);
  if (typeof window === "undefined") return Buffer.from(json, "utf8").toString("base64url");
  return base64urlFromString(json);
}

export function decodeToken(token: string): ModelParams {
  const json = typeof window === "undefined"
    ? Buffer.from(token, "base64url").toString("utf8")
    : stringFromBase64url(token);
  const obj = JSON.parse(json);
  return normalizeParams(obj);
}

function base64urlFromString(s: string): string {
  // btoa requires latin1; use TextEncoder + manual base64
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const b64 = btoa(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function stringFromBase64url(t: string): string {
  const b64 = t.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((t.length + 3) % 4);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}
