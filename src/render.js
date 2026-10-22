/**
 * render.js
 * 畫面渲染模組：負責將推薦商品、空狀態、標籤與採購清單渲染到 DOM 上。
 */

const FEATURE_LABELS = {
  quiet: '🔊 超靜音',
  low_watt: '⚡ 宿舍低瓦數',
  foldable: '📦 可折疊省空間'
};

/**
 * 渲染單一推薦卡片 HTML
 */
export function renderProductCard(product, { allProducts, checklistIds = new Set(), onReplace, onToggleChecklist }) {
  const isOutOfStock = Number(product.stock) <= 0;
  const isInChecklist = checklistIds.has(product.id);
  const tierBadge = product.price_tier === 'budget' 
    ? '<span class="badge badge-budget">🟢 小資省錢款</span>' 
    : '<span class="badge badge-premium">🟣 質感升級款</span>';

  // 功能標籤 tags
  const featureTags = (product.features || [])
    .map((f) => `<span class="tag tag-feature">${FEATURE_LABELS[f] || f}</span>`)
    .join('');

  // 缺貨替代品資訊
  let replacementHtml = '';
  if (isOutOfStock && product.replacement_id) {
    const replacement = allProducts.find((p) => p.id === product.replacement_id);
    if (replacement && replacement.stock > 0) {
      replacementHtml = `
        <div class="replacement-box">
          <div class="replacement-title">⚡ 此款暫時缺貨，為你智慧推薦同規格替代好物：</div>
          <button class="btn btn-replace" data-replace-id="${replacement.id}">
            👉 推薦替代品：${replacement.icon} ${replacement.name} (NT$ ${replacement.price} / 現貨 ${replacement.stock} 件)
          </button>
        </div>
      `;
    }
  }

  // 按鈕區
  let actionButtonHtml = '';
  if (isOutOfStock) {
    actionButtonHtml = `
      <button class="btn btn-disabled" disabled>
        ⚠️ 暫時缺貨中
      </button>
    `;
  } else if (isInChecklist) {
    actionButtonHtml = `
      <button class="btn btn-in-checklist" data-product-id="${product.id}">
        ✓ 已加入開學清單 (點擊移除)
      </button>
    `;
  } else {
    actionButtonHtml = `
      <button class="btn btn-add-checklist" data-product-id="${product.id}">
        ➕ 加入開學採購清單
      </button>
    `;
  }

  return `
    <article 
      class="product-card ${isOutOfStock ? 'card-out-of-stock' : ''}" 
      id="card-${product.id}"
      style="--card-theme-color: ${product.color || '#F3F4F6'}"
    >
      <div class="card-header" style="background-color: ${product.color || '#F3F4F6'}">
        <div class="card-icon" aria-hidden="true">${product.icon || '📦'}</div>
        <div class="card-badges">
          ${tierBadge}
          <span class="badge ${isOutOfStock ? 'badge-stockout' : 'badge-stock'}">
            ${isOutOfStock ? '缺貨中' : `現貨 ${product.stock} 件`}
          </span>
        </div>
      </div>

      <div class="card-body">
        <div class="product-wattage">瓦數限制：<span class="watt-num">${product.wattage}W</span></div>
        <h3 class="product-name">${product.name}</h3>
        
        <div class="product-price-box">
          <span class="price-currency">NT$</span>
          <span class="price-val">${product.price}</span>
        </div>

        <div class="product-features">
          ${featureTags}
        </div>

        <div class="recommend-reason-box">
          <span class="quote-icon">💡 <strong>推薦理由：</strong></span>
          <p class="reason-text">${product.recommend_reason}</p>
        </div>

        ${replacementHtml}
      </div>

      <div class="card-footer">
        ${actionButtonHtml}
      </div>
    </article>
  `;
}

/**
 * 渲染商品卡片清單或空狀態
 */
export function renderProductGrid(container, products, options) {
  if (!products || products.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>找不到符合條件的宿舍電器</h3>
        <p>目前勾選的痛點偏好或篩選條件較嚴苛，建議放寬條件再看看！</p>
        <button id="btn-reset-filters" class="btn btn-primary">
          🔄 重設所有篩選條件
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = products
    .map((product) => renderProductCard(product, options))
    .join('');
}

/**
 * 渲染採購清單抽屜 / 側邊欄
 */
export function renderChecklist(container, items, { totalCount, totalAmount, onRemove }) {
  if (!items || items.length === 0) {
    container.innerHTML = `
      <div class="checklist-empty">
        <p>尚未勾選任何開學電器。</p>
        <small class="text-muted">點擊卡片上的「➕ 加入開學採購清單」即可預算試算！</small>
      </div>
    `;
    return;
  }

  const itemsHtml = items
    .map(
      (item) => `
      <li class="checklist-item">
        <span class="item-icon">${item.icon}</span>
        <div class="item-info">
          <div class="item-name">${item.name}</div>
          <div class="item-price">NT$ ${item.price}</div>
        </div>
        <button class="btn-remove-item" data-remove-id="${item.id}" title="從清單移除">✕</button>
      </li>
    `
    )
    .join('');

  container.innerHTML = `
    <ul class="checklist-list">
      ${itemsHtml}
    </ul>
    <div class="checklist-summary">
      <div class="summary-row">
        <span>已選品項：</span>
        <strong>${totalCount} 件</strong>
      </div>
      <div class="summary-row total-row">
        <span>開學預算總計：</span>
        <strong class="total-price">NT$ ${totalAmount}</strong>
      </div>
    </div>
  `;
}
