import { Injectable } from "@nestjs/common";
import { createElement } from "react";
import type { AccessTokenPayload, CreateOfferLetterInput } from "@taga-crm/shared";
import { PrismaService } from "../prisma/prisma.service";
import { CandidatesService } from "../candidates/candidates.service";

/**
 * Font mặc định của PDFKit (Helvetica...) không có dấu tiếng Việt — phải
 * đăng ký font Unicode riêng. Dùng NotoSans tải từ repo chính thức của Google
 * Fonts trên GitHub (ổn định, không cần bundle file binary trong repo).
 */
const VIETNAMESE_FONT_URL =
  "https://raw.githubusercontent.com/google/fonts/main/ofl/notosans/NotoSans%5Bwdth%2Cwght%5D.ttf";

@Injectable()
export class OfferLetterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly candidatesService: CandidatesService,
  ) {}

  async generate(
    viewer: AccessTokenPayload,
    candidateId: string,
    input: CreateOfferLetterInput,
  ): Promise<{ buffer: Buffer; filename: string }> {
    await this.candidatesService.assertCandidateVisible(viewer, candidateId);
    const candidate = await this.prisma.candidate.findUniqueOrThrow({
      where: { id: candidateId },
    });

    const { Document, Font, Page, StyleSheet, Text, View, renderToBuffer } =
      await import("@react-pdf/renderer");

    Font.register({ family: "NotoSans", src: VIETNAMESE_FONT_URL });

    const styles = StyleSheet.create({
      page: { padding: 48, fontFamily: "NotoSans", fontSize: 11, lineHeight: 1.5 },
      header: { textAlign: "center", marginBottom: 24 },
      companyName: { fontSize: 16, fontWeight: 700, marginBottom: 4 },
      title: { fontSize: 18, fontWeight: 700, textAlign: "center", marginVertical: 20 },
      paragraph: { marginBottom: 10 },
      label: { fontWeight: 700 },
      row: { flexDirection: "row", marginBottom: 6 },
      rowLabel: { width: 160, fontWeight: 700 },
      signatureBlock: { marginTop: 56, flexDirection: "row", justifyContent: "space-between" },
      signatureCol: { width: 220, textAlign: "center" },
    });

    const formattedDate = new Date(input.startDate).toLocaleDateString("vi-VN");
    const today = new Date().toLocaleDateString("vi-VN");

    const fieldRow = (label: string, value: string) =>
      createElement(
        View,
        { style: styles.row },
        createElement(Text, { style: styles.rowLabel }, label),
        createElement(Text, {}, value),
      );

    const doc = createElement(
      Document,
      {},
      createElement(
        Page,
        { size: "A4", style: styles.page },
        createElement(
          View,
          { style: styles.header },
          createElement(Text, { style: styles.companyName }, input.companyName),
          createElement(Text, {}, `Ngày ${today}`),
        ),
        createElement(Text, { style: styles.title }, "THƯ MỜI NHẬN VIỆC"),
        createElement(Text, { style: styles.paragraph }, `Kính gửi: ${candidate.fullName}`),
        createElement(
          Text,
          { style: styles.paragraph },
          `${input.companyName} trân trọng thông báo bạn đã được lựa chọn cho vị trí dưới đây. ` +
            "Chi tiết đề nghị làm việc như sau:",
        ),
        fieldRow("Vị trí công việc:", input.position),
        fieldRow("Mức lương:", input.salary),
        fieldRow("Ngày bắt đầu:", formattedDate),
        ...(input.probationPeriod ? [fieldRow("Thời gian thử việc:", input.probationPeriod)] : []),
        ...(input.workLocation ? [fieldRow("Địa điểm làm việc:", input.workLocation)] : []),
        ...(input.notes ? [createElement(Text, { style: styles.paragraph }, input.notes)] : []),
        createElement(
          Text,
          { style: styles.paragraph },
          "Vui lòng phản hồi xác nhận trong vòng 3 ngày làm việc kể từ ngày nhận thư này. " +
            "Chúng tôi rất mong được chào đón bạn vào đội ngũ.",
        ),
        createElement(
          View,
          { style: styles.signatureBlock },
          createElement(
            View,
            { style: styles.signatureCol },
            createElement(Text, {}, "Ứng viên xác nhận"),
            createElement(Text, { style: { marginTop: 48 } }, "_______________________"),
          ),
          createElement(
            View,
            { style: styles.signatureCol },
            createElement(Text, {}, `Đại diện ${input.companyName}`),
            createElement(Text, { style: { marginTop: 48 } }, "_______________________"),
          ),
        ),
      ),
    );

    const buffer = await renderToBuffer(doc);
    // Content-Disposition header chỉ chấp nhận ASCII — tên ứng viên tiếng Việt
    // (có dấu) không đặt thẳng vào header được, dùng đường mã hoá RFC 5987
    // (filename* UTF-8) ở controller, filename ở đây chỉ cần để hiển thị gợi ý.
    const filename = `offer-letter-${candidate.fullName.replace(/\s+/g, "-")}.pdf`;
    return { buffer: Buffer.from(buffer), filename };
  }
}
