import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from "fs";
import { dirname } from "path";

interface CacheMetadata {
  fetched_at: string;
  ttl_hours: number;
}

interface CacheFile {
  metadata: CacheMetadata;
}

export function readCache<T extends CacheFile>(path: string): T | null {
  try {
    if (!existsSync(path)) return null;
    const text = readFileSync(path, "utf-8");
    const data = JSON.parse(text) as T;
    if (!data.metadata?.fetched_at || !data.metadata?.ttl_hours) return null;
    return data;
  } catch {
    try {
      rmSync(path, { force: true });
    } catch {}
    return null;
  }
}

export function writeCache(path: string, data: unknown): void {
  const dir = dirname(path);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2));
}

export function isCacheValid(cache: CacheFile): boolean {
  const fetchedAt = new Date(cache.metadata.fetched_at).getTime();
  const ttlMs = cache.metadata.ttl_hours * 60 * 60 * 1000;
  return Date.now() - fetchedAt < ttlMs;
}
