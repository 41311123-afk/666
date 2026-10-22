/**
 * main.js
 * 應用程式進入點：負責資料載入、狀態綁定、事件監聽與協調 logic 與 render。
 */

import { filterProducts, sortProducts, findReplacement, calculateChecklistTotal } from './recommendLogic.js';
import { renderProductGrid, renderChecklist } from './render.js';

// 應用程式狀態 (State)
const appState = {
  allProducts: [],
  urgency: 'first_night', // 預設推薦「第一晚沒它不能睡」
  selectedFeatures: [],
  searchKeyword: '',
  sortBy: 'price_asc',
  checklist: [] // 記憶體中暫存的採購清單
};

// DOM 元素快取
const elements = {
  productGrid: document.getElementById('product-grid'),
  checklistContainer: document.getElementById('checklist-container'),
  urgencyTabs: document.getElementById('urgency-tabs'),
  featurePills: document.getElementById('feature-pills'),
  searchInput: document.getElementById('search-input'),
  sortSelect: document.getElementById('sort-select')
};

/**
 * 依當前狀態更新畫面
 */
function updateView() {
  // 1. 純邏輯計算：過濾與排序
  const filtered = filterProducts(appState.allProducts, {
    urgency: appState.urgency,
    selectedFeatures: appState.selectedFeatures,
    searchKeyword: appState.searchKeyword
  });

  const sorted = sortProducts(filtered, appState.sortBy);

  // 2. 準備 checklist ID 集合
  const checklistIds = new Set(appState.checklist.map((item) => item.id));

  // 3. 渲染商品網格
  renderProductGrid(elements.productGrid, sorted, {
    allProducts: appState.allProducts,
    checklistIds
  });

  // 4. 計算並渲染採購清單
  const totalSummary = calculateChecklistTotal(appState.checklist);
  renderChecklist(elements.checklistContainer, appState.checklist, totalSummary);
}

/**
 * 載入商品 JSON 資料
 */
async function loadProducts() {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}products.json`);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    appState.allProducts = await res.json();
    updateView();
  } catch (error) {
    console.error('無法載入商品資料:', error);
    elements.productGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <h3>商品資料載入失敗</h3>
        <p>請確認 public/products.json 是否存在或重新整理頁面再試一次。</p>
      </div>
    `;
  }
}

/**
 * 綁定互動事件
 */
function bindEvents() {
  // 1. 急迫性情境 Tabs 切換
  elements.urgencyTabs.addEventListener('click', (e) => {
    const tabBtn = e.target.closest('.tab-btn');
    if (!tabBtn) return;

    elements.urgencyTabs.querySelectorAll('.tab-btn').forEach((btn) => btn.classList.remove('active'));
    tabBtn.classList.add('active');

    appState.urgency = tabBtn.dataset.urgency;
    updateView();
  });

  // 2. 痛點標籤 Pills 勾選
  elements.featurePills.addEventListener('change', () => {
    const checkedPills = elements.featurePills.querySelectorAll('.pill-checkbox:checked');
    appState.selectedFeatures = Array.from(checkedPills).map((input) => input.value);
    updateView();
  });

  // 3. 搜尋欄即時輸入
  elements.searchInput.addEventListener('input', (e) => {
    appState.searchKeyword = e.target.value;
    updateView();
  });

  // 4. 排序選單變更
  elements.sortSelect.addEventListener('change', (e) => {
    appState.sortBy = e.target.value;
    updateView();
  });

  // 5. 事件委派：商品卡片內部點擊（加入清單 / 移除 / 缺貨替代品 / 重設按鈕）
  elements.productGrid.addEventListener('click', (e) => {
    // A. 點擊「加入開學採購清單」
    const addBtn = e.target.closest('.btn-add-checklist');
    if (addBtn) {
      const prodId = addBtn.dataset.productId;
      const product = appState.allProducts.find((p) => p.id === prodId);
      if (product && !appState.checklist.some((item) => item.id === prodId)) {
        appState.checklist.push(product);
        updateView();
      }
      return;
    }

    // B. 點擊「已加入 (點擊移除)」
    const inChecklistBtn = e.target.closest('.btn-in-checklist');
    if (inChecklistBtn) {
      const prodId = inChecklistBtn.dataset.productId;
      appState.checklist = appState.checklist.filter((item) => item.id !== prodId);
      updateView();
      return;
    }

    // C. 點擊「👉 推薦替代品」
    const replaceBtn = e.target.closest('.btn-replace');
    if (replaceBtn) {
      const replaceId = replaceBtn.dataset.replaceId;
      const replacement = findReplacement(appState.allProducts, replaceId);
      if (replacement) {
        // 若替代品的急迫性情境與當前情境不同，切換到該情境或全部以確保可見
        if (appState.urgency !== 'all' && replacement.urgency !== appState.urgency) {
          appState.urgency = replacement.urgency;
          // 同步更新 Tabs 視覺狀態
          elements.urgencyTabs.querySelectorAll('.tab-btn').forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.urgency === replacement.urgency);
          });
        }
        updateView();

        // 平滑滾動並突顯該替代品
        setTimeout(() => {
          const targetCard = document.getElementById(`card-${replaceId}`);
          if (targetCard) {
            targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            targetCard.style.outline = '3px solid #2563eb';
            targetCard.style.boxShadow = '0 0 20px rgba(37, 99, 235, 0.4)';
            setTimeout(() => {
              targetCard.style.outline = '';
              targetCard.style.boxShadow = '';
            }, 1800);
          }
        }, 80);
      }
      return;
    }

    // D. 空狀態下的「🔄 重設所有篩選條件」
    const resetBtn = e.target.closest('#btn-reset-filters');
    if (resetBtn) {
      resetFilters();
    }
  });

  // 6. 事件委派：採購清單內部移除項目按鈕
  elements.checklistContainer.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('.btn-remove-item');
    if (removeBtn) {
      const removeId = removeBtn.dataset.removeId;
      appState.checklist = appState.checklist.filter((item) => item.id !== removeId);
      updateView();
    }
  });
}

/**
 * 重設所有篩選條件至預設狀態
 */
function resetFilters() {
  appState.urgency = 'first_night';
  appState.selectedFeatures = [];
  appState.searchKeyword = '';
  appState.sortBy = 'price_asc';

  // 重置 UI 控制項
  elements.urgencyTabs.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.urgency === 'first_night');
  });

  elements.featurePills.querySelectorAll('.pill-checkbox').forEach((checkbox) => {
    checkbox.checked = false;
  });

  elements.searchInput.value = '';
  elements.sortSelect.value = 'price_asc';

  updateView();
}

// 啟動應用
bindEvents();
loadProducts();
