(async function () {
  await Store.init();
  AppUI.renderSidebar("menus");
  AppUI.registerServiceWorker();

  const search = document.getElementById("menu-search");
  const searchButton = document.getElementById("menu-search-button");
  const category = document.getElementById("menu-category");
  const list = document.getElementById("menu-list");
  const modal = document.getElementById("menu-recipe-modal");
  const modalTitle = document.getElementById("menu-recipe-title");
  const modalStatus = document.getElementById("menu-recipe-status");
  const modalContent = document.getElementById("menu-recipe-content");
  const modalClose = document.getElementById("close-menu-recipe");
  const recipeActions = document.getElementById("menu-recipe-actions");
  const editRecipeFromMenu = document.getElementById("edit-recipe-from-menu");
  const deleteRecipeFromMenu = document.getElementById("delete-recipe-from-menu");
  const recipeEditModal = document.getElementById("menu-recipe-edit-modal");
  const recipeEditModalTitle = document.getElementById("menu-recipe-edit-title");
  const closeRecipeEdit = document.getElementById("close-menu-recipe-edit");
  const saveRecipeEdit = document.getElementById("save-menu-recipe-edit");
  const deleteRecipeEdit = document.getElementById("delete-menu-recipe-edit");
  const cancelRecipeEdit = document.getElementById("cancel-menu-recipe-edit");
  const editModal = document.getElementById("menu-edit-modal");
  const editModalTitle = document.getElementById("menu-edit-title");
  const editModalClose = document.getElementById("close-menu-edit");
  const saveMenuEdit = document.getElementById("save-menu-edit");
  const deleteMenuEdit = document.getElementById("delete-menu-edit");
  const cancelMenuEdit = document.getElementById("cancel-menu-edit");
  const editFields = {
    nameKo: document.getElementById("edit-menu-name-ko"),
    nameEn: document.getElementById("edit-menu-name-en"),
    category: document.getElementById("edit-menu-category"),
    price: document.getElementById("edit-menu-price"),
    recipe: document.getElementById("edit-menu-recipe"),
    seasonal: document.getElementById("edit-menu-seasonal"),
    active: document.getElementById("edit-menu-active"),
    discontinued: document.getElementById("edit-menu-discontinued")
  };
  const recipeEditFields = {
    name: document.getElementById("menu-edit-recipe-name"),
    section: document.getElementById("menu-edit-recipe-section"),
    description: document.getElementById("menu-edit-recipe-description"),
    ingredients: document.getElementById("menu-edit-recipe-ingredients"),
    steps: document.getElementById("menu-edit-recipe-steps"),
    notes: document.getElementById("menu-edit-recipe-notes")
  };
  let searchQuery = "";
  let editingMenuId = "";
  let activeRecipeMenuId = "";
  let editingRecipeId = "";
  let activeIngredientEdit = null;
  let activeStepEdit = null;
  let draggedStepIndex = null;
  const session = Store.getAuth();
  const canViewMenu = ["restaurant", "admin"].includes(session?.role);
  const canManageMenu = session?.role === "admin";
  const nonSaleCategories = ["반조리"];

  function isNonSaleCategory(menu) {
    return nonSaleCategories.includes(String(menu.category || "").trim());
  }

  function money(menu) {
    if (!menu.price) return "-";
    return `${menu.currency || "CAD"} ${Number(menu.price).toFixed(2)}`;
  }

  function renderFilters() {
    category.innerHTML = `<option value="">${I18n.t("all")}</option>` + Store.getMenuCategories()
      .map((name) => `<option value="${name}">${name}</option>`)
      .join("");
    editFields.recipe.innerHTML = `<option value="">${I18n.t("recipeDetail")}</option>` + Store.getRecipes()
      .map((recipe) => `<option value="${recipe.id}">${recipe.name}</option>`)
      .join("");
    recipeEditFields.section.innerHTML = Store.getSections()
      .map((name) => `<option value="${name}">${I18n.sectionLabel(name)}</option>`)
      .join("");
  }

  function renderMenuCategoryOptions(selectedValue = "") {
    const categories = Store.getMenuCategories();
    const selected = String(selectedValue || "");
    if (selected && !categories.includes(selected)) categories.push(selected);
    editFields.category.innerHTML = categories
      .map((name) => `<option value="${name}">${name}</option>`)
      .join("");
    if (selected && !categories.length) {
      editFields.category.innerHTML = `<option value="${selected}">${selected}</option>`;
    }
    editFields.category.value = selected || categories[0] || "";
  }

  function filteredMenus() {
    const q = searchQuery.trim().toLowerCase();
    return Store.getMenus().filter((menu) => {
      if (category.value && menu.category !== category.value) return false;
      if (q && !`${menu.nameKo} ${menu.nameEn} ${menu.category} ${menu.recipeName}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  function recipeFor(menu) {
    return Store.getRecipes().find((recipe) => recipe.id === menu.recipeId) ||
      Store.getRecipes().find((recipe) => recipe.name === menu.recipeName);
  }

  function blankRecipeForMenu(menu) {
    const recipe = {
      id: menu.recipeId || Store.id("recipe"),
      name: menu.nameKo,
      section: menu.category || "기타",
      description: "",
      ingredients: "",
      seasonings: "",
      steps: "",
      notes: "",
      imageUrl: "",
      ingredientItems: [],
      seasoningItems: [],
      stepItems: [],
      enabled: !menu.discontinued,
      updatedAt: Store.today()
    };
    Store.saveRecipe(recipe);
    return recipe;
  }

  function ensureRecipeForMenu(menu) {
    return recipeFor(menu) || blankRecipeForMenu(menu);
  }

  function menuStatusBadges(menu) {
    const statusClass = isNonSaleCategory(menu) ? "is-unavailable" : menu.discontinued ? "is-paused" : "is-live";
    const statusLabel = isNonSaleCategory(menu) ? "판매 불가" : menu.discontinued ? I18n.t("discontinuedMenu") : I18n.t("activeMenu");
    return `
      <span class="menu-status-dot ${statusClass}" aria-label="${statusLabel}"></span>
      ${menu.seasonal ? `<span class="tiny-badge is-seasonal">${I18n.t("seasonalMenu")}</span>` : ""}
    `;
  }

  function menuPriceLine(menu) {
    return isNonSaleCategory(menu) ? "" : `<span class="menu-inline-price">${money(menu)}</span>`;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function splitAmount(value) {
    const text = String(value || "").trim();
    const match = text.match(/^([\d.,/]+)\s*(.*)$/);
    return match ? { quantity: match[1], unit: match[2] } : { quantity: "", unit: text };
  }

  function joinAmount(quantity, unit) {
    return [quantity, unit].map((part) => String(part || "").trim()).filter(Boolean).join(" ");
  }

  function recipeWithIngredientItems(recipe, items) {
    const ingredientItems = Store.parseRecipeItems(items);
    return {
      ...recipe,
      ingredientItems,
      ingredients: Store.recipeItemsToLines(ingredientItems),
      updatedAt: Store.today()
    };
  }

  function recipeWithStepItems(recipe, items) {
    const stepItems = Store.parseRecipeSteps(items);
    return {
      ...recipe,
      stepItems,
      steps: Store.recipeStepsToLines(stepItems),
      updatedAt: Store.today()
    };
  }

  function ingredientEditForm(item = {}, index = 0) {
    const amount = splitAmount(item.amount);
    return `
      <div class="recipe-item-form" data-ingredient-form="${index}">
        <label><span>재료명</span><input data-ingredient-name value="${escapeHtml(item.name)}" /></label>
        <label><span>수량</span><input data-ingredient-quantity inputmode="decimal" value="${escapeHtml(amount.quantity)}" /></label>
        <label><span>단위</span><input data-ingredient-unit value="${escapeHtml(amount.unit)}" /></label>
        <div class="recipe-item-form-actions">
          <button class="button" data-ingredient-action="save" data-index="${index}" type="button">저장</button>
          <button class="danger-button" data-ingredient-action="delete" data-index="${index}" type="button">삭제</button>
          <button class="ghost-button" data-ingredient-action="cancel" type="button">취소</button>
        </div>
      </div>
    `;
  }

  function ingredientCrudList(recipe) {
    const rows = Store.parseRecipeItems(recipe.ingredientItems?.length ? recipe.ingredientItems : recipe.ingredients);
    return `
      <section class="history-detail-card recipe-detail-section recipe-crud-section">
        <div class="recipe-section-title-row">
          <h2>${I18n.t("ingredients")}</h2>
          ${canManageMenu ? `<button class="menu-row-action is-create" data-ingredient-action="add" type="button" aria-label="재료 추가"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14" /><path d="M5 12h14" /></svg></button>` : ""}
        </div>
        <div class="recipe-crud-list">
          ${rows.length ? rows.map((item, index) => {
            const amount = splitAmount(item.amount);
            return `
              <article class="list-card recipe-crud-row">
                <div class="recipe-crud-main">
                  <strong>${escapeHtml(item.name)}</strong>
                  <span>${escapeHtml([amount.quantity, amount.unit].filter(Boolean).join(" ") || "-")}</span>
                </div>
                ${canManageMenu ? `<button class="menu-row-action is-edit" data-ingredient-action="edit" data-index="${index}" type="button" aria-label="${escapeHtml(item.name)} 수정"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></svg></button>` : ""}
              </article>
              ${activeIngredientEdit?.index === index ? ingredientEditForm(item, index) : ""}
            `;
          }).join("") : `<p class="muted">-</p>`}
          ${activeIngredientEdit?.isNew ? ingredientEditForm({}, rows.length) : ""}
        </div>
      </section>
    `;
  }

  function stepEditForm(step = {}, index = 0) {
    return `
      <div class="recipe-item-form" data-step-form="${index}">
        <label><span>조리 순서</span><input data-step-text value="${escapeHtml(step.text)}" /></label>
        <label><span>사진 URL</span><input data-step-image value="${escapeHtml(step.imageUrl)}" /></label>
        <div class="recipe-item-form-actions">
          <button class="button" data-step-action="save" data-index="${index}" type="button">저장</button>
          <button class="danger-button" data-step-action="delete" data-index="${index}" type="button">삭제</button>
          <button class="ghost-button" data-step-action="cancel" type="button">취소</button>
        </div>
      </div>
    `;
  }

  function stepCrudList(recipe) {
    const rows = Store.parseRecipeSteps(recipe.stepItems?.length ? recipe.stepItems : recipe.steps);
    return `
      <section class="history-detail-card recipe-detail-section recipe-crud-section">
        <div class="recipe-section-title-row">
          <h2>${I18n.t("steps")}</h2>
          ${canManageMenu ? `<button class="menu-row-action is-create" data-step-action="add" type="button" aria-label="조리 순서 추가"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14" /><path d="M5 12h14" /></svg></button>` : ""}
        </div>
        <div class="recipe-crud-list">
          ${rows.length ? rows.map((step, index) => `
            <article class="list-card recipe-crud-row recipe-step-crud-row" data-step-index="${index}" ${canManageMenu ? 'draggable="true"' : ""}>
              <div class="recipe-step-crud-main">
                <span class="recipe-step-number">${index + 1}</span>
                <p>${escapeHtml(step.text || "-")}</p>
                ${step.imageUrl ? `<small>${escapeHtml(step.imageUrl)}</small>` : ""}
              </div>
              ${canManageMenu ? `
                <div class="recipe-crud-actions">
                  <button class="menu-row-action is-edit" data-step-action="edit" data-index="${index}" type="button" aria-label="${index + 1}번 조리 순서 수정"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></svg></button>
                  <button class="menu-row-action recipe-drag-handle" data-step-drag-handle type="button" aria-label="${index + 1}번 조리 순서 이동"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h.01" /><path d="M15 6h.01" /><path d="M9 12h.01" /><path d="M15 12h.01" /><path d="M9 18h.01" /><path d="M15 18h.01" /></svg></button>
                </div>
              ` : ""}
            </article>
            ${activeStepEdit?.index === index ? stepEditForm(step, index) : ""}
          `).join("") : `<p class="muted">-</p>`}
          ${activeStepEdit?.isNew ? stepEditForm({}, rows.length) : ""}
        </div>
      </section>
    `;
  }

  function measuredList(title, items) {
    const rows = Store.parseRecipeItems(items);
    return `
      <section class="history-detail-card recipe-detail-section">
        <h2>${title}</h2>
        ${rows.length ? `
          <div class="recipe-measured-list">
            ${rows.map((item) => `
              <div class="recipe-measured-row">
                <strong>${item.name}</strong>
                <span>${item.amount || "-"}</span>
              </div>
            `).join("")}
          </div>
        ` : `<p class="muted">-</p>`}
      </section>
    `;
  }

  function stepList(recipe) {
    const rows = Store.parseRecipeSteps(recipe.stepItems?.length ? recipe.stepItems : recipe.steps);
    return `
      <section class="history-detail-card recipe-detail-section">
        <h2>${I18n.t("steps")}</h2>
        <div class="recipe-step-list">
          ${rows.length ? rows.map((step, index) => `
            <article class="recipe-step-row">
              ${step.imageUrl ? `<img src="${step.imageUrl}" alt="${recipe.name} ${index + 1}" />` : ""}
              <div>
                <span>${index + 1}</span>
                <p>${step.text || "-"}</p>
              </div>
            </article>
          `).join("") : `<p class="muted">-</p>`}
        </div>
      </section>
    `;
  }

  function recipeSections(menu, recipe) {
    if (!recipe) return `<section class="history-detail-card"><p class="muted">${I18n.t("noRecipes")}</p></section>`;
    return `
      ${ingredientCrudList(recipe)}
      ${stepCrudList(recipe)}
      ${(recipe.notes || menu.notes) ? `<section class="history-detail-card recipe-detail-section"><h2>${I18n.t("notes")}</h2><p class="preview-box">${recipe.notes || menu.notes}</p></section>` : ""}
    `;
  }

  function openRecipe(menu, options = {}) {
    const recipe = ensureRecipeForMenu(menu);
    activeRecipeMenuId = menu.id;
    if (options.resetIngredientEdit !== false) {
      activeIngredientEdit = null;
      activeStepEdit = null;
    }
    modalTitle.textContent = I18n.menuName(menu);
    modalStatus.textContent = menu.discontinued ? I18n.t("discontinuedMenu") : I18n.t("activeMenu");
    modalStatus.className = `badge ${menu.discontinued ? "yellow" : "green"}`;
    modalContent.innerHTML = `
      ${recipeSections(menu, recipe)}
    `;
    recipeActions.classList.toggle("hidden", !canManageMenu);
    modal.classList.remove("hidden");
    document.body.classList.add("modal-open");
    modalClose.focus();
  }

  function closeRecipe() {
    modal.classList.add("hidden");
    activeIngredientEdit = null;
    activeStepEdit = null;
    draggedStepIndex = null;
    document.body.classList.remove("modal-open");
  }

  function activeRecipeMenu() {
    return Store.getMenus().find((menu) => menu.id === activeRecipeMenuId) || null;
  }

  function openRecipeEditor(recipe = null) {
    editingRecipeId = recipe?.id || "";
    recipeEditModalTitle.textContent = "레시피 수정";
    recipeEditFields.name.value = recipe?.name || "";
    recipeEditFields.section.value = recipe?.section || Store.getSections()[0] || "기타";
    recipeEditFields.description.value = recipe?.description || "";
    recipeEditFields.ingredients.value = Store.recipeItemsToLines(recipe?.ingredientItems?.length ? recipe.ingredientItems : recipe?.ingredients);
    recipeEditFields.steps.value = Store.recipeStepsToLines(recipe?.stepItems?.length ? recipe.stepItems : recipe?.steps);
    recipeEditFields.notes.value = recipe?.notes || "";
    recipeEditModal.classList.remove("hidden");
    document.body.classList.add("modal-open");
    recipeEditFields.name.focus();
  }

  function closeRecipeEditor() {
    recipeEditModal.classList.add("hidden");
    if (modal.classList.contains("hidden")) document.body.classList.remove("modal-open");
  }

  function saveRecipeFromEditor() {
    const name = recipeEditFields.name.value.trim();
    if (!name) return;
    const existing = editingRecipeId ? Store.getRecipes().find((recipe) => recipe.id === editingRecipeId) : null;
    const ingredientItems = Store.parseRecipeItems(recipeEditFields.ingredients.value);
    const stepItems = Store.parseRecipeSteps(recipeEditFields.steps.value);
    const recipe = {
      ...(existing || {}),
      id: editingRecipeId || Store.id("recipe"),
      name,
      section: recipeEditFields.section.value,
      description: recipeEditFields.description.value.trim(),
      ingredients: Store.recipeItemsToLines(ingredientItems),
      seasonings: existing?.seasonings || "",
      steps: Store.recipeStepsToLines(stepItems),
      notes: recipeEditFields.notes.value.trim(),
      imageUrl: existing?.imageUrl || "",
      ingredientItems,
      seasoningItems: existing?.seasoningItems || [],
      stepItems,
      enabled: existing?.enabled !== false,
      updatedAt: Store.today()
    };
    Store.saveRecipe(recipe);
    closeRecipeEditor();
    renderFilters();
    render();
    const menu = activeRecipeMenu();
    if (menu) openRecipe(menu);
  }

  function deleteRecipeFromEditor() {
    if (!editingRecipeId) return;
    const recipe = Store.getRecipes().find((row) => row.id === editingRecipeId);
    if (!recipe) return;
    if (!confirm(`${recipe.name} 레시피를 삭제할까요?`)) return;
    Store.deleteRecipe(editingRecipeId);
    closeRecipeEditor();
    closeRecipe();
    renderFilters();
    render();
  }

  function deleteActiveRecipeFromMenu() {
    const menu = activeRecipeMenu();
    const recipe = menu ? recipeFor(menu) : null;
    if (!recipe) return;
    if (!confirm(`${recipe.name} 레시피를 삭제할까요?`)) return;
    Store.deleteRecipe(recipe.id);
    closeRecipe();
    renderFilters();
    render();
  }

  function rerenderActiveRecipe() {
    const menu = activeRecipeMenu();
    if (menu) openRecipe(menu, { resetIngredientEdit: false });
  }

  function handleIngredientAction(event) {
    const button = event.target.closest("[data-ingredient-action]");
    if (!button || !canManageMenu) return;
    const menu = activeRecipeMenu();
    const recipe = menu ? recipeFor(menu) : null;
    if (!recipe) return;
    const rows = Store.parseRecipeItems(recipe.ingredientItems?.length ? recipe.ingredientItems : recipe.ingredients);
    const action = button.dataset.ingredientAction;
    const index = Number(button.dataset.index || rows.length);
    if (action === "add") {
      activeIngredientEdit = { index: rows.length, isNew: true };
      rerenderActiveRecipe();
      return;
    }
    if (action === "edit") {
      activeIngredientEdit = { index, isNew: false };
      rerenderActiveRecipe();
      return;
    }
    if (action === "cancel") {
      activeIngredientEdit = null;
      rerenderActiveRecipe();
      return;
    }
    if (action === "delete") {
      if (!confirm("재료를 삭제할까요?")) return;
      Store.saveRecipe(recipeWithIngredientItems(recipe, rows.filter((_, rowIndex) => rowIndex !== index)));
      activeIngredientEdit = null;
      rerenderActiveRecipe();
      return;
    }
    if (action === "save") {
      const form = button.closest("[data-ingredient-form]");
      const name = form?.querySelector("[data-ingredient-name]")?.value.trim() || "";
      if (!name) return;
      const amount = joinAmount(
        form.querySelector("[data-ingredient-quantity]")?.value,
        form.querySelector("[data-ingredient-unit]")?.value
      );
      const next = rows.slice();
      next[index] = { name, amount };
      Store.saveRecipe(recipeWithIngredientItems(recipe, next));
      activeIngredientEdit = null;
      rerenderActiveRecipe();
    }
  }

  function handleStepAction(event) {
    const button = event.target.closest("[data-step-action]");
    if (!button || !canManageMenu) return;
    const menu = activeRecipeMenu();
    const recipe = menu ? recipeFor(menu) : null;
    if (!recipe) return;
    const rows = Store.parseRecipeSteps(recipe.stepItems?.length ? recipe.stepItems : recipe.steps);
    const action = button.dataset.stepAction;
    const index = Number(button.dataset.index || rows.length);
    if (action === "add") {
      activeStepEdit = { index: rows.length, isNew: true };
      rerenderActiveRecipe();
      return;
    }
    if (action === "edit") {
      activeStepEdit = { index, isNew: false };
      rerenderActiveRecipe();
      return;
    }
    if (action === "cancel") {
      activeStepEdit = null;
      rerenderActiveRecipe();
      return;
    }
    if (action === "delete") {
      if (!confirm("조리 순서를 삭제할까요?")) return;
      Store.saveRecipe(recipeWithStepItems(recipe, rows.filter((_, rowIndex) => rowIndex !== index)));
      activeStepEdit = null;
      rerenderActiveRecipe();
      return;
    }
    if (action === "save") {
      const form = button.closest("[data-step-form]");
      const text = form?.querySelector("[data-step-text]")?.value.trim() || "";
      const imageUrl = form?.querySelector("[data-step-image]")?.value.trim() || "";
      if (!text && !imageUrl) return;
      const next = rows.slice();
      next[index] = { text, imageUrl };
      Store.saveRecipe(recipeWithStepItems(recipe, next));
      activeStepEdit = null;
      rerenderActiveRecipe();
    }
  }

  function reorderSteps(fromIndex, toIndex) {
    const menu = activeRecipeMenu();
    const recipe = menu ? recipeFor(menu) : null;
    if (!recipe || fromIndex === null || toIndex === null || fromIndex === toIndex) return;
    const rows = Store.parseRecipeSteps(recipe.stepItems?.length ? recipe.stepItems : recipe.steps);
    if (!rows[fromIndex] || !rows[toIndex]) return;
    const next = rows.slice();
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    Store.saveRecipe(recipeWithStepItems(recipe, next));
    activeStepEdit = null;
    draggedStepIndex = null;
    rerenderActiveRecipe();
  }

  function handleStepDragStart(event) {
    const row = event.target.closest("[data-step-index]");
    if (!row || !canManageMenu) return;
    draggedStepIndex = Number(row.dataset.stepIndex);
    event.dataTransfer?.setData("text/plain", String(draggedStepIndex));
    event.dataTransfer && (event.dataTransfer.effectAllowed = "move");
  }

  function handleStepDragOver(event) {
    if (!event.target.closest("[data-step-index]")) return;
    event.preventDefault();
  }

  function handleStepDrop(event) {
    const row = event.target.closest("[data-step-index]");
    if (!row || !canManageMenu) return;
    event.preventDefault();
    const from = draggedStepIndex ?? Number(event.dataTransfer?.getData("text/plain"));
    const to = Number(row.dataset.stepIndex);
    reorderSteps(from, to);
  }

  function openMenuEditor(menu = null, defaults = {}) {
    editingMenuId = menu?.id || "";
    editModalTitle.textContent = menu ? "메뉴 수정" : "메뉴 추가";
    editFields.nameKo.value = menu?.nameKo || "";
    editFields.nameEn.value = menu?.nameEn || "";
    renderMenuCategoryOptions(menu?.category || defaults.category || "");
    editFields.price.value = menu?.price || "";
    editFields.recipe.value = menu?.recipeId || "";
    editFields.seasonal.checked = Boolean(menu?.seasonal);
    editFields.active.checked = menu ? !menu.discontinued : true;
    editFields.discontinued.checked = menu ? Boolean(menu.discontinued) : false;
    deleteMenuEdit.classList.toggle("hidden", !menu);
    editModal.classList.remove("hidden");
    document.body.classList.add("modal-open");
    editFields.nameKo.focus();
  }

  function closeMenuEditor() {
    editModal.classList.add("hidden");
    document.body.classList.remove("modal-open");
  }

  function saveMenuFromEditor() {
    const nameKo = editFields.nameKo.value.trim();
    if (!nameKo) return;
    const isActive = editFields.active.checked;
    const confirmMessage = isActive ? "메뉴 정보를 저장할까요?" : "메뉴를 판매 중지 상태로 저장할까요?";
    if (!confirm(confirmMessage)) return;
    const existing = editingMenuId ? Store.getMenus().find((row) => row.id === editingMenuId) : null;
    const existingRecipe = existing ? recipeFor(existing) : null;
    const recipe = existingRecipe || {
      id: editFields.recipe.value || Store.id("recipe"),
      name: nameKo,
      section: editFields.category.value.trim() || "기타",
      description: "",
      ingredients: "",
      seasonings: "",
      steps: "",
      notes: "",
      imageUrl: "",
      ingredientItems: [],
      seasoningItems: [],
      stepItems: [],
      enabled: isActive,
      updatedAt: Store.today()
    };
    const recipeToSave = {
      ...recipe,
      name: recipe.name || nameKo,
      enabled: isActive,
      updatedAt: Store.today()
    };
    const menu = {
      ...(existing || {}),
      id: editingMenuId || Store.id("menu"),
      recipeId: recipeToSave.id,
      recipeName: recipeToSave.name,
      nameKo,
      nameEn: editFields.nameEn.value.trim(),
      category: editFields.category.value.trim(),
      price: editFields.price.value.trim(),
      currency: existing?.currency || "CAD",
      seasonal: editFields.seasonal.checked,
      discontinued: !isActive,
      notes: existing?.notes || ""
    };
    Store.saveMenuWithRecipe(recipeToSave, menu);
    closeMenuEditor();
    renderFilters();
    render();
  }

  function deleteMenuFromEditor() {
    if (!editingMenuId) return;
    const menu = Store.getMenus().find((row) => row.id === editingMenuId);
    if (!menu) return;
    if (!confirm(`${I18n.menuName(menu)} 메뉴를 삭제할까요?`)) return;
    Store.deleteMenu(editingMenuId);
    closeMenuEditor();
    renderFilters();
    render();
  }

  function actionButton(action, label, menu, extraClass = "") {
    const icons = {
      create: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14" /><path d="M5 12h14" /></svg>',
      edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></svg>',
      recipe: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>'
    };
    return `
      <button class="menu-row-action ${extraClass}" data-menu-action="${action}" data-menu-id="${menu.id}" type="button" aria-label="${I18n.menuName(menu)} ${label}">
        ${icons[action]}
      </button>
    `;
  }

  function rowActions(menu) {
    return `
      <div class="menu-row-actions">
        ${canManageMenu ? actionButton("create", "+", menu, "is-create") : ""}
        ${canManageMenu ? actionButton("edit", "U", menu, "is-edit") : ""}
        ${actionButton("recipe", "레시피", menu, "is-recipe")}
      </div>
    `;
  }

  function render() {
    if (!canViewMenu) {
      list.innerHTML = `<div class="list-card muted">${I18n.t("noAccess")}</div>`;
      return;
    }
    const menus = filteredMenus();
    if (!menus.length) {
      list.innerHTML = `<div class="list-card muted">${I18n.t("noMenus")}</div>`;
      return;
    }
    const groups = menus.reduce((acc, menu) => {
      const key = menu.category || "-";
      acc[key] = acc[key] || [];
      acc[key].push(menu);
      return acc;
    }, {});
    list.innerHTML = Object.entries(groups).map(([group, groupMenus]) => `
      <section class="menu-category-group">
        <h2>${group}</h2>
        <div class="list admin-section">
          ${groupMenus.map((menu) => `
            <article class="list-card menu-row" data-menu="${menu.id}">
              <div class="menu-row-main">
                <div class="menu-title-line">
                  <span class="menu-title-badges">${menuStatusBadges(menu)}</span>
                  <strong class="${menu.discontinued ? "is-discontinued" : ""}">${I18n.menuName(menu)}</strong>
                  ${menuPriceLine(menu)}
                </div>
              </div>
              ${rowActions(menu)}
            </article>
          `).join("")}
        </div>
      </section>
    `).join("");
    list.querySelectorAll("[data-menu-action]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const menu = Store.getMenus().find((row) => row.id === button.dataset.menuId);
        if (!menu) return;
        if (button.dataset.menuAction === "create") openMenuEditor(null, { category: menu.category });
        if (button.dataset.menuAction === "edit") openMenuEditor(menu);
        if (button.dataset.menuAction === "recipe") openRecipe(menu);
      });
    });
  }

  function applySearch() {
    searchQuery = search.value;
    render();
  }

  searchButton.addEventListener("click", applySearch);
  search.addEventListener("keydown", (event) => {
    if (event.key === "Enter") applySearch();
  });
  category.addEventListener("change", render);
  saveMenuEdit.addEventListener("click", saveMenuFromEditor);
  deleteMenuEdit.addEventListener("click", deleteMenuFromEditor);
  cancelMenuEdit.addEventListener("click", closeMenuEditor);
  editRecipeFromMenu.addEventListener("click", () => {
    const menu = activeRecipeMenu();
    const recipe = menu ? ensureRecipeForMenu(menu) : null;
    if (!recipe) {
      alert("수정할 레시피가 없습니다.");
      return;
    }
    openRecipeEditor(recipe);
  });
  deleteRecipeFromMenu.addEventListener("click", deleteActiveRecipeFromMenu);
  saveRecipeEdit.addEventListener("click", saveRecipeFromEditor);
  deleteRecipeEdit.addEventListener("click", deleteRecipeFromEditor);
  cancelRecipeEdit.addEventListener("click", closeRecipeEditor);
  modalClose.addEventListener("click", closeRecipe);
  modalContent.addEventListener("click", handleIngredientAction);
  modalContent.addEventListener("click", handleStepAction);
  modalContent.addEventListener("dragstart", handleStepDragStart);
  modalContent.addEventListener("dragover", handleStepDragOver);
  modalContent.addEventListener("drop", handleStepDrop);
  closeRecipeEdit.addEventListener("click", closeRecipeEditor);
  editModalClose.addEventListener("click", closeMenuEditor);
  modal.querySelectorAll("[data-close-recipe-modal]").forEach((button) => {
    button.addEventListener("click", closeRecipe);
  });
  editModal.querySelectorAll("[data-close-menu-edit]").forEach((button) => {
    button.addEventListener("click", closeMenuEditor);
  });
  recipeEditModal.querySelectorAll("[data-close-menu-recipe-edit]").forEach((button) => {
    button.addEventListener("click", closeRecipeEditor);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!recipeEditModal.classList.contains("hidden")) {
      closeRecipeEditor();
      return;
    }
    if (!editModal.classList.contains("hidden")) {
      closeMenuEditor();
      return;
    }
    if (!modal.classList.contains("hidden")) closeRecipe();
  });
  renderFilters();
  render();
  I18n.applyI18n();
})();
