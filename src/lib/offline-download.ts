import { isPro } from "@/lib/variant";

export type OfflineDownloadStatus = "queued" | "downloading" | "completed" | "failed" | "deleted";

export interface OfflineDownloadRecord {
  id: string;
  title: string;
  url: string;
  size: number;
  downloaded: number;
  status: OfflineDownloadStatus;
  createdAt: string;
  updatedAt: string;
  mimeType: string;
  path: string;
  checksum: string;
}

const STORAGE_KEY = "flixcasa_pro_downloads_v1";
const APP_DOWNLOAD_KEY = (process.env.NEXT_PUBLIC_DOWNLOAD_KEY || "FlixCasa-Pro-Offline-Key").trim();

function xorCipher(input: Uint8Array, key: string): Uint8Array {
  const bytes = new Uint8Array(input);
  const code = key.split("").map((char) => char.charCodeAt(0));
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] ^= code[i % code.length];
  }
  return bytes;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80) || "download";
}

function safeMimeType(value: string | null | undefined) {
  return value && value.includes("/") ? value : "application/octet-stream";
}

export function canUseProDownloads(): boolean {
  return isPro;
}

export function isLikelyVideoMime(mimeType: string): boolean {
  const cleaned = mimeType.toLowerCase();
  return cleaned.includes("video/") || cleaned.includes("application/vnd.apple.mpegurl") || cleaned.includes("application/x-mpegurl");
}

export function scanDownloadBlob(blob: Blob): Promise<boolean> {
  return (async () => {
    const mimeType = safeMimeType(blob.type || "application/octet-stream");
    if (!isLikelyVideoMime(mimeType)) return false;
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer.slice(0, 256));
    const header = Array.from(bytes.slice(0, 16)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
    const suspicious = [
      "4d5a00",
      "7f454c46",
      "504b0304",
      "#!/bin",
      "3c3f786d6c",
      "<script",
      "powershell",
      "chmod",
      "#!/usr/bin/env",
    ];
    const combined = bytes.join("").toLowerCase();
    if (suspicious.some((marker) => header.includes(marker) || combined.includes(marker))) return false;
    return true;
  })();
}

export async function listDownloadRecords(): Promise<OfflineDownloadRecord[]> {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OfflineDownloadRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveDownloadRecords(records: OfflineDownloadRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export async function deleteDownloadRecordById(id: string) {
  const records = await listDownloadRecords();
  const next = records.filter((record) => record.id !== id);
  await saveDownloadRecords(next);
}

export async function downloadProMedia(url: string, title: string): Promise<{ ok: boolean; record?: OfflineDownloadRecord; error?: string }> {
  if (!canUseProDownloads()) {
    return { ok: false, error: "Pro-only download feature is disabled for this build variant." };
  }

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return { ok: false, error: `Server rejected the download request (${response.status}).` };
    }

    const blob = await response.blob();
    const isSafe = await scanDownloadBlob(blob);
    if (!isSafe) {
      return { ok: false, error: "Rejected: suspicious or non-video payload detected." };
    }

    const mimeType = safeMimeType(blob.type || response.headers.get("content-type"));
    const fileBytes = new Uint8Array(await blob.arrayBuffer());
    const encrypted = xorCipher(fileBytes, APP_DOWNLOAD_KEY);
    const safeTitle = slugify(title || "download");
    const id = `${Date.now()}-${safeTitle}`;
    const staged: OfflineDownloadRecord = {
      id,
      title,
      url,
      size: encrypted.length,
      downloaded: encrypted.length,
      status: "completed",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mimeType,
      path: `offline_downloads/${safeTitle}.fcp`,
      checksum: Array.from(encrypted.slice(0, 32)).map((byte) => byte.toString(16).padStart(2, "0")).join(""),
    };

    const records = await listDownloadRecords();
    await saveDownloadRecords([staged, ...records]);
    return { ok: true, record: staged };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Download failed." };
  }
}
