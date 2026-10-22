/**
 * recommendLogic.js
 * 純邏輯處理模組（無 DOM 操作），負責推薦過濾、排序、替代品查找與預算計算。
 */

/**
 * 依據急迫性、痛點標籤與關鍵字過濾商品
 * @param {Array} products - 原始商品清單
 * @param {Object} criteria - 篩選條件
 * @param {string} criteria.urgency - 'first_night' | 'first_week' | 'all'
 * @param {Array<string>} criteria.selectedFeatures - 如 ['quiet', 'low_watt']
 * @param {string} criteria.searchKeyword - 搜尋關鍵字
 * @returns {Array} 過濾後商品
 */
export function filterProducts(products, { urgency = 'all', selectedFeatures = [], searchKeyword = '' } = {}) {
  if (!Array.isArray(products)) return [];

  const normalizedKeyword = searchKeyword.trim().toLowerCase();

  return products.filter((product) => {
    // 1. 急迫性情境過濾
    if (urgency && urgency !== 'all' && product.urgency !== urgency) {
      return false;
    }

    // 2. 功能痛點標籤過濾 (採 AND 邏輯：必須包含所有勾選的標籤)
    if (Array.isArray(selectedFeatures) && selectedFeatures.length > 0) {
      const hasAllFeatures = selectedFeatures.every((feat) =>
        Array.isArray(product.features) && product.features.includes(feat)
      );
      if (!hasAllFeatures) {
        return false;
      }
    }

    // 3. 關鍵字模糊比對（品名或推薦理由）
    if (normalizedKeyword) {
      const nameMatch = product.name?.toLowerCase().includes(normalizedKeyword);
      const reasonMatch = product.recommend_reason?.toLowerCase().includes(normalizedKeyword);
      if (!nameMatch && !reasonMatch) {
        return false;
      }
    }

    return true;
  });
}

/**
 * 依據價格排序商品清單
 * @param {Array} products - 商品清單
 * @param {string} sortBy - 'price_asc' | 'price_desc'
 * @returns {Array} 排序後商品清單（新陣列）
 */
export function sortProducts(products, sortBy = 'price_asc') {
  if (!Array.isArray(products)) return [];
  const list = [...products];

  if (sortBy === 'price_asc') {
    return list.sort((a, b) => a.price - b.price);
  }
  if (sortBy === 'price_desc') {
    return list.sort((a, b) => b.price - a.price);
  }

  return list;
}

/**
 * 依據替代品 ID 尋找對應的現貨商品
 * @param {Array} products - 全體商品清單
 * @param {string} replacementId - 替代商品 ID
 * @returns {Object|null}
 */
export function findReplacement(products, replacementId) {
  if (!Array.isArray(products) || !replacementId) return null;
  return products.find((item) => item.id === replacementId) || null;
}

/**
 * 計算採購清單之總件數與總預算
 * @param {Array} checklistItems - 採購清單中的商品陣列
 * @returns {{ count: number, totalAmount: number }}
 */
export function calculateChecklistTotal(checklistItems) {
  if (!Array.isArray(checklistItems)) return { count: 0, totalAmount: 0 };

  const totalAmount = checklistItems.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  return {
    count: checklistItems.length,
    totalAmount
  };
}
