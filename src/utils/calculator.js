// Nguồn: QĐ 56/2021/QĐ-UBND, Phụ lục 18 (nhà liên kế trong khu đô thị hiện hữu).
//
// Phụ lục 18 mục 3, Bảng 1 – Mật độ xây dựng tối đa:
//   Diện tích lô (m²):  < 50 | 100 | 200 | 300 | 500
//   Mật độ tối đa (%):   100 |  90 |  70 |  60 |  50
// Giữa hai mốc: nội suy tuyến tính (ghi chú Bảng 1).
// Bảng 1 KHÔNG có mốc 1000 m² → 40%. Lô > 500 m²: theo mục 2.2, do cơ quan quản lý
// kiến trúc quy hoạch có thẩm quyền xem xét, cung cấp thông tin quy hoạch cụ thể
// → không tự tính, chỉ gắn cờ densityNeedsReview.
export const DENSITY_TABLE = [
  { area: 50, density: 100 },
  { area: 100, density: 90 },
  { area: 200, density: 70 },
  { area: 300, density: 60 },
  { area: 500, density: 50 },
];

export const DENSITY_REVIEW_THRESHOLD = 500; // m², PL18 mục 2.2

export function needsDensityReview(area) {
  return area > DENSITY_REVIEW_THRESHOLD;
}

// Trả về mật độ tối đa (%) theo Bảng 1. Với lô > 500 m² hàm vẫn trả 50 (mốc cuối Bảng 1)
// để UI không vỡ, nhưng giá trị này KHÔNG phải mức được duyệt — luôn kiểm tra
// needsDensityReview(area) / calculateAll().densityNeedsReview.
export function calculateDensity(area) {
  if (area <= DENSITY_TABLE[0].area) return DENSITY_TABLE[0].density;
  if (area >= DENSITY_TABLE[DENSITY_TABLE.length - 1].area) return DENSITY_TABLE[DENSITY_TABLE.length - 1].density;

  let lower = DENSITY_TABLE[0];
  let upper = DENSITY_TABLE[1];

  for (let i = 0; i < DENSITY_TABLE.length - 1; i++) {
    if (area >= DENSITY_TABLE[i].area && area <= DENSITY_TABLE[i + 1].area) {
      lower = DENSITY_TABLE[i];
      upper = DENSITY_TABLE[i + 1];
      break;
    }
  }

  // Nội suy tuyến tính
  // y = y1 + (x - x1) * (y2 - y1) / (x2 - x1)
  const x = area;
  const x1 = lower.area;
  const y1 = lower.density;
  const x2 = upper.area;
  const y2 = upper.density;

  const exactDensity = y1 + ((x - x1) * (y2 - y1)) / (x2 - x1);
  return Math.round(exactDensity * 100) / 100; // Làm tròn 2 số thập phân
}

export function calculateRearSetback(depth) {
  if (depth < 9) return 0;
  if (depth >= 9 && depth < 16) return 1;
  return 2;
}

// Phụ lục 18 mục 4.1, Bảng 2 – Tầng cao, và mục 4.2, Bảng 3 – Chiều cao (m).
// bonus: tầng cộng thêm theo từng cột (2) Quận trung tâm / Trung tâm cấp quận,
//        (3) Trục đường TMDV (Phụ lục 02), (4) Mặt tiền > 8,0 m.
//        Chỉ +1 tầng dù thỏa nhiều trường hợp (cột "Số tầng tối đa").
//        Tầng cộng thêm phải lùi 3,5 m so với chỉ giới xây dựng (ghi chú a).
//        Mặt tiền < 4,0 m: không áp dụng tầng cộng thêm (ghi chú b).
// Bảng 3: firstFloorMax = tổng chiều cao tối đa tầng 1 (gồm lửng), cgxdHeight = cao độ
//        chuẩn tại chỉ giới xây dựng (ở tầng cgxdFloor), roofMax / roofMaxWithBonus =
//        chiều cao tối đa tại đỉnh mái (không / có cộng tầng). null = Bảng 3 để trống.
//        Lưu ý: dòng L ≥ 25 trong bản text trích từ PDF bị lệch cột ("7,0 - - - - 25,0 - 27,0");
//        dòng này không có tầng cộng thêm nên 27,0 m được hiểu là chiều cao đỉnh mái.
export const FLOOR_TABLE = [
  { minRoad: 25,  basic: 6, bonus: { central: 0, commercial: 0, wideFrontage: 0 }, firstFloorMax: 7.0, cgxdFloor: 6, cgxdHeight: 25.0, roofMax: 27.0, roofMaxWithBonus: null },
  { minRoad: 16,  basic: 5, bonus: { central: 1, commercial: 1, wideFrontage: 1 }, firstFloorMax: 7.0, cgxdFloor: 5, cgxdHeight: 21.6, roofMax: 23.6, roofMaxWithBonus: 27.0 },
  { minRoad: 6,   basic: 4, bonus: { central: 1, commercial: 0, wideFrontage: 1 }, firstFloorMax: 5.8, cgxdFloor: 4, cgxdHeight: 17.0, roofMax: 19.0, roofMaxWithBonus: 22.4 },
  { minRoad: 3.5, basic: 3, bonus: { central: 1, commercial: 0, wideFrontage: 1 }, firstFloorMax: null, cgxdFloor: 3, cgxdHeight: 11.6, roofMax: 13.6, roofMaxWithBonus: 15.6 },
  { minRoad: 0,   basic: 3, bonus: { central: 0, commercial: 0, wideFrontage: 0 }, firstFloorMax: null, cgxdFloor: null, cgxdHeight: null, roofMax: 11.6, roofMaxWithBonus: null },
];

