// Các bảng dữ liệu về mật độ và nội suy theo QĐ 56
const DENSITY_TABLE = [
  { area: 90, density: 100 },
  { area: 100, density: 90 },
  { area: 200, density: 70 },
  { area: 300, density: 60 },
  { area: 500, density: 50 },
  { area: 1000, density: 40 },
];

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

export function calculateMaxFloors(roadWidth) {
  if (roadWidth <= 0) return 0;
  if (roadWidth < 3.5) return 3;
  if (roadWidth >= 3.5 && roadWidth < 7) return 4;
  if (roadWidth >= 7 && roadWidth <= 12) return 5;
  if (roadWidth > 12 && roadWidth <= 20) return 6;
  if (roadWidth > 20 && roadWidth <= 25) return 7;
  return 8;
}

export function calculateAll(params) {
  const { width = 0, depth = 0, roadWidth = 0 } = params;
  
  const w = parseFloat(width) || 0;
  const d = parseFloat(depth) || 0;
  const r = parseFloat(roadWidth) || 0;

  const area = w * d;
  if (area <= 0) {
    return {
      area: 0,
      density: 0,
      rearSetback: 0,
      maxFloors: 0
    };
  }

  return {
    area: Math.round(area * 100) / 100,
    density: calculateDensity(area),
    rearSetback: calculateRearSetback(d),
    maxFloors: calculateMaxFloors(r),
  };
}
