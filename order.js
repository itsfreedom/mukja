(async function () {
  await Store.init();
  AppUI.renderSidebar("order");
  AppUI.registerServiceWorker();

  const session = Store.getAuth();
  const canAddOrder = session?.role === "restaurant" || session?.role === "admin";
  const state = {
    selected: new Map(),
    draftItems: [],
    savedHistoryId: "",
    memos: []
  };
  const els = {
    employee: document.getElementById("employee-select"),
    target: document.getElementById("target-filter"),
    list: document.getElementById("items-list"),
    memo: document.getElementById("memo"),
    memoLog: document.getElementById("memo-log"),
    status: document.getElementById("status"),
    addOrder: document.getElementById("add-order")
  };

  function setStatus(text) {
    els.status.textContent = text || "";
    if (text) setTimeout(() => (els.status.textContent = ""), 2800);
  }

  function allowedTargets() {
    return Store.getAllowedTargets();
  }

  function visibleMemos(entry) {
    const memos = Array.isArray(entry?.memos) ? entry.memos : [];
    if (session?.role === "restaurant" || session?.role === "admin") return memos;
    return memos.filter((memo) => ["restaurant", "admin"].includes(memo.role) || memo.department === session?.department);
  }

  function memoLabel(memo) {
    if (memo.authorLabel) return I18n.roleLabel(memo.authorLabel);
    if (memo.department) return I18n.targetLabel(memo.department);
    if (memo.role === "restaurant") return I18n.roleLabel("레스토랑");
    if (memo.role === "admin") return I18n.roleLabel("관리자");
    return I18n.t("memo");
  }

  function renderMemoLog() {
    if (!state.memos.length) {
      els.memoLog.innerHTML = `<div class="memo-empty">${I18n.t("noMemo")}</div>`;
      return;
    }
    els.memoLog.innerHTML = state.memos.map((memo) => `
      <article class="memo-entry">
        <div class="memo-entry-meta">
          <strong>${memoLabel(memo)}</strong>
          <span>${memo.createdAt ? new Date(memo.createdAt).toLocaleString(I18n.lang() === "en" ? "en-CA" : "ko-KR") : ""}</span>
        </div>
        <p>${memo.text}</p>
      </article>
    `).join("");
  }

  function loadLatestOrder() {
    const latest = Store.getHistory()[0];
    if (!latest) {
      state.memos = [];
      renderMemoLog();
      return;
    }
    state.savedHistoryId = latest.id;
    state.draftItems = latest.items || [];
    state.memos = visibleMemos(latest);
    state.draftItems.forEach((item) => {
      if (allowedTargets().includes(item.target)) {
        state.selected.set(item.id || `${item.target}|${item.name}`, { checked: true, quantity: item.quantity || "" });
      }
    });
    renderMemoLog();
  }

  function renderFilters() {
    els.target.innerHTML = allowedTargets().map((target) => `<option value="${target}">${I18n.targetLabel(target)}</option>`).join("");
    const employees = Store.getEmployees().filter((emp) => emp.enabled);
    els.employee.innerHTML = employees.map((emp) => `<option value="${emp.name}">${emp.name}</option>`).join("");
  }

  function renderMode() {
    document.body.classList.toggle("simple", Store.getMode() === "simple");
    els.addOrder.classList.toggle("hidden", !canAddOrder);
  }

  function targetItems(target) {
    return Store.getIngredients().filter((item) => item.enabled && item.target === target);
  }

  function bindItemInputs() {
    els.list.querySelectorAll("[data-item-check]").forEach((input) => {
      input.addEventListener("change", () => {
        const current = state.selected.get(input.dataset.itemCheck) || {};
        state.selected.set(input.dataset.itemCheck, { ...current, checked: input.checked });
      });
    });
    els.list.querySelectorAll("[data-item-qty]").forEach((input) => {
      input.addEventListener("input", () => {
        const current = state.selected.get(input.dataset.itemQty) || {};
        state.selected.set(input.dataset.itemQty, { ...current, quantity: input.value });
      });
    });
  }

  function itemKey(item) {
    return item.id || `${item.target}|${item.nameKo || item.name}|${item.unit}`;
  }

  function itemRow(item) {
    const selected = state.selected.get(itemKey(item)) || {};
    const simple = Store.getMode() === "simple";
    return `
      <label class="item-row">
        <input type="checkbox" data-item-check="${itemKey(item)}" ${selected.checked ? "checked" : ""} />
        <span class="item-main">
          <span class="item-name">${I18n.itemName(item)}</span>
          ${simple ? "" : `<span class="item-meta">${I18n.sectionLabel(item.section)}</span>`}
        </span>
        <input class="normal-only" type="number" min="0" step="0.1" inputmode="decimal" data-item-qty="${itemKey(item)}" value="${selected.quantity || ""}" placeholder="${I18n.t("quantity")}" />
        <span class="badge normal-only">${item.unit}</span>
      </label>
    `;
  }

  function renderTarget(target) {
    const items = targetItems(target);
    if (!items.length) return "";
    if (target !== "카페테리아") {
      return `
        <section class="request-target">
          ${allowedTargets().length > 1 ? `<h3>${I18n.targetLabel(target)}</h3>` : ""}
          <div class="item-section-list">${items.map(itemRow).join("")}</div>
        </section>
      `;
    }
    const groups = items.reduce((acc, item) => {
      const section = item.section;
      acc[section] = acc[section] || [];
      acc[section].push(item);
      return acc;
    }, {});
    const sections = Store.getSections().filter((section) => groups[section]);
    return `
      <section class="request-target">
        ${allowedTargets().length > 1 ? `<h3>${I18n.targetLabel(target)}</h3>` : ""}
        ${sections.map((section) => `
          <section class="item-section">
            <h3>${I18n.sectionLabel(section)}</h3>
            <div class="item-section-list">${groups[section].map(itemRow).join("")}</div>
          </section>
        `).join("")}
      </section>
    `;
  }

  function renderItems() {
    const html = allowedTargets().map(renderTarget).join("");
    els.list.innerHTML = html || `<div class="list-card muted">${I18n.t("noItems")}</div>`;
    bindItemInputs();
  }

  function selectedItems() {
    return Store.getIngredients().flatMap((item) => {
      const selected = state.selected.get(itemKey(item));
      if (!selected || !selected.checked) return [];
      return [{ ...item, quantity: selected.quantity || "" }];
    });
  }

  function mergeItems(base, next) {
    const map = new Map();
    [...base, ...next].forEach((item) => {
      const key = itemKey(item);
      const prev = map.get(key);
      map.set(key, prev ? { ...prev, quantity: item.quantity || prev.quantity || "" } : { ...item });
    });
    return Array.from(map.values());
  }

  function newMemo() {
    const text = els.memo.value.trim();
    if (!text) return null;
    return {
      id: Store.id("memo"),
      role: session?.role || "anonymous",
      department: session?.department || "",
      authorLabel: session?.label || "",
      text,
      createdAt: new Date().toISOString()
    };
  }

  function memoText(memos) {
    return memos.map((memo) => `[${memoLabel(memo)}] ${memo.text}`).join("\n");
  }

  function saveDraftToHistory(items) {
    const memo = newMemo();
    const existing = Store.getHistory().find((entry) => entry.id === state.savedHistoryId);
    const nextItems = items.length ? items : existing?.items || [];
    const allMemos = [...(Array.isArray(existing?.memos) ? existing.memos : []), ...(memo ? [memo] : [])];
    const entry = {
      ...(existing || {}),
      id: state.savedHistoryId || Store.id("history"),
      date: Store.today(),
      time: Store.nowTime(),
      mode: Store.getMode(),
      employee: Store.getMode() === "normal" ? els.employee.value : "",
      target: "",
      items: nextItems,
      memos: allMemos,
      memo: memoText(allMemos),
      message: ""
    };
    state.savedHistoryId = entry.id;
    state.draftItems = nextItems;
    state.memos = visibleMemos(entry);
    Store.saveHistoryEntry(entry);
    els.memo.value = "";
    renderMemoLog();
  }

  function saveRequest() {
    const items = selectedItems();
    if (!items.length && !els.memo.value.trim()) {
      setStatus(I18n.t("chooseItemOrMemo"));
      return;
    }
    saveDraftToHistory(items);
    setStatus(I18n.t("saved"));
  }

  function addOrder() {
    if (!canAddOrder) return;
    const items = selectedItems();
    if (!items.length) {
      setStatus(I18n.t("chooseAtLeastOne"));
      return;
    }
    saveDraftToHistory(mergeItems(state.draftItems, items));
    setStatus(I18n.t("saved"));
  }

  function resetOrder() {
    state.selected.clear();
    state.draftItems = [];
    els.memo.value = "";
    renderItems();
  }

  document.getElementById("save-create-message").addEventListener("click", saveRequest);
  els.addOrder.addEventListener("click", addOrder);
  document.getElementById("reset-order").addEventListener("click", resetOrder);

  renderFilters();
  renderMode();
  loadLatestOrder();
  renderItems();
  I18n.applyI18n();
})();
