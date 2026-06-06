(async function () {
  await Store.init({ datasets: ["settings", "ingredients", "history"] });
  AppUI.renderSidebar("order");
  AppUI.registerServiceWorker();

  const session = Store.getAuth();
  const canCreateRequest = ["restaurant", "admin"].includes(session?.role);
  const canEditCatalog = session?.role === "admin";
  const selected = new Set();
  const editSelected = new Set();
  let requestMode = "order";
  let lastSelectedItemId = null;
  let templateEntry = null;
  let activeItemEdit = null;
  let activeCategoryEdit = null;
  let draggedCategory = null;
  let draggedItem = null;
  let activeDropElement = null;
  const addIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14" /><path d="M5 12h14" /></svg>';
  const editIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></svg>';
  const dragIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14" /><path d="m8 9 4-4 4 4" /><path d="m8 15 4 4 4-4" /></svg>';
  const els = {
    list: document.getElementById("items-list"),
    memo: document.getElementById("memo"),
    status: document.getElementById("status"),
    save: document.getElementById("save-create-message"),
    reset: document.getElementById("reset-order"),
    modeRow: document.getElementById("order-mode-row"),
    orderModeButton: document.getElementById("order-mode-order"),
    editModeButton: document.getElementById("order-mode-edit"),
    resetRow: document.getElementById("order-reset-row"),
    saveRow: document.getElementById("order-save-row"),
    messagePanel: document.getElementById("department-message-panel"),
    messageList: document.getElementById("department-message-list"),
    bulkPanel: document.getElementById("order-bulk-panel"),
    bulkTarget: document.getElementById("bulk-target"),
    bulkCategory: document.getElementById("bulk-category"),
    bulkJump: document.getElementById("bulk-jump"),
    bulkJumpTop: document.getElementById("bulk-jump-top"),
    bulkJumpPrev: document.getElementById("bulk-jump-prev"),
    bulkJumpNext: document.getElementById("bulk-jump-next"),
    bulkJumpBottom: document.getElementById("bulk-jump-bottom"),
    memoPanel: document.getElementById("order-memo-panel"),
    memoDivider: document.getElementById("order-memo-divider")
  };

  function isEditMode() {
    return canEditCatalog && requestMode === "edit";
  }

  function setStatus(text) {
    els.status.textContent = text || "";
    if (text) setTimeout(() => (els.status.textContent = ""), 2600);
  }

  function fillBulkTargets() {
    if (!els.bulkTarget) return;
    const current = els.bulkTarget.value || "카페테리아";
    els.bulkTarget.innerHTML = Store.getTargets().map((name) =>
      `<option value="${escapeHtml(name)}" ${name === current ? "selected" : ""}>${I18n.targetLabel(name)}</option>`
    ).join("");
    if (![...els.bulkTarget.options].some((option) => option.value === current)) {
      els.bulkTarget.value = "카페테리아";
    }
  }

  function fillBulkCategories() {
    if (!els.bulkTarget || !els.bulkCategory) return;
    els.bulkCategory.innerHTML = categoryOptions(els.bulkTarget.value || "카페테리아", els.bulkCategory.value);
  }

  function updateModeUI() {
    const edit = isEditMode();
    els.modeRow?.classList.toggle("hidden", !canEditCatalog);
    els.orderModeButton?.classList.toggle("is-active", !edit);
    els.editModeButton?.classList.toggle("is-active", edit);
    els.resetRow?.classList.toggle("hidden", edit || !canCreateRequest);
    els.saveRow?.classList.toggle("hidden", edit || !canCreateRequest);
    els.messagePanel?.classList.toggle("hidden", edit || !canCreateRequest || !els.messageList?.children.length);
    els.memoPanel?.classList.toggle("hidden", edit || !canCreateRequest);
    els.memoDivider?.classList.toggle("hidden", edit || !canCreateRequest);
    els.bulkPanel?.classList.toggle("hidden", !canCreateRequest);
    if (canCreateRequest) {
      fillBulkTargets();
      fillBulkCategories();
    }
  }

  function itemKey(item) {
    return [
      targetFor(item),
      categoryFor(item),
      item.category || item.section || "",
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
    const category = item.category || item.section || "기타";
    if (target === "그로서리" && category === "식재료") return "상온";
    if (target === "그로서리" && Store.getRequestCategories("그로서리").includes(category)) return category;
    if (target === "그로서리") return "기타";
    if (target === "야채" && Store.getRequestCategories("야채").includes(category)) return category;
    if (target === "야채") return "야채";
    const cafeteriaSections = [...Store.getRequestCategories("카페테리아"), "기타"];
    if (cafeteriaSections.includes(category)) return category;
    return "기타";
  }

  function orderedKeys(groups, order) {
    return [
      ...order.filter((key) => groups[key]),
      ...Object.keys(groups).filter((key) => !order.includes(key))
    ];
  }

  function uniqueList(items) {
    return [...new Set((items || []).filter(Boolean))];
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function sectionForTargetCategory(target, category) {
    if (target === "그로서리") return category || "기타";
    if (target === "야채") return category || "야채";
    return category || "기타";
  }

  function categoriesForTarget(target) {
    return uniqueList([
      ...Store.getRequestCategories(target),
      ...(target === "야채" ? ["야채"] : ["기타"])
    ]);
  }

  function categoryOptions(target, selectedCategory = "") {
    const categories = categoriesForTarget(target);
    const selected = categories.includes(selectedCategory)
      ? selectedCategory
      : sectionForTargetCategory(target, categories[0]);
    return categories.map((category) =>
      `<option value="${escapeHtml(category)}" ${category === selected ? "selected" : ""}>${I18n.sectionLabel(category)}</option>`
    ).join("");
  }

  function categoryKey(target, category) {
    return `${target}|${category || ""}`;
  }

  function categoryForm(target, category = "", mode = "edit") {
    const isNew = mode === "create";
    const fallback = target === "야채" ? "야채" : "기타";
    const canDelete = !isNew && category !== fallback;
    return `
      <div class="recipe-item-form request-category-form" data-request-category-form data-category-target="${escapeHtml(target)}" data-category-old-name="${escapeHtml(category)}" data-category-mode="${mode}">
        <label><span>${I18n.t("categoryName")}</span><input data-request-category-name value="${escapeHtml(category)}" placeholder="${I18n.t("categoryName")}" /></label>
        <div class="recipe-item-form-actions">
          <button class="button" data-request-category-action="save" type="button">${I18n.t("save")}</button>
          <button class="danger-button ${canDelete ? "" : "hidden"}" data-request-category-action="delete" type="button">${I18n.t("delete")}</button>
          <button class="ghost-button" data-request-category-action="cancel" type="button">${I18n.t("close")}</button>
        </div>
      </div>
    `;
  }

  function saveCategoryFromForm(form) {
    const target = form?.dataset.categoryTarget || "카페테리아";
    const oldName = form?.dataset.categoryOldName || "";
    const mode = form?.dataset.categoryMode || "edit";
    const nextName = form?.querySelector("[data-request-category-name]")?.value.trim() || "";
    if (!nextName) {
      setStatus(I18n.t("categoryRequired"));
      return;
    }
    const categories = Store.getRequestCategories(target);
    if (categories.includes(nextName) && nextName !== oldName) {
      setStatus(I18n.t("categoryDuplicate"));
      return;
    }
    if (mode !== "create") {
      Store.setIngredients(Store.getIngredients().map((item) =>
        targetFor(item) === target && ((item.category || item.section || "기타") === oldName || categoryFor(item) === oldName) ? { ...item, category: nextName } : item
      ));
    }
    Store.setRequestCategories(target, mode === "create"
      ? [...categories, nextName]
      : categories.includes(oldName)
        ? categories.map((category) => category === oldName ? nextName : category)
        : [...categories, nextName]);
    activeCategoryEdit = null;
    renderItems();
  }

  function deleteCategoryFromForm(form) {
    const target = form?.dataset.categoryTarget || "카페테리아";
    const oldName = form?.dataset.categoryOldName || "";
    if (!oldName) return;
    const fallback = target === "야채" ? "야채" : "기타";
    if (!window.confirm(I18n.format("confirmDeleteCategory", { name: I18n.sectionLabel(oldName), fallback: I18n.sectionLabel(fallback) }))) return;
    Store.setRequestCategories(target, Store.getRequestCategories(target).filter((category) => category !== oldName));
    Store.setIngredients(Store.getIngredients().map((item) =>
      targetFor(item) === target && categoryFor(item) === oldName ? { ...item, category: fallback } : item
    ));
    activeCategoryEdit = null;
    renderItems();
  }

  function saveCategoryOrder(target, orderedCategories) {
    const existing = Store.getRequestCategories(target);
    const next = uniqueList([
      ...orderedCategories,
      ...existing.filter((category) => !orderedCategories.includes(category))
    ]);
    return Store.setRequestCategories(target, next);
  }

  function clearDropMarker() {
    if (!activeDropElement) return;
    activeDropElement.classList.remove("is-drop-before", "is-drop-after");
    activeDropElement = null;
  }

  function markDropPosition(row, event) {
    if (!row) return "before";
    const rect = row.getBoundingClientRect();
    const position = event.clientY > rect.top + rect.height / 2 ? "after" : "before";
    if (activeDropElement !== row) clearDropMarker();
    activeDropElement = row;
    row.classList.toggle("is-drop-before", position === "before");
    row.classList.toggle("is-drop-after", position === "after");
    return position;
  }

  function moveCategory(target, fromCategory, toCategory, position = "before") {
    if (!target || !fromCategory || !toCategory || fromCategory === toCategory) return;
    const rows = [...els.list.querySelectorAll("[data-request-category-row]")]
      .filter((row) => row.dataset.categoryTarget === target);
    const ordered = rows.map((row) => row.dataset.categoryName).filter(Boolean);
    const from = ordered.indexOf(fromCategory);
    const targetIndex = ordered.indexOf(toCategory);
    const to = position === "after" ? targetIndex + 1 : targetIndex;
    if (from < 0 || to < 0) return;
    const [moved] = ordered.splice(from, 1);
    ordered.splice(from < to ? to - 1 : to, 0, moved);
    saveCategoryOrder(target, ordered);
    draggedCategory = null;
    clearDropMarker();
    renderItems();
  }

  function moveItem(target, category, fromId, toId, position = "before") {
    if (!target || !category || !fromId || !toId || fromId === toId) return;
    const rows = [...els.list.querySelectorAll("[data-request-item-row]")]
      .filter((row) => row.dataset.itemTarget === target && row.dataset.itemCategory === category);
    const orderedIds = rows.map((row) => row.dataset.itemId).filter(Boolean);
    if (!orderedIds.includes(fromId) || !orderedIds.includes(toId)) return;
    const movingIds = isEditMode() && editSelected.has(fromId)
      ? orderedIds.filter((id) => editSelected.has(id))
      : [fromId];
    if (movingIds.includes(toId)) return;
    const remainingIds = orderedIds.filter((id) => !movingIds.includes(id));
    const targetIndex = remainingIds.indexOf(toId);
    const to = position === "after" ? targetIndex + 1 : targetIndex;
    if (to < 0) return;
    remainingIds.splice(to, 0, ...movingIds);

    const ingredients = Store.getIngredients();
    const orderMap = new Map(remainingIds.map((id, index) => [id, index]));
    const matching = ingredients
      .filter((item) => orderMap.has(item.id))
      .sort((a, b) => orderMap.get(a.id) - orderMap.get(b.id));
    let nextIndex = 0;
    Store.setIngredients(ingredients.map((item) => orderMap.has(item.id) ? matching[nextIndex++] : item));
    draggedItem = null;
    clearDropMarker();
    renderItems();
  }

  function itemForm(item = null, defaults = {}) {
    const target = item?.target || defaults.target || "카페테리아";
    const category = item?.category || item?.section || sectionForTargetCategory(target, defaults.category || "기타");
    return `
      <div class="recipe-item-form order-item-form" data-order-item-form="${item?.id || "__new__"}">
        <label><span>${I18n.t("itemName")}</span><input data-order-item-name-ko value="${escapeHtml(item?.nameKo || item?.name || "")}" /></label>
        <label><span>${I18n.t("englishName")}</span><input data-order-item-name-en value="${escapeHtml(item?.nameEn || "")}" /></label>
        <label><span>${I18n.t("department")}</span><select data-order-item-target>
          ${Store.getTargets().map((name) => `<option value="${name}" ${name === target ? "selected" : ""}>${I18n.targetLabel(name)}</option>`).join("")}
        </select></label>
        <label><span>${I18n.t("menuCategory")}</span><select data-order-item-category>${categoryOptions(target, category)}</select></label>
        <label class="order-unit-field hidden"><span>${I18n.t("orderUnit")}</span><input data-order-item-unit value="${escapeHtml(item?.unit || "")}" /></label>
        <div class="recipe-item-form-actions">
          <button class="button" data-order-item-action="save" data-order-item-id="${item?.id || ""}" type="button">${I18n.t("save")}</button>
          <button class="danger-button ${item ? "" : "hidden"}" data-order-item-action="delete" data-order-item-id="${item?.id || ""}" type="button">${I18n.t("delete")}</button>
          <button class="ghost-button" data-order-item-action="cancel" type="button">${I18n.t("close")}</button>
        </div>
      </div>
    `;
  }

  function bulkSelectionAnchorId() {
    if (editSelected.size < 2) return null;
    if (lastSelectedItemId && editSelected.has(lastSelectedItemId)) return lastSelectedItemId;
    return [...editSelected][editSelected.size - 1] || null;
  }

  function bulkSelectionForm(anchorItem) {
    const target = targetFor(anchorItem);
    const category = categoryFor(anchorItem);
    return `
      <div class="recipe-item-form order-selection-form" data-order-selection-form>
        <div class="order-selection-summary">${I18n.format("selectedItemCount", { count: editSelected.size })}</div>
        <label><span>${I18n.t("department")}</span><select data-bulk-selection-target>
          ${Store.getTargets().map((name) => `<option value="${name}" ${name === target ? "selected" : ""}>${I18n.targetLabel(name)}</option>`).join("")}
        </select></label>
        <label><span>${I18n.t("menuCategory")}</span><select data-bulk-selection-section>${categoryOptions(target, category)}</select></label>
        <div class="recipe-item-form-actions order-selection-actions">
          <button class="button" data-bulk-selection-action="save" type="button">${I18n.t("save")}</button>
          <button class="ghost-button" data-bulk-selection-action="cancel" type="button">${I18n.t("close")}</button>
        </div>
      </div>
    `;
  }

  function saveItemFromForm(form, item = null) {
    const nameKo = form?.querySelector("[data-order-item-name-ko]")?.value.trim() || "";
    if (!nameKo) {
      setStatus(I18n.t("chooseAtLeastOne"));
      return;
    }
    const target = form.querySelector("[data-order-item-target]")?.value || "카페테리아";
    const category = form.querySelector("[data-order-item-category]")?.value.trim() || "기타";
    const nextItem = {
      ...(item || {}),
      id: item?.id || Store.id("item"),
      name: nameKo,
      nameKo,
      nameEn: form.querySelector("[data-order-item-name-en]")?.value.trim() || "",
      target,
      category,
      unit: form.querySelector("[data-order-item-unit]")?.value.trim() || item?.unit || "",
      enabled: item?.enabled !== false
    };
    const rows = Store.getIngredients();
    Store.setIngredients(rows.some((row) => row.id === nextItem.id)
      ? rows.map((row) => row.id === nextItem.id ? nextItem : row)
      : [...rows, nextItem]);
    editSelected.clear();
    lastSelectedItemId = null;
    activeItemEdit = null;
    renderItems();
  }

  async function saveBulkSelectionFromForm(form) {
    const ids = [...editSelected];
    if (!ids.length) return;
    const target = form?.querySelector("[data-bulk-selection-target]")?.value || "카페테리아";
    const category = form?.querySelector("[data-bulk-selection-section]")?.value || sectionForTargetCategory(target, categoriesForTarget(target)[0]);
    await Store.setIngredients(Store.getIngredients().map((item) =>
      ids.includes(item.id) ? { ...item, target, category } : item
    ));
    editSelected.clear();
    lastSelectedItemId = null;
    activeItemEdit = null;
    setStatus(I18n.format("selectedItemCount", { count: ids.length }));
    renderItems();
  }

  function latestRequestEntry() {
    return Store.getHistory()
      .slice()
      .sort((a, b) => `${b.date || ""} ${b.time || ""}`.localeCompare(`${a.date || ""} ${a.time || ""}`))[0] || null;
  }

  function loadLatestRequest() {
    if (!canCreateRequest) return;
    templateEntry = latestRequestEntry();
    selected.clear();
    (templateEntry?.items || []).forEach((item) => selected.add(itemKey(item)));
    const memos = Array.isArray(templateEntry?.memos) ? templateEntry.memos : [];
    const editableMemo = memos.find(sameAuthor);
    els.memo.value = editableMemo?.text || (!memos.length ? templateEntry?.memo || "" : "");
  }

  function itemActions(item) {
    if (!isEditMode()) return "";
    return `
      <div class="menu-row-actions request-row-actions">
        <button class="menu-row-action is-edit" data-order-item-action="edit" data-order-item-id="${item.id}" type="button" aria-label="${I18n.itemName(item)} ${I18n.t("edit")}">${editIcon}</button>
        <button class="menu-row-action request-item-drag-handle recipe-drag-handle" data-request-item-drag-handle type="button" aria-label="${I18n.itemName(item)} ${I18n.t("moveOrder")}">${dragIcon}</button>
      </div>
    `;
  }

  function categoryActions(target, category) {
    if (!isEditMode()) return "";
    return `
      <div class="menu-row-actions request-row-actions">
        <button class="menu-row-action is-create" data-order-item-action="create" data-order-item-target="${escapeHtml(target)}" data-order-item-category="${escapeHtml(category)}" type="button" aria-label="${I18n.sectionLabel(category)} ${I18n.t("add")}">${addIcon}</button>
        <button class="menu-row-action is-edit" data-request-category-action="edit" data-category-target="${escapeHtml(target)}" data-category-name="${escapeHtml(category)}" type="button" aria-label="${I18n.sectionLabel(category)} ${I18n.t("edit")}">${editIcon}</button>
        <button class="menu-row-action request-category-drag-handle recipe-drag-handle" data-request-category-drag-handle type="button" aria-label="${I18n.sectionLabel(category)} ${I18n.t("moveOrder")}">${dragIcon}</button>
      </div>
    `;
  }

  function renderItemRows(items) {
    const selectionAnchorId = isEditMode() ? bulkSelectionAnchorId() : null;
    return `
      <div class="item-section-list">
        ${items.map((item) => {
          const checked = isEditMode() ? editSelected.has(item.id) : selected.has(itemKey(item));
          const rowDraggable = isEditMode() && activeItemEdit?.id !== item.id;
          return `
          <article class="list-card request-item-row" data-request-item-row data-item-id="${escapeHtml(item.id)}" data-item-target="${escapeHtml(targetFor(item))}" data-item-category="${escapeHtml(categoryFor(item))}" draggable="${rowDraggable ? "true" : "false"}">
            <label class="request-item-check">
              <input type="checkbox" data-item="${itemKey(item)}" data-item-id="${escapeHtml(item.id)}" ${checked ? "checked" : ""} />
              <span class="receive-row-main">
                <strong>${I18n.itemName(item)}</strong>
              </span>
            </label>
            ${itemActions(item)}
          </article>
          ${isEditMode() && activeItemEdit?.id === item.id ? itemForm(item) : ""}
          ${isEditMode() && selectionAnchorId === item.id ? bulkSelectionForm(item) : ""}
        `;
        }).join("")}
      </div>
    `;
  }

  function renderItems() {
    if (!canCreateRequest) {
      els.list.innerHTML = `<div class="list-card muted">${I18n.t("noAccess")}</div>`;
      els.memo.disabled = true;
      els.save.disabled = true;
      els.reset.disabled = true;
      updateModeUI();
      return;
    }

    const targetOrder = ["카페테리아", "야채", "그로서리"];
    const categoryOrders = {
      "카페테리아": uniqueList([...Store.getRequestCategories("카페테리아"), "기타"]),
      "야채": uniqueList(Store.getRequestCategories("야채")),
      "그로서리": uniqueList(Store.getRequestCategories("그로서리"))
    };
    const groups = Store.getIngredients()
      .filter((item) => item.enabled !== false)
      .reduce((acc, item) => {
        const target = targetFor(item);
        const category = categoryFor(item);
        acc[target] = acc[target] || {};
        acc[target][category] = acc[target][category] || [];
        acc[target][category].push(item);
        return acc;
      }, {});

    targetOrder.forEach((target) => {
      groups[target] = groups[target] || {};
      (categoryOrders[target] || []).forEach((category) => {
        groups[target][category] = groups[target][category] || [];
      });
    });

    const targets = orderedKeys(groups, targetOrder);
    if (!targets.length) {
      els.list.innerHTML = `<div class="list-card muted">${I18n.t("noItems")}</div>`;
      updateModeUI();
      return;
    }

    els.list.innerHTML = targets.map((target) => {
      const categoryGroups = groups[target];
      const categories = orderedKeys(categoryGroups, categoryOrders[target] || categoryOrders["카페테리아"]);
      return `
        <section class="department-group request-target-group">
          <div class="section-title-row menu-category-title-row">
            <h2>${I18n.targetLabel(target)}</h2>
            ${isEditMode() ? `<button class="request-category-add-text" data-request-category-action="create" data-category-target="${escapeHtml(target)}" type="button">${I18n.t("categoryAdd")}</button>` : ""}
          </div>
          <hr class="section-divider department-divider" />
          ${isEditMode() && activeCategoryEdit?.mode === "create" && activeCategoryEdit.target === target ? categoryForm(target, "", "create") : ""}
          <div class="department-card request-target-section">
            ${categories.map((category) => {
              const categoryEditing = categoryKey(activeCategoryEdit?.target, activeCategoryEdit?.category) === categoryKey(target, category) ||
                (activeItemEdit?.isNew && activeItemEdit.target === target && activeItemEdit.category === category);
              return `
              <section class="item-section home-request-section request-category-section" data-request-category-row data-category-target="${escapeHtml(target)}" data-category-name="${escapeHtml(category)}" draggable="${isEditMode() && !categoryEditing ? "true" : "false"}">
                <div class="section-title-row request-category-title-row">
                  <h3>${I18n.sectionLabel(category)}</h3>
                  ${categoryActions(target, category)}
                </div>
                <hr class="section-divider section-title-divider" />
                ${isEditMode() && activeCategoryEdit?.mode === "edit" && categoryKey(activeCategoryEdit.target, activeCategoryEdit.category) === categoryKey(target, category) ? categoryForm(target, category, "edit") : ""}
                ${renderItemRows(categoryGroups[category])}
                ${isEditMode() && activeItemEdit?.isNew && activeItemEdit.target === target && activeItemEdit.category === category ? itemForm(null, activeItemEdit) : ""}
              </section>
            `;
            }).join("")}
          </div>
      </section>
      `;
    }).join("");

    els.list.querySelectorAll("[data-item]").forEach((input) => {
      input.addEventListener("change", () => {
        if (isEditMode()) {
          if (input.checked) {
            editSelected.add(input.dataset.itemId);
            lastSelectedItemId = input.dataset.itemId;
          } else {
            editSelected.delete(input.dataset.itemId);
            if (lastSelectedItemId === input.dataset.itemId) {
              lastSelectedItemId = [...editSelected][editSelected.size - 1] || null;
            }
            if (activeItemEdit?.id === input.dataset.itemId) activeItemEdit = null;
          }
          if (editSelected.size !== 1 && activeItemEdit && !activeItemEdit.isNew) activeItemEdit = null;
          renderItems();
          return;
        }
        if (input.checked) selected.add(input.dataset.item);
        else selected.delete(input.dataset.item);
        if (els.messageList?.children.length) renderDepartmentMessages();
      });
    });
    els.list.querySelectorAll("[data-order-item-target]").forEach((select) => {
      select.addEventListener("change", () => {
        const form = select.closest("[data-order-item-form]");
        const categorySelect = form?.querySelector("[data-order-item-category]");
        if (!categorySelect) return;
        categorySelect.innerHTML = categoryOptions(select.value);
      });
    });
    els.list.querySelectorAll("[data-bulk-selection-target]").forEach((select) => {
      select.addEventListener("change", () => {
        const form = select.closest("[data-order-selection-form]");
        const categorySelect = form?.querySelector("[data-bulk-selection-section]");
        if (!categorySelect) return;
        categorySelect.innerHTML = categoryOptions(select.value);
      });
    });
    els.list.querySelectorAll("[data-bulk-selection-action]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (button.dataset.bulkSelectionAction === "save") {
          saveBulkSelectionFromForm(button.closest("[data-order-selection-form]"));
          return;
        }
        editSelected.clear();
        lastSelectedItemId = null;
        renderItems();
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
          editSelected.clear();
          lastSelectedItemId = null;
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
          if (!window.confirm(I18n.format("confirmDeleteItem", { name: I18n.itemName(item) }))) return;
          Store.setIngredients(Store.getIngredients().filter((row) => row.id !== item.id));
          selected.delete(itemKey(item));
          editSelected.delete(item.id);
          if (lastSelectedItemId === item.id) lastSelectedItemId = null;
          activeItemEdit = null;
          renderItems();
        }
      });
    });
    els.list.querySelectorAll("[data-request-category-action]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const action = button.dataset.requestCategoryAction;
        if (action === "create") {
          activeCategoryEdit = activeCategoryEdit?.mode === "create" && activeCategoryEdit.target === button.dataset.categoryTarget
            ? null
            : { mode: "create", target: button.dataset.categoryTarget };
          activeItemEdit = null;
          renderItems();
          return;
        }
        if (action === "edit") {
          const next = {
            mode: "edit",
            target: button.dataset.categoryTarget,
            category: button.dataset.categoryName
          };
          activeCategoryEdit = categoryKey(activeCategoryEdit?.target, activeCategoryEdit?.category) === categoryKey(next.target, next.category) ? null : next;
          activeItemEdit = null;
          renderItems();
          return;
        }
        if (action === "cancel") {
          activeCategoryEdit = null;
          renderItems();
          return;
        }
        if (action === "save") {
          saveCategoryFromForm(button.closest("[data-request-category-form]"));
          return;
        }
        if (action === "delete") {
          deleteCategoryFromForm(button.closest("[data-request-category-form]"));
        }
      });
    });
    els.list.querySelectorAll("[data-request-category-row]").forEach((row) => {
      row.addEventListener("dragstart", (event) => {
        if (!isEditMode()) return;
        if (event.target.closest("[data-request-category-form], [data-order-item-form], [data-order-selection-form]")) return;
        if (event.target.closest("[data-request-item-row]")) return;
        draggedCategory = {
          target: row.dataset.categoryTarget,
          category: row.dataset.categoryName
        };
        event.dataTransfer?.setData("text/plain", JSON.stringify(draggedCategory));
      });
      row.addEventListener("dragover", (event) => {
        if (!isEditMode()) return;
        if (event.target.closest("[data-request-item-row]")) return;
        if (!draggedCategory || draggedCategory.target !== row.dataset.categoryTarget) return;
        event.preventDefault();
        markDropPosition(row, event);
      });
      row.addEventListener("drop", (event) => {
        if (!isEditMode()) return;
        if (event.target.closest("[data-request-item-row]")) return;
        event.preventDefault();
        const position = markDropPosition(row, event);
        let source = draggedCategory;
        try {
          source = source || JSON.parse(event.dataTransfer?.getData("text/plain") || "null");
        } catch {
          source = draggedCategory;
        }
        if (!source || source.target !== row.dataset.categoryTarget) return;
        moveCategory(row.dataset.categoryTarget, source.category, row.dataset.categoryName, position);
      });
      row.addEventListener("dragend", () => {
        draggedCategory = null;
        clearDropMarker();
      });
    });
    els.list.querySelectorAll("[data-request-item-row]").forEach((row) => {
      row.addEventListener("dragstart", (event) => {
        if (!isEditMode()) return;
        if (event.target.closest("[data-request-category-form], [data-order-item-form], [data-order-selection-form]")) return;
        event.stopPropagation();
        draggedItem = {
          id: row.dataset.itemId,
          target: row.dataset.itemTarget,
          category: row.dataset.itemCategory
        };
        event.dataTransfer?.setData("text/plain", JSON.stringify(draggedItem));
      });
      row.addEventListener("dragover", (event) => {
        if (!isEditMode()) return;
        event.stopPropagation();
        if (!draggedItem || draggedItem.target !== row.dataset.itemTarget || draggedItem.category !== row.dataset.itemCategory) return;
        event.preventDefault();
        markDropPosition(row, event);
      });
      row.addEventListener("drop", (event) => {
        if (!isEditMode()) return;
        event.stopPropagation();
        event.preventDefault();
        const position = markDropPosition(row, event);
        let source = draggedItem;
        try {
          source = source || JSON.parse(event.dataTransfer?.getData("text/plain") || "null");
        } catch {
          source = draggedItem;
        }
        if (!source || source.target !== row.dataset.itemTarget || source.category !== row.dataset.itemCategory) return;
        moveItem(row.dataset.itemTarget, row.dataset.itemCategory, source.id, row.dataset.itemId, position);
      });
      row.addEventListener("dragend", () => {
        draggedItem = null;
        clearDropMarker();
      });
    });
    updateModeUI();
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

  function messageForDepartment(_target, items) {
    const names = items.map((item) => item.nameKo || item.name || I18n.itemName(item)).filter(Boolean);
    return `[ 먹자 ]\n${names.join(", ")} 필요합니다`;
  }

  function departmentMessages() {
    const groups = selectedItems().reduce((acc, item) => {
      const target = targetFor(item);
      acc[target] = acc[target] || [];
      acc[target].push(item);
      return acc;
    }, {});
    return ["카페테리아", "야채", "그로서리"]
      .filter((target) => groups[target]?.length)
      .map((target) => ({
        target,
        label: I18n.targetLabel(target),
        message: messageForDepartment(target, groups[target])
      }));
  }

  function renderDepartmentMessages() {
    const messages = departmentMessages();
    if (!messages.length) {
      els.messageList.innerHTML = "";
      els.messagePanel?.classList.add("hidden");
      setStatus(I18n.t("chooseAtLeastOne"));
      return;
    }
    els.messageList.innerHTML = messages.map((row) => `
      <article class="department-message-card">
        <div class="department-message-card-header">
          <strong>${escapeHtml(row.label)}</strong>
          <div class="department-message-actions">
            <button class="ghost-button compact-button" data-copy-department-message="${escapeHtml(row.target)}" type="button">${I18n.t("copyMessage")}</button>
          </div>
        </div>
        <pre>${escapeHtml(row.message)}</pre>
        <a class="button department-kakao-button" href="kakaotalk://" aria-label="${I18n.t("openKakao")}">${I18n.t("openKakao")}</a>
      </article>
    `).join("");
    els.messagePanel?.classList.remove("hidden");
  }

  async function copyText(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  async function copyDepartmentMessage(target) {
    const row = departmentMessages().find((item) => item.target === target);
    if (!row) {
      setStatus(I18n.t("emptyMessage"));
      return;
    }
    try {
      await copyText(row.message);
      setStatus(`${row.label} ${I18n.t("copied")}`);
    } catch {
      setStatus(I18n.t("emptyMessage"));
    }
  }

  async function saveRequest() {
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
    const result = await Store.saveHistoryEntry(entry);
    if (result?.ok === false) {
      setStatus(result.error || I18n.t("csvImportInvalid"));
      return;
    }
    templateEntry = entry;
    if (items.length) renderDepartmentMessages();
    setStatus(I18n.t("saved"));
  }

  function resetForm() {
    if (!window.confirm(I18n.t("confirmResetRequest"))) return;
    selected.clear();
    els.memo.value = "";
    renderItems();
  }

  function setRequestMode(mode) {
    requestMode = canEditCatalog && mode === "edit" ? "edit" : "order";
    editSelected.clear();
    lastSelectedItemId = null;
    activeItemEdit = null;
    activeCategoryEdit = null;
    draggedCategory = null;
    draggedItem = null;
    clearDropMarker();
    renderItems();
  }

  function categoryRows() {
    return [...els.list.querySelectorAll("[data-request-category-row]")];
  }

  function currentCategoryRow() {
    const target = els.bulkTarget?.value || "카페테리아";
    const category = els.bulkCategory?.value || "";
    return categoryRows().find((node) => node.dataset.categoryTarget === target && node.dataset.categoryName === category);
  }

  function syncJumpSelects(row) {
    if (!row) return;
    els.bulkTarget.value = row.dataset.categoryTarget || "카페테리아";
    fillBulkCategories();
    els.bulkCategory.value = row.dataset.categoryName || "";
  }

  function scrollToCategoryRow(row) {
    if (!row) {
      setStatus(I18n.t("categoryNotFound"));
      return;
    }
    const stickyOffset = (els.bulkPanel?.offsetHeight || 0) + 14;
    const top = row.getBoundingClientRect().top + window.scrollY - stickyOffset;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    row.classList.add("is-jump-focused");
    setTimeout(() => row.classList.remove("is-jump-focused"), 1400);
  }

  function jumpToCategory() {
    if (!canCreateRequest) return;
    scrollToCategoryRow(currentCategoryRow());
  }

  function jumpByCategoryStep(step) {
    if (!canCreateRequest) return;
    const rows = categoryRows();
    if (!rows.length) return;
    const current = currentCategoryRow();
    const currentIndex = Math.max(0, rows.indexOf(current));
    const nextIndex = Math.min(rows.length - 1, Math.max(0, currentIndex + step));
    const row = rows[nextIndex];
    syncJumpSelects(row);
    scrollToCategoryRow(row);
  }

  function jumpToEdge(edge) {
    if (!canCreateRequest) return;
    const rows = categoryRows();
    const row = edge === "bottom" ? rows[rows.length - 1] : rows[0];
    syncJumpSelects(row);
    scrollToCategoryRow(row);
  }

  els.save.addEventListener("click", () => saveRequest());
  els.messageList?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-copy-department-message]");
    if (!button) return;
    copyDepartmentMessage(button.dataset.copyDepartmentMessage);
  });
  els.reset.addEventListener("click", resetForm);
  els.orderModeButton?.addEventListener("click", () => setRequestMode("order"));
  els.editModeButton?.addEventListener("click", () => setRequestMode("edit"));
  els.bulkTarget?.addEventListener("change", fillBulkCategories);
  els.bulkJump?.addEventListener("click", jumpToCategory);
  els.bulkJumpTop?.addEventListener("click", () => jumpToEdge("top"));
  els.bulkJumpPrev?.addEventListener("click", () => jumpByCategoryStep(-1));
  els.bulkJumpNext?.addEventListener("click", () => jumpByCategoryStep(1));
  els.bulkJumpBottom?.addEventListener("click", () => jumpToEdge("bottom"));
  loadLatestRequest();
  renderItems();
  I18n.applyI18n();
})();
