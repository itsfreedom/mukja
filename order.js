(async function () {
  await Store.init();
  AppUI.renderSidebar("order");
  AppUI.registerServiceWorker();

  const session = Store.getAuth();
  const canCreateRequest = ["restaurant", "admin"].includes(session?.role);
  const selected = new Set();
  let editingEntry = null;
  let activeItemEdit = null;
  const addIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14" /><path d="M5 12h14" /></svg>';
  const editIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></svg>';
  const deleteIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h12" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M8 7l1 13h6l1-13" /><path d="M10 7V5h4v2" /></svg>';
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
    return [
      targetFor(item),
      categoryFor(item),
      item.section || "",
      item.nameKo || item.name || ""
    ].join("|");
  }

  function sameAuthor(memo) {
    if (!memo) return false;
    if (memo.role && memo.role === session?.role) return true;
    if (memo.department && Store.normalizeTargetName(memo.department) === Store.normalizeTargetName(session?.department)) return true;
    if (memo.authorLabel && Store.normalizeTargetName(memo.authorLabel) === Store.normalizeTargetName(session?.label)) return true;
    return false;
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

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function sectionForTargetCategory(target, category) {
    if (target === "야채") return "야채";
    if (target === "그로서리") return category || "기타";
    return category || "기타";
  }

  function itemForm(item = null, defaults = {}) {
    const target = item?.target || defaults.target || "카페테리아";
    const section = item?.section || sectionForTargetCategory(target, defaults.category || "기타");
    return `
      <div class="recipe-item-form order-item-form" data-order-item-form="${item?.id || "__new__"}">
        <label><span>품목명</span><input data-order-item-name-ko value="${escapeHtml(item?.nameKo || item?.name || "")}" /></label>
        <label><span>영문명</span><input data-order-item-name-en value="${escapeHtml(item?.nameEn || "")}" /></label>
        <label><span>부서</span><select data-order-item-target>
          ${Store.getTargets().map((name) => `<option value="${name}" ${name === target ? "selected" : ""}>${I18n.targetLabel(name)}</option>`).join("")}
        </select></label>
        <label><span>카테고리</span><input data-order-item-section value="${escapeHtml(section)}" /></label>
        <label><span>단위</span><input data-order-item-unit value="${escapeHtml(item?.unit || "")}" /></label>
        <div class="recipe-item-form-actions">
          <button class="button" data-order-item-action="save" data-order-item-id="${item?.id || ""}" type="button">저장</button>
          <button class="danger-button ${item ? "" : "hidden"}" data-order-item-action="delete" data-order-item-id="${item?.id || ""}" type="button">삭제</button>
          <button class="ghost-button" data-order-item-action="cancel" type="button">취소</button>
        </div>
      </div>
    `;
  }

  function saveItemFromForm(form, item = null) {
    const nameKo = form?.querySelector("[data-order-item-name-ko]")?.value.trim() || "";
    if (!nameKo) {
      setStatus("품목명을 입력하세요.");
      return;
    }
    const target = form.querySelector("[data-order-item-target]")?.value || "카페테리아";
    const section = form.querySelector("[data-order-item-section]")?.value.trim() || "기타";
    const nextItem = {
      ...(item || {}),
      id: item?.id || Store.id("item"),
      name: nameKo,
      nameKo,
      nameEn: form.querySelector("[data-order-item-name-en]")?.value.trim() || "",
      target,
      section,
      unit: form.querySelector("[data-order-item-unit]")?.value.trim() || item?.unit || "",
      enabled: item?.enabled !== false
    };
    const rows = Store.getIngredients();
    Store.setIngredients(rows.some((row) => row.id === nextItem.id)
      ? rows.map((row) => row.id === nextItem.id ? nextItem : row)
      : [...rows, nextItem]);
    activeItemEdit = null;
    renderItems();
  }

  function latestRequestEntry() {
    return Store.getHistory()
      .slice()
      .sort((a, b) => `${b.date || ""} ${b.time || ""}`.localeCompare(`${a.date || ""} ${a.time || ""}`))[0] || null;
  }

  function loadLatestRequest() {
    if (!canCreateRequest) return;
    editingEntry = latestRequestEntry();
    selected.clear();
    (editingEntry?.items || []).forEach((item) => selected.add(itemKey(item)));
    const memos = Array.isArray(editingEntry?.memos) ? editingEntry.memos : [];
    const editableMemo = memos.find(sameAuthor);
    els.memo.value = editableMemo?.text || (!memos.length ? editingEntry?.memo || "" : "");
  }

  function itemActions(item) {
    return `
      <div class="menu-row-actions request-row-actions">
        <button class="menu-row-action is-edit" data-order-item-action="edit" data-order-item-id="${item.id}" type="button" aria-label="${I18n.itemName(item)} 수정">${editIcon}</button>
        <button class="menu-row-action is-danger" data-order-item-action="delete" data-order-item-id="${item.id}" type="button" aria-label="${I18n.itemName(item)} 삭제">${deleteIcon}</button>
      </div>
    `;
  }

  function renderItemRows(items) {
    return `
      <div class="item-section-list">
        ${items.map((item) => `
          <article class="list-card request-item-row">
            <label class="request-item-check">
              <input type="checkbox" data-item="${itemKey(item)}" ${selected.has(itemKey(item)) ? "checked" : ""} />
              <span class="receive-row-main">
                <strong>${I18n.itemName(item)}</strong>
              </span>
            </label>
            ${itemActions(item)}
          </article>
          ${activeItemEdit?.id === item.id ? itemForm(item) : ""}
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
        <section class="department-group request-target-group">
          <div class="section-title-row menu-category-title-row">
            <h2>${I18n.targetLabel(target)}</h2>
          </div>
          <hr class="section-divider department-divider" />
          <div class="department-card request-target-section">
            ${categories.map((category) => `
              <section class="item-section home-request-section request-category-section">
                <div class="section-title-row request-category-title-row">
                  <h3>${I18n.sectionLabel(category)}</h3>
                  <button class="menu-row-action is-create" data-order-item-action="create" data-order-item-target="${escapeHtml(target)}" data-order-item-category="${escapeHtml(category)}" type="button" aria-label="${I18n.sectionLabel(category)} 품목 추가">${addIcon}</button>
                </div>
                <hr class="section-divider section-title-divider" />
                ${renderItemRows(categoryGroups[category])}
                ${activeItemEdit?.isNew && activeItemEdit.target === target && activeItemEdit.category === category ? itemForm(null, activeItemEdit) : ""}
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
    els.list.querySelectorAll("[data-order-item-action]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const action = button.dataset.orderItemAction;
        const item = Store.getIngredients().find((row) => row.id === button.dataset.orderItemId);
        if (action === "create") {
          activeItemEdit = {
            isNew: true,
            target: button.dataset.orderItemTarget,
            category: button.dataset.orderItemCategory
          };
          renderItems();
          return;
        }
        if (action === "edit") {
          activeItemEdit = activeItemEdit?.id === item?.id ? null : { id: item?.id };
          renderItems();
          return;
        }
        if (action === "cancel") {
          activeItemEdit = null;
          renderItems();
          return;
        }
        if (action === "save") {
          saveItemFromForm(button.closest("[data-order-item-form]"), item || null);
          return;
        }
        if (action === "delete" && item) {
          if (!window.confirm(`${I18n.itemName(item)} 품목을 삭제할까요?`)) return;
          Store.setIngredients(Store.getIngredients().filter((row) => row.id !== item.id));
          selected.delete(itemKey(item));
          activeItemEdit = null;
          renderItems();
        }
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
    if (!items.length && !memo && !editingEntry) {
      setStatus(I18n.t("chooseItemOrMemo"));
      return;
    }
    const existingMemos = Array.isArray(editingEntry?.memos) ? editingEntry.memos : [];
    const memos = [
      ...existingMemos.filter((row) => !sameAuthor(row)),
      ...(memo ? [memo] : [])
    ];
    const entry = {
      ...(editingEntry || {}),
      id: editingEntry?.id || Store.id("history"),
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
    editingEntry = entry;
    setStatus(I18n.t("saved"));
  }

  function resetForm() {
    if (!window.confirm(I18n.t("confirmResetRequest"))) return;
    selected.clear();
    els.memo.value = "";
    renderItems();
  }

  els.save.addEventListener("click", () => saveRequest());
  els.reset.addEventListener("click", resetForm);
  loadLatestRequest();
  renderItems();
  I18n.applyI18n();
})();
