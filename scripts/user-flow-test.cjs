const { JSDOM } = require('jsdom');
const fs = require('node:fs/promises');
const path = require('node:path');

const cwd = process.cwd();
const site = 'https://mukjamtl.netlify.app';
const users = {
  admin: { role: 'admin', department: '', label: '관리자' },
  restaurant: { role: 'restaurant', department: '', label: '레스토랑' },
  cafeteria: { role: 'department', department: '카페테리아', label: '카페테리아' },
  vegetable: { role: 'department', department: '야채', label: '야채' },
  grocery: { role: 'department', department: '매장', label: '매장' }
};
const pages = [
  { file: 'index.html', script: 'app.js' },
  { file: 'history.html', script: 'history.js' },
  { file: 'order.html', script: 'order.js' },
  { file: 'menu.html', script: 'menu.js' },
  { file: 'recipes.html', script: 'recipes.js' },
  { file: 'admin.html', script: 'admin.js' }
];
const expectedHomeMemos = {
  admin: ['레스토랑', '카페테리아', '야채', '매장', '먹자'],
  restaurant: ['관리자', '카페테리아', '야채', '매장', '먹자'],
  cafeteria: ['관리자', '레스토랑', '야채', '매장', '먹자'],
  vegetable: ['관리자', '레스토랑', '카페테리아', '매장', '먹자'],
  grocery: ['관리자', '레스토랑', '카페테리아', '야채', '먹자']
};
const sharedScripts = ['storage.js', 'i18n.js'];
const apiHeaders = {
  'Content-Type': 'application/json',
  'X-Mukja-Member-Id': 'user-flow-test',
  'X-Mukja-Role': 'admin',
  'X-Mukja-Department': ''
};
const local = (file) => fs.readFile(path.join(cwd, file), 'utf8');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function req(pathname, options = {}) {
  const response = await fetch(`${site}/api${pathname}`, {
    ...options,
    headers: { ...apiHeaders, ...(options.headers || {}) }
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!response.ok || data.ok === false) throw new Error(`${options.method || 'GET'} ${pathname} ${response.status} ${data.error || text}`);
  return data;
}

function today() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function seededEntry(id) {
  return {
    id,
    date: today(),
    time: '00:01',
    mode: 'simple',
    employee: '관리자',
    target: '',
    items: [
      { id: `${id}-cafe`, name: '테스트 닭강정', nameKo: '테스트 닭강정', nameEn: 'Test Gangjeong', category: '반조리', target: '카페테리아', quantity: '', unit: '', received: false, restaurantReceived: false },
      { id: `${id}-veg`, name: '테스트 두부', nameKo: '테스트 두부', nameEn: 'Test Tofu', category: '두부', target: '야채', quantity: '', unit: '', received: false, restaurantReceived: false },
      { id: `${id}-grocery`, name: '테스트 다시다', nameKo: '테스트 다시다', nameEn: 'Test Powder', category: '분말', target: '매장', quantity: '', unit: '', received: true, restaurantReceived: true }
    ],
    memos: [
      { id: `${id}-memo-admin`, role: 'admin', department: '', authorLabel: '관리자', text: '기능 테스트 관리자 메모', createdAt: new Date().toISOString() },
      { id: `${id}-memo-restaurant`, role: 'restaurant', department: '', authorLabel: '레스토랑', text: '기능 테스트 레스토랑 메모', createdAt: new Date().toISOString() },
      { id: `${id}-memo-cafe`, role: 'department', department: '카페테리아', authorLabel: '카페테리아', text: '기능 테스트 카페테리아 메모', createdAt: new Date().toISOString() },
      { id: `${id}-memo-veg`, role: 'department', department: '야채', authorLabel: '야채', text: '기능 테스트 야채 메모', createdAt: new Date().toISOString() },
      { id: `${id}-memo-grocery`, role: 'department', department: '매장', authorLabel: '매장', text: '기능 테스트 매장 메모', createdAt: new Date().toISOString() }
    ],
    memo: '[관리자] 기능 테스트 관리자 메모',
    message: ''
  };
}

async function waitUntil(fn, timeout = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (fn()) return true;
    await wait(100);
  }
  return false;
}

