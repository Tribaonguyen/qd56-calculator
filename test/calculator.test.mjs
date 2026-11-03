import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDensity, needsDensityReview, calculateMaxFloors, calculateFloorLimits, calculateAll,
} from '../src/utils/calculator.js';

// QĐ 56/2021, Phụ lục 18, Bảng 1 + nội suy tuyến tính
test('mật độ: 49 m² → 100% (lô < 50 m²)', () => assert.equal(calculateDensity(49), 100));
test('mật độ: 75 m² → 95% (nội suy 50–100)', () => assert.equal(calculateDensity(75), 95));
test('mật độ: 97,8 m² → 90,44% (thửa 532 tờ 67 Linh Xuân, TTQH ghi 90,4%)', () =>
  assert.equal(calculateDensity(97.8), 90.44));
test('mật độ: 150 m² → 80% (nội suy 100–200)', () => assert.equal(calculateDensity(150), 80));
test('mật độ: mốc Bảng 1 khớp chính xác', () => {
  for (const [a, d] of [[50, 100], [100, 90], [200, 70], [300, 60], [500, 50]]) assert.equal(calculateDensity(a), d);
});
test('lô > 500 m² gắn cờ xem xét (PL18 mục 2.2), không có mốc 1000 → 40%', () => {
  assert.equal(needsDensityReview(500), false);
  assert.equal(needsDensityReview(500.1), true);
  assert.equal(calculateDensity(1000), 50);
  assert.equal(calculateAll({ width: 20, depth: 50, roadWidth: 12 }).densityNeedsReview, true);
});

// Phụ lục 18, Bảng 2
test('số tầng cơ bản theo lộ giới', () => {
  for (const [L, f] of [[2, 3], [3.49, 3], [3.5, 3], [5.99, 3], [6, 4], [15.99, 4], [16, 5], [24.99, 5], [25, 6], [40, 6]])
    assert.equal(calculateMaxFloors(L), f, `L=${L}`);
  assert.equal(calculateMaxFloors(0), 0);
});
test('tầng cộng thêm theo cột Bảng 2', () => {
  assert.equal(calculateFloorLimits(20, { commercialStreet: true }).maxFloors, 6);
  assert.equal(calculateFloorLimits(10, { commercialStreet: true }).maxFloors, 4); // 6≤L<16: TMDV = 0
  assert.equal(calculateFloorLimits(10, { frontageWidth: 8.5 }).maxFloors, 5);
  assert.equal(calculateFloorLimits(10, { frontageWidth: 8.0 }).maxFloors, 4);    // phải > 8,0
  assert.equal(calculateFloorLimits(4, { centralDistrict: true }).maxFloors, 4);
  assert.equal(calculateFloorLimits(3, { centralDistrict: true, frontageWidth: 10 }).maxFloors, 3);
  assert.equal(calculateFloorLimits(30, { centralDistrict: true }).maxFloors, 6);
  assert.equal(calculateFloorLimits(20, { centralDistrict: true, frontageWidth: 3.9 }).maxFloors, 5); // mặt tiền < 4 m
  const l = calculateFloorLimits(20, { centralDistrict: true, commercialStreet: true, frontageWidth: 9 });
  assert.equal(l.maxFloors, 6); // không cộng dồn
  assert.equal(l.bonusSetback, 3.5);
});
// Phụ lục 18, Bảng 3
test('chiều cao theo Bảng 3', () => {
  assert.deepEqual(
    (({ firstFloorMax, cgxdHeight, roofMax }) => ({ firstFloorMax, cgxdHeight, roofMax }))(calculateFloorLimits(8)),
    { firstFloorMax: 5.8, cgxdHeight: 17.0, roofMax: 19.0 });
  assert.equal(calculateFloorLimits(8, { frontageWidth: 9 }).roofMax, 22.4);
  assert.equal(calculateFloorLimits(4).roofMax, 13.6);
  assert.equal(calculateFloorLimits(2).roofMax, 11.6);
});
