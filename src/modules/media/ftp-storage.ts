import { Readable } from "node:stream";
import path from "node:path";
import { unlink } from "node:fs/promises";
import { Client } from "basic-ftp";
import { env } from "@/lib/env";

export class MediaStorageUnavailableError extends Error {
  constructor(message = "Media storage is unavailable", options?: ErrorOptions) {
    super(message, options);
    this.name = "MediaStorageUnavailableError";
  }
}

function assertFtpConfigured() {
  if (!env.FTP_HOST || !env.FTP_USERNAME || !env.FTP_PASSWORD || !env.FTP_PUBLIC_BASE_URL) {
    throw new Error("FTP media storage is not configured");
  }
}

async function withFtpClient<T>(run: (client: Client) => Promise<T>) {
  try {
    assertFtpConfigured();
  } catch (error) {
    throw new MediaStorageUnavailableError("FTP media storage is not configured", { cause: error });
  }
  const client = new Client(15_000);
  try {
    await client.access({
      host: env.FTP_HOST,
      port: env.FTP_PORT,
      user: env.FTP_USERNAME,
      password: env.FTP_PASSWORD,
      secure: env.FTP_SECURE,
    });
    return await run(client);
  } catch (error) {
    if (error instanceof MediaStorageUnavailableError) throw error;
    throw new MediaStorageUnavailableError("FTP media storage request failed", { cause: error });
  } finally {
    client.close();
  }
}

export function buildFtpPublicUrl(storageKey: string) {
  assertFtpConfigured();
  return `${env.FTP_PUBLIC_BASE_URL.replace(/\/$/, "")}/${storageKey.split("/").map(encodeURIComponent).join("/")}`;
}

export async function uploadMediaToFtp(content: Buffer, storageKey: string) {
  const remoteDirectory = path.posix.dirname(storageKey);
  const fileName = path.posix.basename(storageKey);
  await withFtpClient(async (client) => {
    await client.ensureDir(remoteDirectory);
    await client.uploadFrom(Readable.from(content), fileName);
  });
  return buildFtpPublicUrl(storageKey);
}

export async function deleteStoredMedia(storageKey: string, url: string) {
  if (url.startsWith("/uploads/")) {
    const uploadsRoot = path.resolve(process.cwd(), "public", "uploads");
    const target = path.resolve(uploadsRoot, storageKey);
    if (!target.startsWith(`${uploadsRoot}${path.sep}`)) throw new Error("Invalid local media path");
    await unlink(target).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
    return;
  }

  if (!storageKey.startsWith("zar-shop/")) throw new Error("Invalid FTP media path");
  await withFtpClient(async (client) => {
    try {
      await client.remove(storageKey);
    } catch (error) {
      if (!(typeof error === "object" && error && "code" in error && String(error.code) === "550")) throw error;
    }
  });
}
