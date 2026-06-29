import { BadRequestException, type PipeTransform } from "@nestjs/common";
import type { ZodType, ZodTypeDef } from "zod";

/**
 * Validate request body bằng Zod schema dùng chung với Frontend (packages/shared),
 * thay cho class-validator DTO — giữ đúng 1 nguồn sự thật cho contract API.
 * Input generic = unknown (không phải T) vì 1 số schema dùng .transform() nên
 * input thực tế (vd query string JSON-encoded) khác type output sau validate.
 */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T, ZodTypeDef, unknown>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: "Dữ liệu không hợp lệ",
        errors: result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
    }
    return result.data;
  }
}
