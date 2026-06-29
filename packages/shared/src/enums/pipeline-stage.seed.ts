/**
 * Dữ liệu seed mặc định cho bảng pipeline_stages (trường "Next Step").
 * Admin có thể sửa/thêm/xoá sau khi seed — đây chỉ là giá trị khởi tạo
 * theo đúng danh sách nghiệp vụ đã chốt.
 */
export interface PipelineStageSeed {
  key: string;
  label: string;
  color: string;
  sortOrder: number;
  isTerminal: boolean;
}

export const PIPELINE_STAGE_SEEDS: PipelineStageSeed[] = [
  { key: "MOI", label: "Mới", color: "#94A3B8", sortOrder: 1, isTerminal: false },
  { key: "DA_LIEN_HE", label: "Đã liên hệ", color: "#60A5FA", sortOrder: 2, isTerminal: false },
  { key: "KHONG_NGHE_MAY", label: "Không nghe máy", color: "#FCA5A5", sortOrder: 3, isTerminal: false },
  { key: "DA_NHAN_ZALO", label: "Đã nhắn Zalo", color: "#7DD3FC", sortOrder: 4, isTerminal: false },
  { key: "DAT_LICH_PV", label: "Đặt lịch PV", color: "#FCD34D", sortOrder: 5, isTerminal: false },
  { key: "DA_XAC_NHAN", label: "Đã xác nhận", color: "#FDE68A", sortOrder: 6, isTerminal: false },
  { key: "PV_VONG_1", label: "PV vòng 1", color: "#C4B5FD", sortOrder: 7, isTerminal: false },
  { key: "DAU_VONG_1", label: "Đậu vòng 1", color: "#86EFAC", sortOrder: 8, isTerminal: false },
  { key: "ROT_VONG_1", label: "Rớt vòng 1", color: "#FCA5A5", sortOrder: 9, isTerminal: true },
  { key: "PV_VONG_2", label: "PV vòng 2", color: "#C4B5FD", sortOrder: 10, isTerminal: false },
  { key: "DAU_VONG_2", label: "Đậu vòng 2", color: "#86EFAC", sortOrder: 11, isTerminal: false },
  { key: "OFFER", label: "Offer", color: "#67E8F9", sortOrder: 12, isTerminal: false },
  { key: "NHAN_VIEC", label: "Nhận việc", color: "#5EEAD4", sortOrder: 13, isTerminal: false },
  { key: "THU_VIEC", label: "Thử việc", color: "#34D399", sortOrder: 14, isTerminal: false },
  { key: "CHINH_THUC", label: "Chính thức", color: "#22C55E", sortOrder: 15, isTerminal: true },
  { key: "BLACKLIST", label: "Blacklist", color: "#1F2937", sortOrder: 16, isTerminal: true },
];
