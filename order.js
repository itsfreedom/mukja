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

  function sectionOrder(groups) {
    const configured = Store.getSections().filter((section) => groups[section]);
    const extra = Object.keys(groups).filter((section) => !configured.includes(section)).sort();
    return [...configured, ...extra];
  }

  function renderItems() {
    if (!canCreateRequest) {
      els.list.innerHTML = `<div class="list-card muted">${I18n.t("noAccess")}</div>`;
      els.memo.disabled = true;
      els.save.disabled = true;
      els.addOrder.disabled = true;
      return;
    }

    const groups = Store.getIngredients()
      .filter((item) => item.enabled)
      .reduce((acc, item) => {
        const section = item.section || "기타";
        acc[section] = acc[section] || [];
        acc[section].push(item);
        return acc;
      }, {});

    const sections = sectionOrder(groups);
    if (!sections.length) {
      els.list.innerHTML = `<div class="list-card muted">${I18n.t("noItems")}</div>`;
      return;
    }

    els.list.innerHTML = sections.map((section) => `
      <section class="item-section">
        <h3>${I18n.sectionLabel(section)}</h3>
        <div class="item-section-list">
          ${groups[section].map((item) => `
            <label class="item-row request-item-row">
              <input type="checkbox" data-item="${itemKey(item)}" ${selected.has(itemKey(item)) ? "checked" : ""} />
              <span class="item-main">
                <span class="item-name">${I18n.itemName(item)}</span>
              </span>
            </label>
          `).join("")}
        </div>
      </section>
    `).join("");

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
