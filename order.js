(async function () {
  await Store.init();
  AppUI.renderSidebar("order");
  AppUI.registerServiceWorker();

  const state = {
    selected: new Map(),
    draftItems: [],
    messages: { cafeteria: "", grocery: "" },
    savedHistoryId: ""
  };
  const els = {
    orderPanel: document.getElementById("order-panel"),
    employee: document.getElementById("employee-select"),
    target: document.getElementById("target-filter"),
    list: document.getElementById("items-list"),
    memo: document.getElementById("memo"),
    cafeteriaPreview: document.getElementById("cafeteria-preview"),
    groceryPreview: document.getElementById("grocery-preview"),
    status: document.getElementById("status")
  };

  function setStatus(text) {
    els.status.textContent = text || "";
    if (text) setTimeout(() => (els.status.textContent = ""), 2800);
  }

  function renderFilters() {
    els.target.innerHTML = Store.getTargets().map((target) => `<option value="${target}">${I18n.targetLabel(target)}</option>`).join("");
    const employees = Store.getEmployees().filter((emp) => emp.enabled);
    els.employee.innerHTML = employees.map((emp) => `<option value="${emp.name}">${emp.name}</option>`).join("");
  }

  function renderMode() {
    const simple = Store.getMode() === "simple";
    document.body.classList.toggle("simple", simple);
  }

  function filteredItems() {
    const target = els.target.value;
    return Store.getIngredients().filter((item) => {
      if (!item.enabled) return false;
      if (item.target !== target) return false;
      return true;
    });
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

  function itemRow(item) {
    const selected = state.selected.get(item.id) || {};
    const simple = Store.getMode() === "simple";
    return `
      <label class="item-row">
        <input type="checkbox" data-item-check="${item.id}" ${selected.checked ? "checked" : ""} />
        <span class="item-main">
          <span class="item-name">${item.name}</span>
          ${simple ? "" : `<span class="item-meta">${els.target.value === "카페테리아" ? I18n.sectionLabel(item.section) : I18n.targetLabel(item.target)}</span>`}
        </span>
        <input class="normal-only" type="number" min="0" step="0.1" inputmode="decimal" data-item-qty="${item.id}" value="${selected.quantity || ""}" placeholder="${I18n.t("quantity")}" />
        <span class="badge normal-only">${item.unit}</span>
      </label>
    `;
  }

  function renderItems() {
    const items = filteredItems();
    if (!items.length) {
      els.list.innerHTML = `<div class="list-card muted">${I18n.t("noItems")}</div>`;
      return;
    }
    if (els.target.value === "카페테리아") {
      const groups = items.reduce((acc, item) => {
        acc[item.section] = acc[item.section] || [];
        acc[item.section].push(item);
        return acc;
      }, {});
      els.list.innerHTML = Store.getSections().filter((section) => groups[section]).map((section) => `
        <section class="item-section">
          <h3>${I18n.sectionLabel(section)}</h3>
          <div class="item-section-list">${groups[section].map(itemRow).join("")}</div>
        </section>
      `).join("");
      bindItemInputs();
      return;
    }
    els.list.innerHTML = items.map(itemRow).join("");
    bindItemInputs();
  }

  function selectedItems() {
    return Store.getIngredients().flatMap((item) => {
      const selected = state.selected.get(item.id);
      if (!selected || !selected.checked) return [];
      return [{ ...item, quantity: selected.quantity || "" }];
    });
  }

  function mergeItems(base, next) {
    const map = new Map();
    [...base, ...next].forEach((item) => {
      const key = item.id || `${item.target}|${item.name}|${item.unit}`;
      const prev = map.get(key);
      if (!prev) {
        map.set(key, { ...item });
        return;
      }
      map.set(key, { ...prev, quantity: item.quantity || prev.quantity || "" });
    });
    return Array.from(map.values());
  }

  function formatItems(items) {
    const simple = Store.getMode() === "simple";
    return items.map((item) => {
      if (simple) return `- ${item.name}`;
      return `- ${item.name} ${item.quantity || ""}${item.unit || ""}`.trim();
    }).join("\n");
  }

  function buildTargetMessage(title, items) {
    if (!items.length) return "";
    const date = Store.today();
    const memo = els.memo.value.trim();
    const employee = Store.getMode() === "normal" ? els.employee.value || "-" : "";
    if (I18n.lang() === "en") {
      return `[${title} Ingredient Request]\n\nDate: ${date}${employee ? `\nRequester: ${employee}` : ""}\n\nRequested Items:\n${formatItems(items)}\n\nMemo:\n${memo || "-"}\n\nPlease confirm.`;
    }
    return `[${title} 재료 요청]\n\n날짜: ${date}${employee ? `\n요청자: ${employee}` : ""}\n\n요청 품목:\n${formatItems(items)}\n\n메모:\n${memo || "-"}\n\n확인 부탁드립니다.`;
  }

  function buildMessages(items) {
    const cafeteria = items.filter((item) => item.target === "카페테리아");
    const grocery = items.filter((item) => item.target === "야채" || item.target === "그로서리");
    return {
      cafeteria: buildTargetMessage(I18n.t("cafeteria"), cafeteria),
      grocery: buildTargetMessage(I18n.t("vegetableGrocery"), grocery)
    };
  }

  function renderMessages() {
    state.messages = buildMessages(state.draftItems);
    els.cafeteriaPreview.value = state.messages.cafeteria;
    els.groceryPreview.value = state.messages.grocery;
    return state.messages;
  }

  function saveDraftToHistory() {
    if (!state.draftItems.length) return;
    const history = Store.getHistory();
    const entry = {
      id: state.savedHistoryId || Store.id("history"),
      date: Store.today(),
      time: Store.nowTime(),
      mode: Store.getMode(),
      employee: Store.getMode() === "normal" ? els.employee.value : "",
      target: "",
      items: state.draftItems,
      memo: els.memo.value.trim(),
      message: [state.messages.cafeteria, state.messages.grocery].filter(Boolean).join("\n\n---\n\n")
    };
    state.savedHistoryId = entry.id;
    Store.setHistory([entry, ...history.filter((row) => row.id !== entry.id)]);
  }

  function saveAndCreateMessage() {
    const items = selectedItems();
    if (!items.length) {
      setStatus(I18n.t("chooseAtLeastOne"));
      return;
    }
    state.draftItems = items;
    renderMessages();
    saveDraftToHistory();
    setStatus(I18n.t("saved"));
  }

  function addOrder() {
    const items = selectedItems();
    if (!items.length) {
      setStatus(I18n.t("chooseAtLeastOne"));
      return;
    }
    state.draftItems = mergeItems(state.draftItems, items);
    renderMessages();
    saveDraftToHistory();
    setStatus(I18n.t("saved"));
  }

  async function copyMessage(kind) {
    if (!state.messages[kind]) renderMessages();
    const message = state.messages[kind];
    if (!message) {
      setStatus(I18n.t("emptyMessage"));
      return;
    }
    await navigator.clipboard.writeText(message);
    setStatus(I18n.t("copied"));
  }

  function resetOrder() {
    state.selected.clear();
    state.draftItems = [];
    state.messages = { cafeteria: "", grocery: "" };
    state.savedHistoryId = "";
    els.memo.value = "";
    els.cafeteriaPreview.value = "";
    els.groceryPreview.value = "";
    renderItems();
  }

  document.getElementById("save-create-message").addEventListener("click", saveAndCreateMessage);
  document.getElementById("add-order").addEventListener("click", addOrder);
  document.getElementById("reset-order").addEventListener("click", resetOrder);
  document.getElementById("copy-cafeteria-message").addEventListener("click", () => copyMessage("cafeteria"));
  document.getElementById("copy-grocery-message").addEventListener("click", () => copyMessage("grocery"));
  els.target.addEventListener("change", renderItems);
  els.memo.addEventListener("input", () => {
    if (state.draftItems.length) renderMessages();
  });

  renderFilters();
  renderMode();
  renderItems();
  I18n.applyI18n();
})();
