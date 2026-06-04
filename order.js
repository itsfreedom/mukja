(async function () {
  await Store.init();
  AppUI.renderSidebar("order");
  AppUI.registerServiceWorker();

  const session = Store.getAuth();
  const canCreateRequest = ["restaurant", "admin"].includes(session?.role);
  const selected = new Set();
  let latestEntry = null;
  const els = {
    list: document.getElementById("items-list"),
    memo: document.getElementById("memo"),
    memoLog: document.getElementById("memo-log"),
    status: document.getElementById("status"),
    save: document.getElementById("save-create-message"),
    addOrder: document.getElementById("add-order")
  };

  function setStatus(text) {
    els.status.textContent = text || "";
    if (text) setTimeout(() => (els.status.textContent = ""), 2600);
  }

  function itemKey(item) {
    return item.id || `${item.target}|${item.section}|${item.nameKo || item.name}`;
  }

  function findLatestEntry() {
    latestEntry = Store.getHistory()
      .slice()
      .sort((a, b) => `${b.date} ${b.time || ""}`.localeCompare(`${a.date} ${a.time || ""}`))[0] || null;
  }

  function memoLabel(memo) {
    if (memo.authorLabel) return I18n.roleLabel(memo.authorLabel);
    if (memo.department) return I18n.targetLabel(memo.department);
    if (memo.role === "restaurant") return I18n.roleLabel("레스토랑");
    if (memo.role === "admin") return I18n.roleLabel("관리자");
    return I18n.t("memo");
  }

  function renderMemoLog() {
    const memos = Array.isArray(latestEntry?.memos) ? latestEntry.memos : [];
    if (!memos.length) {
      els.memoLog.innerHTML = `<div class="memo-empty">${I18n.t("noMemo")}</div>`;
      return;
    }
    els.memoLog.innerHTML = memos.map((memo) => `
      <article class="memo-entry">
        <div class="memo-entry-meta">
          <strong>${memoLabel(memo)}</strong>
          <span>${memo.createdAt ? new Date(memo.createdAt).toLocaleString(I18n.lang() === "en" ? "en-CA" : "ko-KR") : ""}</span>
        </div>
        <p>${memo.text || ""}</p>
      </article>
    `).join("");
  }

  function targetFor(item) {
    return item.target || "그로서리";
  }

  function categoryFor(item) {
    const target = targetFor(item);
    const section = item.section || "기타";
    if (target === "그로서리" && section === "식재료") return "상온";
    if (target === "그로서리" && ["상온", "냉장", "냉동", "기타"].includes(section)) return section;
    if (target === "그로서리") return "기타";
    if (target === "야채") return "야채";
    if (["반조리", "소스", "반찬", "냉장", "냉동", "기타"].includes(section)) return section;
    return "기타";
  }

  function orderedKeys(groups, order) {
    return [
      ...order.filter((key) => groups[key]),
      ...Object.keys(groups).filter((key) => !order.includes(key))
    ];
  }

  function renderItemRows(items) {
    return `
      <div class="order-request-list">
        ${items.map((item) => `
          <label class="history-detail-grid order-request-grid history-detail-row order-request-row">
            <strong>${I18n.itemName(item)}</strong>
            <span><input type="checkbox" data-item="${itemKey(item)}" ${selected.has(itemKey(item)) ? "checked" : ""} /></span>
          </label>
        `).join("")}
      </div>
    `;
  }

  function renderItems() {
    if (!canCreateRequest) {
      els.list.innerHTML = `<div class="list-card muted">${I18n.t("noAccess")}</div>`;
      els.memo.disabled = true;
      els.save.disabled = true;
      els.addOrder.disabled = true;
      return;
    }

    const targetOrder = ["카페테리아", "야채", "그로서리"];
    const categoryOrders = {
      "카페테리아": ["반조리", "소스", "반찬", "냉장", "냉동", "기타"],
      "야채": ["야채"],
      "그로서리": ["상온", "냉장", "냉동", "기타"]
    };
    const groups = Store.getIngredients()
      .reduce((acc, item) => {
        const target = targetFor(item);
        const category = categoryFor(item);
        acc[target] = acc[target] || {};
        acc[target][category] = acc[target][category] || [];
        acc[target][category].push(item);
        return acc;
      }, {});

    const targets = orderedKeys(groups, targetOrder);
    if (!targets.length) {
      els.list.innerHTML = `<div class="list-card muted">${I18n.t("noItems")}</div>`;
      return;
    }

    els.list.innerHTML = targets.map((target) => {
      const categoryGroups = groups[target];
      const categories = orderedKeys(categoryGroups, categoryOrders[target] || categoryOrders["카페테리아"]);
      return `
        <section class="order-target-group">
          <h2>${I18n.targetLabel(target)}</h2>
          <div class="history-detail-card order-target-card">
            ${categories.map((category) => `
              <section class="order-category-section">
                <h3>${I18n.sectionLabel(category)}</h3>
                <hr class="section-divider" />
                ${renderItemRows(categoryGroups[category])}
              </section>
            `).join("")}
          </div>
      </section>
      `;
    }).join("");

    els.list.querySelectorAll("[data-item]").forEach((input) => {
      input.addEventListener("change", () => {
        if (input.checked) selected.add(input.dataset.item);
        else selected.delete(input.dataset.item);
      });
    });
  }

  function selectedItems() {
    const ingredients = Store.getIngredients();
    return ingredients.filter((item) => selected.has(itemKey(item))).map((item) => ({
      ...item,
      quantity: "",
      received: false
    }));
  }

  function memoEntry() {
    const text = els.memo.value.trim();
    if (!text) return null;
    return {
      id: Store.id("memo"),
      role: session?.role || "",
      department: session?.department || "",
      authorLabel: session?.label || "",
      text,
      createdAt: new Date().toISOString()
    };
  }

  function memoText(memos) {
    return memos.map((memo) => `[${memoLabel(memo)}] ${memo.text}`).join("\n");
  }

  function mergeItems(base, next) {
    const map = new Map();
    [...base, ...next].forEach((item) => {
      const key = itemKey(item);
      map.set(key, { ...(map.get(key) || {}), ...item });
    });
    return Array.from(map.values());
  }

  function saveRequest({ appendToLatest = false } = {}) {
    if (!canCreateRequest) return;
    const items = selectedItems();
    const memo = memoEntry();
    if (!items.length && !memo) {
      setStatus(I18n.t("chooseItemOrMemo"));
      return;
    }
    const base = appendToLatest && latestEntry ? latestEntry : {};
    const baseMemos = Array.isArray(base.memos) ? base.memos : [];
    const memos = [...baseMemos, ...(memo ? [memo] : [])];
    const entry = {
      ...base,
      id: base.id || Store.id("history"),
      date: Store.today(),
      time: Store.nowTime(),
      mode: "simple",
      employee: session?.label || "",
      target: "",
      items: appendToLatest ? mergeItems(base.items || [], items) : items,
      memos,
      memo: memos.map((row) => `[${row.authorLabel || row.role}] ${row.text}`).join("\n"),
      message: ""
    };
    entry.memo = memoText(memos);
    Store.saveHistoryEntry(entry);
    latestEntry = entry;
    selected.clear();
    els.memo.value = "";
    renderMemoLog();
    renderItems();
    setStatus(I18n.t("saved"));
  }

  els.save.addEventListener("click", () => saveRequest());
  els.addOrder.addEventListener("click", () => saveRequest({ appendToLatest: true }));
  findLatestEntry();
  renderMemoLog();
  renderItems();
  I18n.applyI18n();
})();