async function runPage(userName, session, page, language = 'ko') {
  const html = await local(page.file);
  const dom = new JSDOM(html, { url: `${site}/${page.file}`, runScripts: 'outside-only', pretendToBeVisual: true });
  const { window } = dom;
  const errors = [];
  const alerts = [];
  window.console = { ...console, error: (...args) => errors.push(args.join(' ')) };
  window.alert = (message) => alerts.push(String(message || ''));
  window.confirm = () => true;
  window.URL.createObjectURL = () => 'blob:test';
  window.URL.revokeObjectURL = () => {};
  window.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} });
  window.fetch = async (url, options = {}) => fetch(String(url).startsWith('/api') ? `${site}${url}` : String(url), options);
  Object.defineProperty(window.navigator, 'serviceWorker', { configurable: true, value: { getRegistrations: async () => [], register: async () => ({ update: async () => {} }) } });
  window.localStorage.setItem('restaurant_lang', language);
  window.localStorage.setItem('restaurant_auth', JSON.stringify({ ...session, signedInAt: new Date().toISOString() }));
  for (const script of [...sharedScripts, page.script]) window.eval(`${await local(script)}\n//# sourceURL=${script}`);
  await waitUntil(() => {
    if (page.file === 'index.html') {
      const text = (window.document.querySelector('#home-request-list')?.textContent || '').trim();
      return text && !/저장된 주문내역이 없습니다|No saved request history/.test(text);
    }
    if (page.file === 'history.html') {
      const text = (window.document.querySelector('#history-list')?.textContent || '').trim();
      return text && !/저장된 주문내역이 없습니다|No saved request history/.test(text);
    }
    if (page.file === 'order.html') return (window.document.querySelector('#items-list')?.textContent || '').trim();
    if (page.file === 'menu.html') return (window.document.querySelector('#menu-list')?.textContent || '').trim();
    if (page.file === 'recipes.html') return (window.document.querySelector('#recipe-list')?.textContent || '').trim();
    if (page.file === 'admin.html') return window.document.querySelector('[data-layout-sidebar]')?.textContent?.trim() || window.document.querySelector('#access-list')?.textContent?.trim();
    return true;
  });
  const result = { user: userName, page: page.file, language, errors };
  if (page.file === 'index.html') {
    const homeText = window.document.querySelector('#home-request-list')?.textContent?.replace(/\s+/g, ' ').trim() || '';
    result.memoLabels = [...window.document.querySelectorAll('.memo-entry strong')].map((node) => node.textContent.trim());
    result.memoTextArea = window.document.querySelector('#home-memo')?.value || '';
    result.subtitle = window.document.querySelector('[data-home-subtitle]')?.textContent || '';
    result.sample = homeText.slice(0, 180);
    result.latestRequestVisible = window.document.querySelectorAll('#home-request-list .receive-row').length > 0;
    result.pass = !/저장된 주문내역이 없습니다/.test(homeText) && homeText.length > 0
      && expectedHomeMemos[userName].every((label) => result.memoLabels.includes(label))
      && result.latestRequestVisible;
  } else if (page.file === 'history.html') {
    const text = window.document.querySelector('#history-list')?.textContent?.replace(/\s+/g, ' ').trim() || '';
    result.sample = text.slice(0, 180);
    result.pass = !/저장된 주문내역이 없습니다/.test(text) && text.length > 0;
  } else if (page.file === 'order.html') {
    const text = window.document.querySelector('#items-list')?.textContent?.replace(/\s+/g, ' ').trim() || '';
    result.checked = window.document.querySelectorAll('#items-list input[type="checkbox"]:checked').length;
    result.hasDriedVegetables = text.includes('Dried Vegetables');
    result.hasKoreanDriedVegetables = text.includes('건나물');
    result.sample = text.slice(0, 180);
    if (userName === 'admin' && language === 'ko') {
      const checkedBeforeClear = window.document.querySelectorAll('#items-list input[data-item]:checked').length;
      [...window.document.querySelectorAll('#items-list input[data-item]:checked')].forEach((input) => input.click());
      const historyCountBeforeEmptySave = window.Store.getHistory().length;
      const standaloneMemosBeforeEmptySave = window.Store.getStandaloneMemos?.() || [];
      const memoCountBeforeEmptySave = standaloneMemosBeforeEmptySave.length;
      const historyIdsBeforeEmptySave = new Set(window.Store.getHistory().map((entry) => entry.id));
      window.document.querySelector('#memo').value = '';
      window.document.querySelector('#save-create-message')?.click();
      result.emptyRequestBlocked = window.Store.getHistory().length === historyCountBeforeEmptySave
        && (window.Store.getStandaloneMemos?.().length || 0) === memoCountBeforeEmptySave
        && window.document.querySelectorAll('.department-message-card').length === 0
        && window.document.querySelector('#request-total-summary')?.classList.contains('hidden');
      window.document.querySelector('#cancel-order')?.click();
      await waitUntil(() => window.document.querySelectorAll('#items-list input[data-item]:checked').length === checkedBeforeClear);
      result.cancelRestoresLatestRequest = window.document.querySelectorAll('#items-list input[data-item]:checked').length === checkedBeforeClear;
      [...window.document.querySelectorAll('#items-list input[data-item]:checked')].forEach((input) => input.click());
      window.document.querySelector('#memo').value = '메모만 저장 테스트';
      window.document.querySelector('#save-create-message')?.click();
      const memoOnlyEntry = window.Store.getHistory().find((entry) => (entry.memo || '').includes('메모만 저장 테스트'));
      result.memoOnlyCreatesHistory = window.Store.getHistory().length === historyCountBeforeEmptySave
        && Boolean(memoOnlyEntry)
        && (memoOnlyEntry.items || []).length === 0
        && (window.Store.getStandaloneMemos?.().length || 0) === memoCountBeforeEmptySave
        && window.document.querySelector('#request-total-summary')?.classList.contains('hidden');
      await window.Store.setStandaloneMemos?.(standaloneMemosBeforeEmptySave);
      window.document.querySelector('#memo').value = '';
      const historyIdsBeforeMessage = new Set(window.Store.getHistory().map((entry) => entry.id));
      const chosenTargets = new Set();
      [...window.document.querySelectorAll('#items-list input[data-item]')].forEach((input) => {
        const target = input.closest('[data-request-item-row]')?.dataset.itemTarget;
        if (!target || chosenTargets.has(target)) return;
        chosenTargets.add(target);
        input.click();
      });
      window.document.querySelector('#memo').value = '테스트 메모';
      window.document.querySelector('#save-create-message')?.click();
      await waitUntil(() => window.document.querySelectorAll('.department-message-card').length === 3);
      const messageText = window.document.querySelector('#department-message-panel')?.textContent || '';
      const requestTotalSummary = window.document.querySelector('#request-total-summary')?.textContent || '';
      const messageLines = messageText.split(/\n+/).map((line) => line.trim()).filter(Boolean);
      result.departmentMessageCards = window.document.querySelectorAll('.department-message-card').length;
      result.kakaoLinks = window.document.querySelectorAll('a[href="kakaotalk://"]').length;
      result.copyOpenKakaoButtons = window.document.querySelectorAll('[data-copy-open-kakao]').length;
      result.standaloneCopyButtons = window.document.querySelectorAll('[data-copy-department-message]').length;
      result.requestTotalSummary = requestTotalSummary;
      result.categoryMessageLines = messageLines.filter((line) => /^[^:]+: .+/.test(line)).length;
      result.messageTestPass = ['카페테리아', '야채', '매장'].every((target) => messageText.includes(target))
        && messageText.includes('[ 먹자 ]')
        && result.categoryMessageLines >= 3
        && messageText.includes('필요합니다')
        && !messageText.includes('테스트 메모')
        && requestTotalSummary.includes('총 3개의 품목을 요청합니다.')
        && messageText.includes('문자 복사 / 카톡 열기')
        && result.kakaoLinks === 3
        && result.copyOpenKakaoButtons === 3
        && result.standaloneCopyButtons === 0;
      const createdRequestIds = window.Store.getHistory()
        .filter((entry) => !historyIdsBeforeMessage.has(entry.id))
        .map((entry) => entry.id);
      for (const id of createdRequestIds) {
        try { await req(`/history/${encodeURIComponent(id)}`, { method: 'DELETE' }); } catch {}
      }
      if (createdRequestIds.length) {
        window.Store.setHistory(window.Store.getHistory().filter((entry) => !createdRequestIds.includes(entry.id)));
      }
      const viewCategoryRow = window.document.querySelector('[data-request-category-row]');
      const viewToggle = viewCategoryRow?.querySelector('[data-request-category-action="toggle"]');
      const viewItemCount = viewCategoryRow?.querySelectorAll('[data-request-item-row]').length || 0;
      viewToggle?.click();
      await waitUntil(() => window.document.querySelector('[data-request-category-row]')?.classList.contains('is-collapsed'));
      const viewCollapsedRow = window.document.querySelector('[data-request-category-row].is-collapsed');
      result.requestViewCollapseWorks = Boolean(viewCollapsedRow)
        && viewItemCount > 0
        && viewCollapsedRow.querySelectorAll('[data-request-item-row]').length === 0
        && Boolean(viewCollapsedRow.querySelector('[data-request-category-action="toggle"]'))
        && !viewCollapsedRow.querySelector('[data-request-category-drag-handle]');
      viewCollapsedRow?.querySelector('[data-request-category-action="toggle"]')?.click();
      await waitUntil(() => !window.document.querySelector('[data-request-category-row]')?.classList.contains('is-collapsed'));
      window.document.querySelector('#order-mode-edit')?.click();
      await waitUntil(() => window.document.querySelector('[data-order-item-action="create"]'));
      window.document.querySelector('#bulk-jump-top')?.click();
      result.topJumpFocusesTitle = window.document.querySelector('#order-panel .page-header')?.classList.contains('is-jump-focused') || false;
      const collapseRow = window.document.querySelector('[data-request-category-row]');
      const collapseToggle = collapseRow?.querySelector('[data-request-category-action="toggle"]');
      const rowItemCountBeforeCollapse = collapseRow?.querySelectorAll('[data-request-item-row]').length || 0;
      collapseToggle?.click();
      await waitUntil(() => window.document.querySelector('[data-request-category-row]')?.classList.contains('is-collapsed'));
      const collapsedRow = window.document.querySelector('[data-request-category-row].is-collapsed');
      result.categoryCollapseWorks = Boolean(collapsedRow)
        && rowItemCountBeforeCollapse > 0
        && collapsedRow.querySelectorAll('[data-request-item-row]').length === 0
        && !collapsedRow.querySelector('[data-order-item-action="create"]')
        && !collapsedRow.querySelector('[data-request-category-action="edit"]')
        && Boolean(collapsedRow.querySelector('[data-request-category-drag-handle]'))
        && Boolean(collapsedRow.querySelector('[data-request-category-action="toggle"]'));
      collapsedRow?.querySelector('[data-request-category-action="focus"]')?.click();
      result.categoryTitleFocusWorks = collapsedRow?.classList.contains('is-jump-focused') || false;
      collapsedRow?.querySelector('[data-request-category-action="toggle"]')?.click();
      await waitUntil(() => !window.document.querySelector('[data-request-category-row]')?.classList.contains('is-collapsed'));
      const targetToggle = window.document.querySelector('[data-request-target-action="toggle"]');
      const targetName = targetToggle?.dataset.categoryTarget || '';
      const currentTargetSection = () => [...window.document.querySelectorAll('[data-request-target-action="toggle"]')]
        .find((button) => button.dataset.categoryTarget === targetName)
        ?.closest('.request-target-group');
      const currentTargetToggle = () => currentTargetSection()?.querySelector('[data-request-target-action="toggle"]');
      const targetRows = () => [...(currentTargetSection()?.querySelectorAll('[data-request-category-row]') || [])];
      result.categoryAddIconButton = Boolean(currentTargetSection()?.querySelector('.request-category-add-icon[data-request-category-action="create"]'))
        && !currentTargetSection()?.querySelector('.request-category-add-text');
      currentTargetToggle()?.click();
      await waitUntil(() => targetRows().length > 0 && targetRows().every((row) => row.classList.contains('is-collapsed')));
      result.targetCollapseWorks = targetRows().length > 0
        && targetRows().every((row) => row.classList.contains('is-collapsed'))
        && targetRows().every((row) => !row.querySelector('[data-order-item-action="create"]') && !row.querySelector('[data-request-category-action="edit"]'));
      currentTargetToggle()?.click();
      await waitUntil(() => targetRows().some((row) => !row.classList.contains('is-collapsed')));
      const createButton = window.document.querySelector('[data-order-item-action="create"]');
      const duplicateTarget = createButton?.dataset.orderItemTarget || '';
      const duplicateCategory = createButton?.dataset.orderItemCategory || '';
      const duplicateRow = [...window.document.querySelectorAll('[data-request-item-row]')]
        .find((row) => row.dataset.itemTarget === duplicateTarget && row.dataset.itemCategory === duplicateCategory);
      const duplicateName = duplicateRow?.querySelector('strong')?.textContent?.trim() || '';
      const ingredientCountBefore = window.Store.getIngredients().length;
      createButton?.click();
      await waitUntil(() => window.document.querySelector('[data-order-item-form="__new__"]'));
      const ingredientForm = window.document.querySelector('[data-order-item-form="__new__"]');
      ingredientForm.querySelector('[data-order-item-name-ko]').value = '';
      ingredientForm.querySelector('[data-order-item-name-en]').value = 'Required English';
      ingredientForm.querySelector('[data-order-item-action="save"]')?.click();
      const ingredientKoreanRequiredBlocked = alerts.some((message) => message.includes('품목 한글명'))
        && window.Store.getIngredients().length === ingredientCountBefore;
      ingredientForm.querySelector('[data-order-item-name-ko]').value = '필수 입력 테스트';
      ingredientForm.querySelector('[data-order-item-name-en]').value = '';
      ingredientForm.querySelector('[data-order-item-action="save"]')?.click();
      const ingredientEnglishRequiredBlocked = alerts.some((message) => message.includes('품목 영문명'))
        && window.Store.getIngredients().length === ingredientCountBefore;
      result.requiredIngredientNamesBlocked = ingredientKoreanRequiredBlocked && ingredientEnglishRequiredBlocked;
      ingredientForm.querySelector('[data-order-item-name-ko]').value = duplicateName;
      ingredientForm.querySelector('[data-order-item-name-en]').value = 'Duplicate Test';
      ingredientForm.querySelector('[data-order-item-action="save"]')?.click();
      result.duplicateIngredientBlocked = alerts.some((message) => message.includes('이미 같은 품목명'))
        && window.Store.getIngredients().length === ingredientCountBefore;
      result.dragLockedWhileEditFormOpen = window.document.querySelectorAll('[data-request-item-row][draggable="true"], [data-request-category-row][draggable="true"]').length === 0;
    }
    result.pass = ['admin','restaurant'].includes(userName) ? text.length > 0 && !/권한/.test(text) : /권한/.test(text);
    if (result.emptyRequestBlocked === false) result.pass = false;
    if (result.memoOnlyCreatesHistory === false) result.pass = false;
    if (result.cancelRestoresLatestRequest === false) result.pass = false;
    if (result.messageTestPass === false) result.pass = false;
    if (result.requestViewCollapseWorks === false) result.pass = false;
    if (result.categoryCollapseWorks === false) result.pass = false;
    if (result.categoryAddIconButton === false) result.pass = false;
    if (result.targetCollapseWorks === false) result.pass = false;
    if (result.topJumpFocusesTitle === false) result.pass = false;
    if (result.categoryTitleFocusWorks === false) result.pass = false;
    if (result.requiredIngredientNamesBlocked === false) result.pass = false;
    if (result.duplicateIngredientBlocked === false) result.pass = false;
    if (result.dragLockedWhileEditFormOpen === false) result.pass = false;
  } else if (page.file === 'menu.html') {
    const text = window.document.querySelector('#menu-list')?.textContent?.replace(/\s+/g, ' ').trim() || '';
    result.sample = text.slice(0, 180);
    if (['admin','restaurant'].includes(userName)) {
      const menuCategory = window.document.querySelector('[data-menu-category-row]');
      const menuToggle = menuCategory?.querySelector('[data-menu-category-action="toggle"]');
      const menuRowCount = menuCategory?.querySelectorAll('[data-menu]').length || 0;
      menuToggle?.click();
      await waitUntil(() => window.document.querySelector('[data-menu-category-row]')?.classList.contains('is-collapsed'));
      const collapsedMenuCategory = window.document.querySelector('[data-menu-category-row].is-collapsed');
      result.menuCategoryCollapseWorks = Boolean(collapsedMenuCategory)
        && menuRowCount > 0
        && collapsedMenuCategory.querySelectorAll('[data-menu]').length === 0
        && Boolean(collapsedMenuCategory.querySelector('[data-menu-category-action="toggle"]'))
        && !collapsedMenuCategory.querySelector('[data-menu-action="create"]');
      collapsedMenuCategory?.querySelector('[data-menu-category-action="toggle"]')?.click();
      await waitUntil(() => !window.document.querySelector('[data-menu-category-row]')?.classList.contains('is-collapsed'));
    }
    if (userName === 'admin' && language === 'ko') {
      window.document.querySelector('#menu-mode-edit')?.click();
      await waitUntil(() => window.document.querySelector('[data-menu-action="create"]'));
      const duplicateName = window.document.querySelector('[data-menu] strong')?.textContent?.trim() || '';
      const menuCountBefore = window.Store.getMenus().length;
      window.document.querySelector('[data-menu-action="create"]')?.click();
      await waitUntil(() => window.document.querySelector('[data-menu-form="__new__"]'));
      const menuForm = window.document.querySelector('[data-menu-form="__new__"]');
      menuForm.querySelector('[data-menu-name-ko]').value = '';
      menuForm.querySelector('[data-menu-name-en]').value = 'Required English';
      menuForm.querySelector('[data-menu-action="save"]')?.click();
      const menuKoreanRequiredBlocked = alerts.some((message) => message.includes('메뉴 한글명'))
        && window.Store.getMenus().length === menuCountBefore;
      menuForm.querySelector('[data-menu-name-ko]').value = '필수 메뉴 테스트';
      menuForm.querySelector('[data-menu-name-en]').value = '';
      menuForm.querySelector('[data-menu-action="save"]')?.click();
      const menuEnglishRequiredBlocked = alerts.some((message) => message.includes('메뉴 영문명'))
        && window.Store.getMenus().length === menuCountBefore;
      result.requiredMenuNamesBlocked = menuKoreanRequiredBlocked && menuEnglishRequiredBlocked;
      menuForm.querySelector('[data-menu-name-ko]').value = duplicateName;
      menuForm.querySelector('[data-menu-name-en]').value = 'Duplicate Menu';
      menuForm.querySelector('[data-menu-action="save"]')?.click();
      result.duplicateMenuBlocked = alerts.some((message) => message.includes('이미 같은 메뉴명'))
        && window.Store.getMenus().length === menuCountBefore;
    }
    result.pass = ['admin','restaurant'].includes(userName) ? text.length > 0 && !/권한/.test(text) : /권한/.test(text);
    if (result.menuCategoryCollapseWorks === false) result.pass = false;
    if (result.requiredMenuNamesBlocked === false) result.pass = false;
    if (result.duplicateMenuBlocked === false) result.pass = false;
  } else if (page.file === 'recipes.html') {
    const text = window.document.querySelector('#recipe-list')?.textContent?.replace(/\s+/g, ' ').trim() || '';
    result.sample = text.slice(0, 180);
    result.pass = text.length > 0 && !/레시피가 없습니다/.test(text);
  } else if (page.file === 'admin.html') {
    result.adminHidden = window.document.querySelector('#admin-panel')?.classList.contains('hidden');
    const adminText = window.document.querySelector('#admin-panel')?.textContent || '';
    result.departmentManagementVisible = Boolean(window.document.querySelector('#department-list')) &&
      (window.document.querySelector('#department-list')?.textContent || '').includes('카페테리아');
    result.adminSectionOrder = ['부서 관리', '비밀번호 관리', '데이터 백업'].every((label) => adminText.includes(label)) &&
      adminText.indexOf('부서 관리') < adminText.indexOf('비밀번호 관리') &&
      adminText.indexOf('비밀번호 관리') < adminText.indexOf('데이터 백업');
    const departmentText = window.document.querySelector('#department-list')?.textContent || '';
    result.departmentListLanguageClean = userName !== 'admin' || (!departmentText.includes('Cafeteria') && !departmentText.includes('사용') && !departmentText.includes('Enabled'));
    result.hiddenCsvBackupFunction = typeof window.Store.createCsvBackupBundle === 'function' &&
      !adminText.includes('전체 백업') &&
      !adminText.includes('Full Backup');
    if (userName === 'admin') {
      const sectionToggle = window.document.querySelector('[data-admin-section-toggle="departments"]');
      sectionToggle?.click();
      await waitUntil(() => sectionToggle.closest('.admin-section')?.classList.contains('is-collapsed'));
      result.adminSectionCollapseWorks = Boolean(sectionToggle.closest('.admin-section')?.classList.contains('is-collapsed'))
        && !window.document.querySelector('#department-list')?.checkVisibility?.();
      sectionToggle?.click();
      await waitUntil(() => !sectionToggle.closest('.admin-section')?.classList.contains('is-collapsed'));
      const backupBundle = await window.Store.createCsvBackupBundle();
      result.hiddenCsvBackupWorks = Array.isArray(backupBundle) &&
        backupBundle.length >= 8 &&
        backupBundle.some((file) => file.filename.includes('departments') && file.text.includes('카페테리아')) &&
        backupBundle.some((file) => file.filename.includes('access-accounts'));
    }
    result.pass = userName === 'admin' ? result.adminHidden === false : result.adminHidden === true;
    if (userName === 'admin' && result.departmentManagementVisible === false) result.pass = false;
    if (userName === 'admin' && result.adminSectionOrder === false) result.pass = false;
    if (userName === 'admin' && result.departmentListLanguageClean === false) result.pass = false;
    if (userName === 'admin' && result.hiddenCsvBackupFunction === false) result.pass = false;
    if (userName === 'admin' && result.hiddenCsvBackupWorks === false) result.pass = false;
    if (userName === 'admin' && result.adminSectionCollapseWorks === false) result.pass = false;
  }
  return result;
}

(async () => {
  const seedId = `user-flow-${Date.now()}`;
  const results = [];
  try {
    await req('/history', { method: 'POST', body: JSON.stringify({ entry: seededEntry(seedId) }) });
    for (const [userName, session] of Object.entries(users)) {
      for (const page of pages) {
        try { results.push(await runPage(userName, session, page)); }
        catch (error) { results.push({ user: userName, page: page.file, pass: false, fatal: error.message }); }
      }
    }
    const englishOrder = await runPage('admin', users.admin, pages.find((page) => page.file === 'order.html'), 'en');
    englishOrder.check = 'English store category translation';
    englishOrder.pass = englishOrder.pass && englishOrder.hasDriedVegetables && !englishOrder.hasKoreanDriedVegetables;
    results.push(englishOrder);
  } finally {
    try { await req(`/history/${encodeURIComponent(seedId)}`, { method: 'DELETE' }); } catch (error) {
      results.push({ user: 'cleanup', page: 'api/history', pass: false, fatal: error.message });
    }
  }
  console.log(JSON.stringify(results, null, 2));
  process.exit(results.some((row) => !row.pass) ? 1 : 0);
})();
