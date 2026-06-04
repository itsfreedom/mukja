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
    save: document.getElementById("save-create-message")
  };

  function setStatus(text) {
    els.status.textContent = text || "";
    if (text) setTimeout(() => (els.status.textContent = ""), 2600);
  }

  function itemKey(item) {
    return item.id || `${item.target}|${item.section}|${item.nameKo || item.name}`;
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

  function saveRequest() {
    if (!canCreateRequest) return;
    const items = selectedItems();
    const memo = memoEntry();
    if (!items.length && !memo) {
      setStatus(I18n.t("chooseItemOrMemo"));
      return;
    }
    const memos = memo ? [memo] : [];
    Store.saveHistoryEntry({
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
    });
    selected.clear();
    els.memo.value = "";
    renderItems();
    setStatus(I18n.t("saved"));
  }

  els.save.addEventListener("click", saveRequest);
  renderItems();
  I18n.applyI18n();
})();
