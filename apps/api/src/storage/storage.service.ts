import { Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "crypto";
import { mkdir, readFile, stat, writeFile } from "fs/promises";
import { join, resolve } from "path";

export interface SavedFile {
  key: string;
  sizeBytes: number;
}

/**
 * Lưu file local trên đĩa khi STORAGE_DRIVER=local (dev/staging — chưa có
 * S3/MinIO credential thật). Driver "s3" để dành hoàn thiện ở Sprint 4 khi
 * có bucket thật, tránh giả lập 1 tích hợp chưa thể chạy được.
 */
@Injectable()
export class StorageService {
  private readonly driver: string;
  private readonly rootDir: string;

  constructor(private readonly configService: ConfigService) {
    this.driver = this.configService.get<string>("STORAGE_DRIVER") ?? "local";
    const configuredDir = this.configService.get<string>("STORAGE_LOCAL_DIR") ?? "./uploads";
    this.rootDir = resolve(process.cwd(), configuredDir);
  }

  async saveBuffer(buffer: Buffer, originalFileName: string): Promise<SavedFile> {
    if (this.driver !== "local") {
      throw new InternalServerErrorException(
        "STORAGE_DRIVER=s3 chưa được cấu hình bucket thật (hoàn thiện ở Sprint 4)",
      );
    }
    await mkdir(this.rootDir, { recursive: true });
    const safeName = sanitizeFileName(originalFileName);
    const key = `${randomUUID()}-${safeName}`;
    await writeFile(join(this.rootDir, key), buffer);
    return { key, sizeBytes: buffer.length };
  }

  async readFile(key: string): Promise<Buffer> {
    assertSafeKey(key);
    const filePath = join(this.rootDir, key);
    try {
      await stat(filePath);
    } catch {
      throw new NotFoundException("Không tìm thấy file");
    }
    return readFile(filePath);
  }
}

function sanitizeFileName(fileName: string): string {
  const base = fileName.split(/[/\\]/).pop() ?? "file";
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_");
  return cleaned.slice(-150) || "file";
}

function assertSafeKey(key: string): void {
  if (!key || key.includes("..") || key.includes("/") || key.includes("\\")) {
    throw new NotFoundException("Không tìm thấy file");
  }
}
