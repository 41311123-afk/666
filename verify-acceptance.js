import fs from 'fs';
import path from 'path';
import { filterProducts, sortProducts, findReplacement, calculateChecklistTotal } from './src/recommendLogic.js';

const rawData = fs.readFileSync(path.resolve('public/products.json'), 'utf-8');
const products = JSON.parse(rawData);

console.log(`Loaded ${products.length} products.`);

let failed = 0;
function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

// TC-01: 急迫性情境切換
console.log('\n--- TC-01: 急迫性情境切換 ---');
const firstWeekItems = filterProducts(products, { urgency: 'first_week' });
assert(firstWeekItems.length > 0, '應找得到開學首週商品');
assert(firstWeekItems.every(p => p.urgency === 'first_week'), '所有商品 urgency 必須為 first_week');
assert(!firstWeekItems.some(p => p.urgency === 'first_night'), '不得包含 first_night 商品');

// TC-02: 功能痛點標籤複合篩選
console.log('\n--- TC-02: 功能痛點標籤複合篩選 ---');
const dualFeatureItems = filterProducts(products, { selectedFeatures: ['quiet', 'low_watt'] });
assert(dualFeatureItems.length > 0, '應找得到同時符合靜音與低瓦數商品');
assert(dualFeatureItems.every(p => p.features.includes('quiet') && p.features.includes('low_watt')), '每項商品必須同時具備 quiet 與 low_watt');

// TC-03: 價格排序
console.log('\n--- TC-03: 價格升降冪排序 ---');
const ascSorted = sortProducts(products, 'price_asc');
assert(ascSorted[0].price <= ascSorted[1].price, '升冪第 1 筆 <= 第 2 筆');
assert(ascSorted[0].price === 299, '最便宜商品價格應為 299');
const descSorted = sortProducts(products, 'price_desc');
assert(descSorted[0].price >= descSorted[1].price, '降冪第 1 筆 >= 第 2 筆');
assert(descSorted[0].price === 790, '最高價商品應為 790');

// TC-04: 空白 / 無符合結果
console.log('\n--- TC-04: 無符合條件空狀態 ---');
const emptyItems = filterProducts(products, { searchKeyword: '冷氣機', urgency: 'first_week' });
assert(emptyItems.length === 0, '搜尋不存在之冷氣機應回傳空陣列 (0 件)');

// TC-05: 缺貨與智慧替代
console.log('\n--- TC-05: 缺貨與智慧替代 ---');
const outOfStockItem = products.find(p => p.id === 'prod-01');
assert(outOfStockItem.stock === 0, 'prod-01 庫存必須為 0');
assert(outOfStockItem.replacement_id === 'prod-02', 'prod-01 replacement_id 應為 prod-02');
const replacement = findReplacement(products, outOfStockItem.replacement_id);
assert(replacement && replacement.stock > 0, '替代品 prod-02 必須存在且有現貨庫存');

// TC-06: 採購清單預算計算
console.log('\n--- TC-06: 採購清單累計與計算 ---');
const prod3 = products.find(p => p.id === 'prod-03'); // 380
const prod7 = products.find(p => p.id === 'prod-07'); // 299
const summary2 = calculateChecklistTotal([prod3, prod7]);
assert(summary2.count === 2, '清單應有 2 件');
assert(summary2.totalAmount === 679, `金額應為 679 (實得 ${summary2.totalAmount})`);
const summary1 = calculateChecklistTotal([prod7]);
assert(summary1.count === 1 && summary1.totalAmount === 299, '移除 prod3 後應為 1 件 299 元');

if (failed === 0) {
  console.log('\n🎉 ALL ACCEPTANCE TEST CASES PASSED!');
} else {
  console.error(`\n❌ ${failed} test(s) failed.`);
  process.exit(1);
}