export const BONUS_FLOOR_SETBACK = 3.5; // m, Bảng 2 ghi chú a
const WIDE_FRONTAGE = 8.0;              // m, cột (4): mặt tiền > 8,0 m
const MIN_FRONTAGE_FOR_BONUS = 4.0;     // m, ghi chú b

function floorRow(roadWidth) {
  return FLOOR_TABLE.find((row) => roadWidth >= row.minRoad);
}

/**
 * Tầng cao + chiều cao theo PL18 Bảng 2 & 3.
 * @param {number} roadWidth lộ giới L (m)
 * @param {{ frontageWidth?: number, centralDistrict?: boolean, commercialStreet?: boolean }} [opts]
 */
export function calculateFloorLimits(roadWidth, opts = {}) {
  if (!(roadWidth > 0)) return null;
  const { frontageWidth = 0, centralDistrict = false, commercialStreet = false } = opts;
  const row = floorRow(roadWidth);

  const frontageBlocksBonus = frontageWidth > 0 && frontageWidth < MIN_FRONTAGE_FOR_BONUS;
  const reasons = [];
  if (!frontageBlocksBonus) {
    if (centralDistrict && row.bonus.central) reasons.push('Quận trung tâm / Trung tâm cấp quận');
    if (commercialStreet && row.bonus.commercial) reasons.push('Trục đường thương mại - dịch vụ');
    if (frontageWidth > WIDE_FRONTAGE && row.bonus.wideFrontage) reasons.push('Mặt tiền > 8,0 m');
  }
  const bonusFloors = reasons.length > 0 ? 1 : 0;

  return {
    basicFloors: row.basic,
    bonusFloors,
    bonusReasons: reasons,
    bonusSetback: bonusFloors ? BONUS_FLOOR_SETBACK : 0,
    maxFloors: row.basic + bonusFloors,
    firstFloorMax: row.firstFloorMax,
    cgxdFloor: row.cgxdFloor,
    cgxdHeight: row.cgxdHeight,
    roofMax: bonusFloors ? row.roofMaxWithBonus : row.roofMax,
  };
}

// Số tầng cơ bản (tại chỉ giới xây dựng) theo Bảng 2, chưa gồm tầng cộng thêm.
export function calculateMaxFloors(roadWidth) {
  const limits = calculateFloorLimits(roadWidth);
  return limits ? limits.basicFloors : 0;
}

export function calculateAll(params) {
  const { width = 0, depth = 0, roadWidth = 0, centralDistrict = false, commercialStreet = false } = params;
  
  const w = parseFloat(width) || 0;
  const d = parseFloat(depth) || 0;
  const r = parseFloat(roadWidth) || 0;

  const area = w * d;
  if (area <= 0) {
    return {
      area: 0,
      density: 0,
      densityNeedsReview: false,
      rearSetback: 0,
      maxFloors: 0,
      floorLimits: null,
    };
  }

  return {
    area: Math.round(area * 100) / 100,
    density: calculateDensity(area),
    densityNeedsReview: needsDensityReview(area),
    rearSetback: calculateRearSetback(d),
    maxFloors: calculateMaxFloors(r),
    floorLimits: calculateFloorLimits(r, { frontageWidth: w, centralDistrict, commercialStreet }),
  };
}
