import { PrismaClient, Prisma, type FieldType } from "@prisma/client";
import * as argon2 from "argon2";
import {
  PIPELINE_STAGE_SEEDS,
  GENDER_LABELS,
  CANDIDATE_SOURCE_LABELS,
  type FormSchemaShape,
} from "@taga-crm/shared";
import { generateOpaqueToken, sha256Hex } from "../src/common/utils/hash.util";

const prisma = new PrismaClient();

async function seedPipelineStages() {
  for (const stage of PIPELINE_STAGE_SEEDS) {
    await prisma.pipelineStage.upsert({
      where: { key: stage.key },
      update: {
        label: stage.label,
        color: stage.color,
        sortOrder: stage.sortOrder,
        isTerminal: stage.isTerminal,
      },
      create: {
        key: stage.key,
        label: stage.label,
        color: stage.color,
        sortOrder: stage.sortOrder,
        isTerminal: stage.isTerminal,
      },
    });
  }
  console.log(`Đã seed ${PIPELINE_STAGE_SEEDS.length} pipeline stage (Next Step).`);
}

async function seedAdminUser() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@taga.local";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ThayDoiMatKhauNgay123!";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin user "${email}" đã tồn tại, bỏ qua.`);
    return;
  }

  const passwordHash = await argon2.hash(password);
  await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName: "Quản trị hệ thống",
      role: "ADMIN",
      isActive: true,
    },
  });

  console.log(`Đã tạo Admin user: ${email}`);
  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.warn(
      `CẢNH BÁO: dùng mật khẩu mặc định "${password}" — đặt biến môi trường SEED_ADMIN_PASSWORD ` +
        `trước khi seed lên production, và đổi mật khẩu ngay sau lần đăng nhập đầu tiên.`,
    );
  }
}

interface CandidateFieldSeed {
  fieldKey: string;
  label: string;
  fieldType: FieldType;
  width: number;
  isFrozen?: boolean;
  isHidden?: boolean;
  isRequired?: boolean;
  options?: Record<string, unknown>;
}

const selectChoices = (labels: Record<string, string>, colors: string[]) =>
  Object.entries(labels).map(([value, label], index) => ({
    value,
    label,
    color: colors[index % colors.length],
  }));

const GENDER_COLORS = ["#60A5FA", "#F472B6", "#A1A1AA"];
const SOURCE_COLORS = ["#34D399", "#FBBF24", "#818CF8", "#94A3B8", "#A1A1AA"];

/**
 * Bộ field_definitions mặc định cho bảng "candidates" — khớp đúng danh sách
 * "THÔNG TIN ỨNG VIÊN" trong yêu cầu gốc. CV (file đính kèm thật) chưa có ở đây vì
 * cần module upload S3 của Sprint 4 — sẽ thêm field riêng khi đó.
 */
const CANDIDATE_FIELD_SEEDS: CandidateFieldSeed[] = [
  {
    fieldKey: "fullName",
    label: "Tên",
    fieldType: "TEXT",
    width: 200,
    isFrozen: true,
    isRequired: true,
  },
  { fieldKey: "phone", label: "SĐT", fieldType: "PHONE", width: 140 },
  { fieldKey: "email", label: "Email", fieldType: "EMAIL", width: 200 },
  {
    fieldKey: "statusId",
    label: "Next Step",
    fieldType: "SELECT",
    width: 160,
    options: { source: "pipeline_stages" },
  },
  { fieldKey: "nextActionNote", label: "Hành động tiếp theo", fieldType: "TEXT", width: 220 },
  {
    fieldKey: "recruiterId",
    label: "Recruiter phụ trách",
    fieldType: "USER",
    width: 170,
    options: { source: "users" },
  },
  { fieldKey: "dob", label: "Ngày sinh", fieldType: "DATE", width: 130 },
  {
    fieldKey: "gender",
    label: "Giới tính",
    fieldType: "SELECT",
    width: 110,
    options: { choices: selectChoices(GENDER_LABELS, GENDER_COLORS) },
  },
  { fieldKey: "address", label: "Địa chỉ", fieldType: "TEXT", width: 240 },
  { fieldKey: "areaBranch", label: "Khu vực", fieldType: "TEXT", width: 150 },
  { fieldKey: "facebookLink", label: "Link Facebook", fieldType: "LINK", width: 200 },
  {
    fieldKey: "source",
    label: "Nguồn",
    fieldType: "SELECT",
    width: 140,
    options: { choices: selectChoices(CANDIDATE_SOURCE_LABELS, SOURCE_COLORS) },
  },
  { fieldKey: "note", label: "Ghi chú", fieldType: "LONG_TEXT", width: 240 },
  {
    fieldKey: "tags",
    label: "Tags",
    fieldType: "MULTI_SELECT",
    width: 160,
    options: { choices: [] },
  },
  { fieldKey: "createdAt", label: "Ngày tạo", fieldType: "CREATED_TIME", width: 150 },

  // Ẩn theo mặc định — đầy đủ theo yêu cầu nhưng dồn xuống "Tùy chỉnh trường" để Grid gọn.
  { fieldKey: "photoUrl", label: "Ảnh", fieldType: "IMAGE", width: 100, isHidden: true },
  {
    fieldKey: "landingPageId",
    label: "Landing Page",
    fieldType: "RELATION",
    width: 160,
    isHidden: true,
    options: { source: "landing_pages" },
  },
  {
    fieldKey: "firstUtmSource",
    label: "UTM Source",
    fieldType: "TEXT",
    width: 140,
    isHidden: true,
  },
  {
    fieldKey: "firstUtmMedium",
    label: "UTM Medium",
    fieldType: "TEXT",
    width: 140,
    isHidden: true,
  },
  {
    fieldKey: "firstUtmCampaign",
    label: "UTM Campaign",
    fieldType: "TEXT",
    width: 140,
    isHidden: true,
  },
  {
    fieldKey: "firstUtmContent",
    label: "UTM Content",
    fieldType: "TEXT",
    width: 140,
    isHidden: true,
  },
  { fieldKey: "firstUtmTerm", label: "UTM Term", fieldType: "TEXT", width: 140, isHidden: true },
  { fieldKey: "firstIp", label: "IP", fieldType: "TEXT", width: 120, isHidden: true },
  { fieldKey: "firstDevice", label: "Device", fieldType: "TEXT", width: 120, isHidden: true },
  { fieldKey: "firstOs", label: "OS", fieldType: "TEXT", width: 100, isHidden: true },
  { fieldKey: "firstBrowser", label: "Browser", fieldType: "TEXT", width: 120, isHidden: true },
  { fieldKey: "firstReferrer", label: "Referrer", fieldType: "TEXT", width: 200, isHidden: true },
  {
    fieldKey: "updatedAt",
    label: "Ngày cập nhật",
    fieldType: "UPDATED_TIME",
    width: 150,
    isHidden: true,
  },
];

async function seedCandidateFieldDefinitions() {
  for (const [index, field] of CANDIDATE_FIELD_SEEDS.entries()) {
    await prisma.fieldDefinition.upsert({
      where: { tableKey_fieldKey: { tableKey: "candidates", fieldKey: field.fieldKey } },
      update: {
        label: field.label,
        fieldType: field.fieldType,
        width: field.width,
        isFrozen: field.isFrozen ?? false,
        isHidden: field.isHidden ?? false,
        isRequired: field.isRequired ?? false,
        options: (field.options ?? {}) as Prisma.InputJsonValue,
      },
      create: {
        tableKey: "candidates",
        fieldKey: field.fieldKey,
        label: field.label,
        fieldType: field.fieldType,
        width: field.width,
        sortOrder: index,
        isFrozen: field.isFrozen ?? false,
        isHidden: field.isHidden ?? false,
        isRequired: field.isRequired ?? false,
        isSystem: true,
        options: (field.options ?? {}) as Prisma.InputJsonValue,
      },
    });
  }
  console.log(`Đã seed ${CANDIDATE_FIELD_SEEDS.length} field_definitions cho bảng candidates.`);
}

async function seedDefaultViews() {
  const tableKey = "candidates";
  const existing = await prisma.view.findFirst({ where: { tableKey, isDefault: true } });
  if (existing) {
    console.log(`View mặc định cho bảng "${tableKey}" đã tồn tại, bỏ qua.`);
    return;
  }
  await prisma.view.create({
    data: { tableKey, name: "Lưới", type: "GRID", isDefault: true, ownerId: null },
  });
  console.log(`Đã tạo view mặc định "Lưới" cho bảng "${tableKey}".`);
}

const GATE_QUESTION_FIELD_SEEDS: CandidateFieldSeed[] = [
  {
    fieldKey: "gate1",
    label: "Gate 1 — Sẵn sàng thử sức?",
    fieldType: "SELECT",
    width: 160,
    isHidden: true,
    options: {
      choices: [
        { value: "co", label: "Có", color: "#86EFAC" },
        { value: "khong", label: "Không", color: "#FCA5A5" },
      ],
    },
  },
  {
    fieldKey: "gate2",
    label: "Gate 2 — Đã đọc kỹ thông tin?",
    fieldType: "SELECT",
    width: 160,
    isHidden: true,
    options: {
      choices: [
        { value: "co", label: "Đã đọc kỹ", color: "#86EFAC" },
        { value: "khong", label: "Chưa đọc kỹ", color: "#FCA5A5" },
      ],
    },
  },
  {
    fieldKey: "gate3",
    label: "Gate 3 — Quãng đường di chuyển tiện?",
    fieldType: "SELECT",
    width: 160,
    isHidden: true,
    options: {
      choices: [
        { value: "co", label: "Có", color: "#86EFAC" },
        { value: "khong", label: "Không", color: "#FCA5A5" },
      ],
    },
  },
];

async function seedGateQuestionFieldDefinitions() {
  const maxSortOrder = await prisma.fieldDefinition.aggregate({
    where: { tableKey: "candidates" },
    _max: { sortOrder: true },
  });
  let nextSortOrder = (maxSortOrder._max.sortOrder ?? 0) + 1;
  for (const field of GATE_QUESTION_FIELD_SEEDS) {
    await prisma.fieldDefinition.upsert({
      where: { tableKey_fieldKey: { tableKey: "candidates", fieldKey: field.fieldKey } },
      update: {},
      create: {
        tableKey: "candidates",
        fieldKey: field.fieldKey,
        label: field.label,
        fieldType: field.fieldType,
        width: field.width,
        sortOrder: nextSortOrder++,
        isHidden: true,
        isSystem: false,
        options: (field.options ?? {}) as Prisma.InputJsonValue,
      },
    });
  }
  console.log(
    `Đã seed ${GATE_QUESTION_FIELD_SEEDS.length} field_definitions cho câu hỏi gate (Landing Page).`,
  );
}

/**
 * Landing page thật của TAGA (taga.nguyentragiang.vn/sv, host qua Webcake) —
 * migrate từ google-apps-script.gs sang Ingestion API (Sprint 3). Form schema
 * mô tả đúng field thật trong ladipage-tuyendung-taga/webcake-embed-v3.html —
 * trang vẫn dùng HTML tay (không render từ schema này), schema chỉ phục vụ
 * Ingestion Engine (mapsTo) + tài liệu hoá field cho admin.
 */
const TAGA_FORM_SCHEMA: FormSchemaShape = {
  honeypotKey: "website",
  fields: [
    { key: "hoTen", label: "Họ và tên", type: "TEXT", required: true, mapsTo: "fullName" },
    { key: "soDienThoai", label: "Số điện thoại", type: "PHONE", required: true, mapsTo: "phone" },
    { key: "email", label: "Email", type: "EMAIL", required: true, mapsTo: "email" },
    { key: "ngaySinh", label: "Ngày sinh", type: "DATE", required: true, mapsTo: "dob" },
    { key: "diaChi", label: "Địa chỉ", type: "TEXT", required: true, mapsTo: "address" },
    { key: "cv", label: "CV (nếu có)", type: "FILE", mapsTo: "cv" },
    {
      key: "gate1",
      label: "Sẵn sàng thử sức để có thu nhập tốt?",
      type: "SELECT",
      required: true,
      options: ["co", "khong"],
    },
    {
      key: "gate2",
      label: "Đã đọc kỹ thông tin trên web?",
      type: "SELECT",
      required: true,
      options: ["co", "khong"],
    },
    {
      key: "gate3",
      label: "Quãng đường di chuyển có tiện không?",
      type: "SELECT",
      required: true,
      options: ["co", "khong"],
    },
  ],
};

async function seedTagaLandingPage() {
  const slug = "taga-tuyendung-sv";
  const existing = await prisma.landingPage.findUnique({ where: { slug } });
  if (existing) {
    console.log(`Landing Page "${slug}" đã tồn tại, bỏ qua (không tạo lại API key).`);
    return;
  }

  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
  });
  if (!admin) {
    console.warn(
      "Chưa có Admin user — bỏ qua seed Landing Page TAGA (cần seedAdminUser chạy trước).",
    );
    return;
  }

  const rawApiKey = generateOpaqueToken();
  const landingPage = await prisma.landingPage.create({
    data: {
      name: "TAGA Global — Tuyển dụng Sale (SV mới ra trường)",
      slug,
      url: "https://taga.nguyentragiang.vn/sv",
      domain: "taga.nguyentragiang.vn",
      status: "ACTIVE",
      apiKeyHash: sha256Hex(rawApiKey),
      description:
        "Migrate từ Google Apps Script (ladipage-tuyendung-taga/google-apps-script.gs) sang Ingestion API của CRM.",
      createdBy: admin.id,
    },
  });

  await prisma.landingPageForm.create({
    data: {
      landingPageId: landingPage.id,
      version: 1,
      schema: TAGA_FORM_SCHEMA,
      isActive: true,
    },
  });

  console.log(`Đã tạo Landing Page "${landingPage.name}" (slug=${slug}).`);
  console.log(`>>> API KEY (chỉ hiện 1 lần, lưu lại ngay): ${rawApiKey}`);
  console.log(
    `>>> Dùng key này khi cập nhật script.js/webcake-embed*.html — submit URL dạng ` +
      `<API_BASE_URL>/public/landing-pages/${slug}/submit?key=${rawApiKey}`,
  );
}

async function main() {
  await seedPipelineStages();
  await seedAdminUser();
  await seedCandidateFieldDefinitions();
  await seedDefaultViews();
  await seedGateQuestionFieldDefinitions();
  await seedTagaLandingPage();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
