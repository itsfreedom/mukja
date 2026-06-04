(async function () {
  await Store.init();
  AppUI.renderSidebar("order");
  AppUI.registerServiceWorker();

  const session = Store.getAuth();
  const canCreateRequest = ["restaurant", "admin"].includes(session?.role);
  const selected = new Set();
  const els = {
    list: document.getElementById("items-list"),
    memo: document.getElementById("memo"),
    status: document.getElementById("status"),
    save: document.getElementById("save-create-message"),
    reset: document.getElementById("reset-order")
  };

  function setStatus(text) {
    els.status.textContent = text || "";
    if (text) setTimeout(() => (els.status.textContent = ""), 2600);
  }

  function itemKey(item) {
    return item.id || `${item.target}|${item.section}|${item.nameKo || item.name}`;
  }

  function memoLabel(memo) {
    if (memo.authorLabel) return I18n.roleLabel(memo.authorLabel);
    if (memo.department) return I18n.targetLabel(memo.department);
    if (memo.role === "restaurant") return I18n.roleLabel("레스토랑");
    if (memo.role === "admin") return I18n.roleLabel("관리자");
    return I18n.t("memo");
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
          <label class="receive-row order-request-row">
            <input type="checkbox" data-item="${itemKey(item)}" ${selected.has(itemKey(item)) ? "checked" : ""} />
            <span class="receive-row-main">
              <strong>${I18n.itemName(item)}</strong>
            </span>
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
      els.reset.disabled = true;
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

  function saveRequest() {
    if (!canCreateRequest) return;
    const items = selectedItems();
    const memo = memoEntry();
    if (!items.length && !memo) {
      setStatus(I18n.t("chooseItemOrMemo"));
      return;
    }
    const memos = memo ? [memo] : [];
    const entry = {
      id: Store.id("history"),
      date: Store.today(),
      time: Store.nowTime(),
      mode: "simple",
      employee: session?.label || "",
      target: "",
      items,
      memos,
      memo: memos.map((row) => `[${row.authorLabel || row.role}] ${row.text}`).join("\n"),
      message: ""
    };
    entry.memo = memoText(memos);
    Store.saveHistoryEntry(entry);
    resetForm();
    setStatus(I18n.t("saved"));
  }

  function resetForm() {
    selected.clear();
    els.memo.value = "";
    renderItems();
  }

  els.save.addEventListener("click", () => saveRequest());
  els.reset.addEventListener("click", resetForm);
  renderItems();
  I18n.applyI18n();
})();
