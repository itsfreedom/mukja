(async function () {
  await Store.init({ datasets: ["settings", "recipes", "menus"] });
  AppUI.renderSidebar("menus");
  AppUI.registerServiceWorker();

  const search = document.getElementById("menu-search");
  const searchButton = document.getElementById("menu-search-button");
  const category = document.getElementById("menu-category");
  const list = document.getElementById("menu-list");
  const modeRow = document.getElementById("menu-mode-row");
  const viewModeButton = document.getElementById("menu-mode-view");
  const editModeButton = document.getElementById("menu-mode-edit");
  const recipeModeRow = document.getElementById("menu-recipe-mode-row");
  const recipeViewModeButton = document.getElementById("menu-recipe-mode-view");
  const recipeEditModeButton = document.getElementById("menu-recipe-mode-edit");
  const modal = document.getElementById("menu-recipe-modal");
  const modalTitle = document.getElementById("menu-recipe-title");
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
  let menuMode = "view";
  let editingMenuId = "";
  let activeRecipeMenuId = "";
  let editingRecipeId = "";
  let activeIngredientEdit = null;
  let activeStepEdit = null;
  let activeMenuEdit = null;
  let openStepPhotos = new Set();
  let draggedIngredientIndex = null;
  let draggedStepIndex = null;
  let draggedMenuId = null;
  let activeDropElement = null;
  const collapsedMenuCategories = new Set();
  const session = Store.getAuth();
  const canViewMenu = ["restaurant", "admin"].includes(session?.role);
  const canManageMenu = session?.role === "admin";
  const addIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14" /><path d="M5 12h14" /></svg>';
  const toggleIcon = '<svg class="toggle-triangle-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6h12" /><path d="M12 16 7 10h10z" fill="currentColor" stroke="none" /></svg>';
  const photoIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h2l1.5-2h3L15 7h2a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3z"/><circle cx="12" cy="13" r="3"/></svg>';

  function isMenuEditMode() {
    return canManageMenu && menuMode === "edit";
  }

  function normalizeDuplicateName(value) {
    return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
  }

  function findDuplicateMenuName({ id = "", nameKo = "" }) {
    const normalizedName = normalizeDuplicateName(nameKo);
    if (!normalizedName) return null;
    return Store.getMenus().find((row) =>
      row.id !== id &&
      normalizeDuplicateName(row.nameKo || row.recipeName) === normalizedName
    ) || null;
  }

  function blockDuplicateMenuName(id, nameKo) {
    if (!findDuplicateMenuName({ id, nameKo })) return false;
    window.alert(I18n.format("duplicateMenuName", { name: nameKo }));
    return true;
  }

  function updateMenuModeUI() {
    const edit = isMenuEditMode();
    modeRow?.classList.toggle("hidden", !canManageMenu);
    viewModeButton?.classList.toggle("is-active", !edit);
    editModeButton?.classList.toggle("is-active", edit);
    recipeModeRow?.classList.toggle("hidden", !canManageMenu);
    recipeViewModeButton?.classList.toggle("is-active", !edit);
    recipeEditModeButton?.classList.toggle("is-active", edit);
  }

  function renderFilters() {
    category.innerHTML = `<option value="">${I18n.t("all")}</option>` + Store.getMenuCategories()
      .map((name) => `<option value="${name}">${I18n.menuCategoryLabel(name)}</option>`)
      .join("");
    editFields.recipe.innerHTML = `<option value="">${I18n.t("recipeDetail")}</option>` + Store.getRecipes()
      .map((recipe) => `<option value="${recipe.id}">${I18n.recipeName(recipe)}</option>`)
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
      .map((name) => `<option value="${name}">${I18n.menuCategoryLabel(name)}</option>`)
      .join("");
    if (selected && !categories.length) {
      editFields.category.innerHTML = `<option value="${selected}">${selected}</option>`;
    }
    editFields.category.value = selected || categories[0] || "";
  }

  function menuCategoryOptions(selectedValue = "") {
    const categories = Store.getMenuCategories();
    const selected = String(selectedValue || "");
    if (selected && !categories.includes(selected)) categories.push(selected);
    return categories
      .map((name) => `<option value="${name}" ${name === selected ? "selected" : ""}>${I18n.menuCategoryLabel(name)}</option>`)
      .join("");
  }

  function filteredMenus() {
    const q = searchQuery.trim().toLowerCase();
    return Store.getMenus().filter((menu) => {
      if (category.value && menu.category !== category.value) return false;
      if (q && !`${menu.nameKo} ${menu.nameEn} ${menu.category} ${menu.recipeName}`.toLowerCase().includes(q)) return false;
      return true;
    }).sort((a, b) => {
      const categoryCompare = String(a.category || "").localeCompare(String(b.category || ""), "ko");
      if (categoryCompare) return categoryCompare;
      const orderCompare = (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0);
      if (orderCompare) return orderCompare;
      return String(a.nameKo || "").localeCompare(String(b.nameKo || ""), "ko");
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
    return `
      ${menu.seasonal ? `<span class="tiny-badge is-seasonal">${I18n.t("seasonalMenu")}</span>` : ""}
    `;
  }

  function menuPriceLabel(menu) {
    const price = String(menu?.price || "").trim();
    if (!price) return "";
    const numeric = Number(price.replace(/,/g, ""));
    const value = Number.isFinite(numeric) ? numeric.toFixed(2) : price;
    return `${menu.currency || "CAD"} ${value}`;
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

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        resolve("");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  function recipeWithIngredientItems(recipe, items) {
    const ingredientItems = Store.parseRecipeItems(items);
    if (I18n.lang() === "en") {
      return {
        ...recipe,
        ingredientItemsEn: ingredientItems,
        ingredientsEn: Store.recipeItemsToLines(ingredientItems),
        updatedAt: Store.today()
      };
    }
    return {
      ...recipe,
      ingredientItems,
      ingredients: Store.recipeItemsToLines(ingredientItems),
      updatedAt: Store.today()
    };
  }

  function recipeWithStepItems(recipe, items) {
    const stepItems = Store.parseRecipeSteps(items);
    if (I18n.lang() === "en") {
      return {
        ...recipe,
        stepItemsEn: stepItems,
        stepsEn: Store.recipeStepsToLines(stepItems),
        updatedAt: Store.today()
      };
    }
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
        <label><span>${I18n.t("ingredientName")}</span><input data-ingredient-name value="${escapeHtml(item.name)}" /></label>
        <label><span>${I18n.t("amount")}</span><input data-ingredient-quantity inputmode="decimal" value="${escapeHtml(amount.quantity)}" /></label>
        <label><span>${I18n.t("unit")}</span><input data-ingredient-unit value="${escapeHtml(amount.unit)}" /></label>
        <div class="recipe-item-form-actions">
          <button class="button" data-ingredient-action="save" data-index="${index}" type="button">${I18n.t("save")}</button>
          <button class="danger-button" data-ingredient-action="delete" data-index="${index}" type="button">${I18n.t("delete")}</button>
          <button class="ghost-button" data-ingredient-action="cancel" type="button">${I18n.t("close")}</button>
        </div>
      </div>
    `;
  }

  function ingredientCrudList(recipe) {
    const rows = I18n.recipeIngredientItems(recipe);
    const dragIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14" /><path d="m8 9 4-4 4 4" /><path d="m8 15 4 4 4-4" /></svg>';
    return `
      <section class="history-detail-card recipe-detail-section recipe-crud-section">
        <div class="recipe-section-title-row">
          <h2>${I18n.t("ingredients")}</h2>
          ${isMenuEditMode() ? `<button class="menu-row-action is-create" data-ingredient-action="add" type="button" aria-label="${I18n.t("addIngredient")}">${addIcon}</button>` : ""}
        </div>
        <div class="recipe-crud-list">
          ${rows.length ? rows.map((item, index) => {
            const amount = splitAmount(item.amount);
            const rowDraggable = isMenuEditMode() && activeIngredientEdit?.index !== index;
            return `
              <article class="list-card recipe-crud-row ${isMenuEditMode() ? "recipe-sortable-row" : ""}" data-ingredient-index="${index}" ${rowDraggable ? 'draggable="true"' : ""}>
                ${isMenuEditMode() ? `<button class="menu-row-action recipe-drag-handle recipe-leading-drag-handle" data-ingredient-drag-handle type="button" aria-label="${escapeHtml(item.name)} ${I18n.t("moveOrder")}">${dragIcon}</button>` : ""}
                <div class="recipe-crud-main">
                  <strong>${escapeHtml(item.name)}</strong>
                  <span>${escapeHtml([amount.quantity, amount.unit].filter(Boolean).join(" ") || "-")}</span>
                </div>
                ${isMenuEditMode() ? `<button class="menu-row-action is-edit" data-ingredient-action="edit" data-index="${index}" type="button" aria-label="${escapeHtml(item.name)} ${I18n.t("edit")}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></svg></button>` : ""}
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
        <label><span>${I18n.t("steps")}</span><input data-step-text value="${escapeHtml(step.text)}" /></label>
        <label><span>${I18n.t("photo")}</span><input data-step-image-file type="file" accept="image/*" capture="environment" /></label>
        <input data-step-image-current type="hidden" value="${escapeHtml(step.imageUrl)}" />
        <div class="recipe-step-photo-preview ${step.imageUrl ? "" : "is-empty"}" data-step-image-preview>
          <img src="${escapeHtml(step.imageUrl)}" alt="${I18n.t("photo")}" />
          <label class="menu-check-option ${step.imageUrl ? "" : "hidden"}" data-step-remove-image-row><input data-step-remove-image type="checkbox" /><span>${I18n.t("removePhoto")}</span></label>
        </div>
        <div class="recipe-item-form-actions">
          <button class="button" data-step-action="save" data-index="${index}" type="button">${I18n.t("save")}</button>
          <button class="danger-button" data-step-action="delete" data-index="${index}" type="button">${I18n.t("delete")}</button>
          <button class="ghost-button" data-step-action="cancel" type="button">${I18n.t("close")}</button>
        </div>
      </div>
    `;
  }

  function stepPhotoButton(step, index) {
    const hasPhoto = Boolean(step.imageUrl);
    const isOpen = openStepPhotos.has(index);
    return `
      <button class="menu-row-action recipe-photo-toggle ${hasPhoto ? "has-photo" : "is-disabled"} ${isOpen ? "is-active" : ""}" data-step-photo-toggle data-index="${index}" type="button" aria-label="${I18n.t("photo")}" ${hasPhoto ? "" : "disabled"}>
        ${photoIcon}
      </button>
    `;
  }

  function stepPhotoPanel(step, index) {
    if (!step.imageUrl || !openStepPhotos.has(index)) return "";
    return `
      <div class="recipe-step-photo-panel" data-step-photo-panel="${index}">
        <img src="${escapeHtml(step.imageUrl)}" alt="${I18n.t("photo")}" />
      </div>
    `;
  }

  function stepCrudList(recipe) {
    const rows = I18n.recipeStepItems(recipe);
    const dragIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14" /><path d="m8 9 4-4 4 4" /><path d="m8 15 4 4 4-4" /></svg>';
    return `
      <section class="history-detail-card recipe-detail-section recipe-crud-section">
        <div class="recipe-section-title-row">
          <h2>${I18n.t("steps")}</h2>
          ${isMenuEditMode() ? `<button class="menu-row-action is-create" data-step-action="add" type="button" aria-label="${I18n.t("addStep")}">${addIcon}</button>` : ""}
        </div>
        <div class="recipe-crud-list">
          ${rows.length ? rows.map((step, index) => {
            const rowDraggable = isMenuEditMode() && activeStepEdit?.index !== index;
            return `
            <article class="list-card recipe-crud-row recipe-step-crud-row ${isMenuEditMode() ? "recipe-sortable-row" : ""}" data-step-index="${index}" ${rowDraggable ? 'draggable="true"' : ""}>
              ${isMenuEditMode() ? `<button class="menu-row-action recipe-drag-handle recipe-leading-drag-handle" data-step-drag-handle type="button" aria-label="${index + 1} ${I18n.t("moveOrder")}">${dragIcon}</button>` : ""}
              <div class="recipe-step-crud-main">
                <p>${escapeHtml(step.text || "-")}</p>
              </div>
              ${isMenuEditMode() ? `
                <div class="recipe-crud-actions">
                  ${stepPhotoButton(step, index)}
                  <button class="menu-row-action is-edit" data-step-action="edit" data-index="${index}" type="button" aria-label="${index + 1} ${I18n.t("edit")}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></svg></button>
                </div>
              ` : ""}
            </article>
            ${stepPhotoPanel(step, index)}
            ${activeStepEdit?.index === index ? stepEditForm(step, index) : ""}
          `;
          }).join("") : `<p class="muted">-</p>`}
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
    const rows = I18n.recipeStepItems(recipe);
    return `
      <section class="history-detail-card recipe-detail-section">
        <h2>${I18n.t("steps")}</h2>
        <div class="recipe-step-list">
          ${rows.length ? rows.map((step, index) => `
            <article class="recipe-step-row">
              <div>
                <span>${index + 1}</span>
                <p>${step.text || "-"}</p>
                ${stepPhotoButton(step, index)}
              </div>
            </article>
            ${stepPhotoPanel(step, index)}
          `).join("") : `<p class="muted">-</p>`}
        </div>
      </section>
    `;
  }

  function recipeSections(menu, recipe) {
    if (!recipe) return `<section class="history-detail-card"><p class="muted">${I18n.t("noRecipes")}</p></section>`;
    return `
      ${ingredientCrudList(recipe)}
      ${isMenuEditMode() ? stepCrudList(recipe) : stepList(recipe)}
      ${(I18n.recipeNotes(recipe) || menu.notes) ? `<section class="history-detail-card recipe-detail-section"><h2>${I18n.t("notes")}</h2><p class="preview-box">${I18n.recipeNotes(recipe) || menu.notes}</p></section>` : ""}
    `;
  }

  function setRecipeUrl(menuId = "") {
    if (!window.history?.replaceState) return;
    const url = new URL(window.location.href);
    if (menuId) {
      url.searchParams.set("recipe", menuId);
    } else {
      url.searchParams.delete("recipe");
    }
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function openRecipe(menu, options = {}) {
    const recipe = ensureRecipeForMenu(menu);
    activeRecipeMenuId = menu.id;
    if (options.resetIngredientEdit !== false) {
      activeIngredientEdit = null;
      activeStepEdit = null;
      openStepPhotos = new Set();
    }
    modalTitle.textContent = I18n.menuName(menu);
    modalContent.innerHTML = `
      ${recipeSections(menu, recipe)}
    `;
    recipeActions.classList.toggle("hidden", !isMenuEditMode());
    modal.classList.remove("hidden");
    document.body.classList.add("modal-open");
    if (options.updateUrl !== false) setRecipeUrl(menu.id);
    modalClose.focus();
  }

  function closeRecipe() {
    modal.classList.add("hidden");
    activeIngredientEdit = null;
    activeStepEdit = null;
    openStepPhotos = new Set();
    draggedStepIndex = null;
    document.body.classList.remove("modal-open");
    setRecipeUrl("");
  }

  function activeRecipeMenu() {
    return Store.getMenus().find((menu) => menu.id === activeRecipeMenuId) || null;
  }

  function openRecipeEditor(recipe = null) {
    editingRecipeId = recipe?.id || "";
    recipeEditModalTitle.textContent = I18n.t("editRecipe");
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
    if (!confirm(I18n.format("confirmDeleteRecipe", { name: I18n.recipeName(recipe) }))) return;
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
    if (!confirm(I18n.format("confirmDeleteRecipe", { name: I18n.recipeName(recipe) }))) return;
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
    if (!button || !isMenuEditMode()) return;
    const menu = activeRecipeMenu();
    const recipe = menu ? recipeFor(menu) : null;
    if (!recipe) return;
    const rows = I18n.recipeIngredientItems(recipe);
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
      if (!confirm(I18n.t("confirmDeleteIngredient"))) return;
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

  function reorderedRows(rows, fromIndex, toIndex, position = "before") {
    const moved = rows[fromIndex];
    const target = rows[toIndex];
    if (!moved || !target) return rows;
    const next = rows.filter((_, index) => index !== fromIndex);
    const targetAfterMove = next.indexOf(target);
    next.splice(position === "after" ? targetAfterMove + 1 : targetAfterMove, 0, moved);
    return next;
  }

  function reorderIngredients(fromIndex, toIndex, position = "before") {
    const menu = activeRecipeMenu();
    const recipe = menu ? recipeFor(menu) : null;
    if (!recipe || fromIndex === null || toIndex === null || fromIndex === toIndex) return;
    const rows = I18n.recipeIngredientItems(recipe);
    if (!rows[fromIndex] || !rows[toIndex]) return;
    const next = reorderedRows(rows, fromIndex, toIndex, position);
    Store.saveRecipe(recipeWithIngredientItems(recipe, next));
    activeIngredientEdit = null;
    draggedIngredientIndex = null;
    clearDropMarker();
    rerenderActiveRecipe();
  }

  function handleIngredientDragStart(event) {
    const row = event.target.closest("[data-ingredient-index]");
    if (!row || !isMenuEditMode()) return;
    if (event.target.closest("[data-ingredient-form]")) return;
    draggedIngredientIndex = Number(row.dataset.ingredientIndex);
    event.dataTransfer?.setData("text/plain", String(draggedIngredientIndex));
    event.dataTransfer && (event.dataTransfer.effectAllowed = "move");
  }

  function handleIngredientDragOver(event) {
    const row = event.target.closest("[data-ingredient-index]");
    if (!row) return;
    event.preventDefault();
    markDropPosition(row, event);
  }

  function handleIngredientDrop(event) {
    const row = event.target.closest("[data-ingredient-index]");
    if (!row || !isMenuEditMode()) return;
    event.preventDefault();
    const position = markDropPosition(row, event);
    const from = draggedIngredientIndex ?? Number(event.dataTransfer?.getData("text/plain"));
    const to = Number(row.dataset.ingredientIndex);
    reorderIngredients(from, to, position);
  }

  async function handleStepAction(event) {
    const button = event.target.closest("[data-step-action]");
    if (!button || !isMenuEditMode()) return;
    const menu = activeRecipeMenu();
    const recipe = menu ? recipeFor(menu) : null;
    if (!recipe) return;
    const rows = I18n.recipeStepItems(recipe);
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
      if (!confirm(I18n.t("confirmDeleteStep"))) return;
      Store.saveRecipe(recipeWithStepItems(recipe, rows.filter((_, rowIndex) => rowIndex !== index)));
      activeStepEdit = null;
      rerenderActiveRecipe();
      return;
    }
    if (action === "save") {
      const form = button.closest("[data-step-form]");
      const text = form?.querySelector("[data-step-text]")?.value.trim() || "";
      const file = form?.querySelector("[data-step-image-file]")?.files?.[0] || null;
      const currentImage = form?.querySelector("[data-step-image-current]")?.value || "";
      const removeImage = Boolean(form?.querySelector("[data-step-remove-image]")?.checked);
      const imageUrl = removeImage ? "" : (file ? await fileToDataUrl(file) : currentImage);
      if (!text && !imageUrl) return;
      const next = rows.slice();
      next[index] = { text, imageUrl };
      Store.saveRecipe(recipeWithStepItems(recipe, next));
      activeStepEdit = null;
      rerenderActiveRecipe();
    }
  }

  function handleStepPhotoToggle(event) {
    const button = event.target.closest("[data-step-photo-toggle]");
    if (!button || button.disabled) return false;
    const index = Number(button.dataset.index);
    if (openStepPhotos.has(index)) {
      openStepPhotos.delete(index);
    } else {
      openStepPhotos.add(index);
    }
    rerenderActiveRecipe();
    return true;
  }

  async function handleStepFilePreview(event) {
    const input = event.target.closest("[data-step-image-file]");
    if (!input) return;
    const file = input.files?.[0] || null;
    const form = input.closest("[data-step-form]");
    const preview = form?.querySelector("[data-step-image-preview]");
    const image = preview?.querySelector("img");
    const removeRow = form?.querySelector("[data-step-remove-image-row]");
    if (!preview || !image || !file) return;
    image.src = await fileToDataUrl(file);
    preview.classList.remove("is-empty");
    removeRow?.classList.remove("hidden");
  }

  function reorderSteps(fromIndex, toIndex, position = "before") {
    const menu = activeRecipeMenu();
    const recipe = menu ? recipeFor(menu) : null;
    if (!recipe || fromIndex === null || toIndex === null || fromIndex === toIndex) return;
    const rows = I18n.recipeStepItems(recipe);
    if (!rows[fromIndex] || !rows[toIndex]) return;
    const next = reorderedRows(rows, fromIndex, toIndex, position);
    Store.saveRecipe(recipeWithStepItems(recipe, next));
    activeStepEdit = null;
    draggedStepIndex = null;
    clearDropMarker();
    rerenderActiveRecipe();
  }

  function handleStepDragStart(event) {
    const row = event.target.closest("[data-step-index]");
    if (!row || !isMenuEditMode()) return;
    if (event.target.closest("[data-step-form]")) return;
    draggedStepIndex = Number(row.dataset.stepIndex);
    event.dataTransfer?.setData("text/plain", String(draggedStepIndex));
    event.dataTransfer && (event.dataTransfer.effectAllowed = "move");
  }

  function handleStepDragOver(event) {
    const row = event.target.closest("[data-step-index]");
    if (!row) return;
    event.preventDefault();
    markDropPosition(row, event);
  }

  function handleStepDrop(event) {
    const row = event.target.closest("[data-step-index]");
    if (!row || !isMenuEditMode()) return;
    event.preventDefault();
    const position = markDropPosition(row, event);
    const from = draggedStepIndex ?? Number(event.dataTransfer?.getData("text/plain"));
    const to = Number(row.dataset.stepIndex);
    reorderSteps(from, to, position);
  }

  function openMenuEditor(menu = null, defaults = {}) {
    editingMenuId = menu?.id || "";
    editModalTitle.textContent = menu ? I18n.t("editMenu") : I18n.t("addMenu");
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
    if (blockDuplicateMenuName(editingMenuId, nameKo)) return;
    const isActive = editFields.active.checked;
    const confirmMessage = isActive ? I18n.t("confirmSaveMenu") : I18n.t("confirmDiscontinueMenu");
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
    if (!confirm(I18n.format("confirmDeleteItem", { name: I18n.menuName(menu) }))) return;
    Store.deleteMenu(editingMenuId);
    closeMenuEditor();
    renderFilters();
    render();
  }

  function menuEditForm(menu = null, defaults = {}) {
    const isNew = !menu;
    const selectedCategory = menu?.category || defaults.category || Store.getMenuCategories()[0] || "식사";
    const activeChecked = menu ? !menu.discontinued : true;
    const discontinuedChecked = menu ? Boolean(menu.discontinued) : false;
    return `
      <div class="recipe-item-form menu-inline-form" data-menu-form="${menu?.id || "__new__"}">
        <label><span>${I18n.t("koreanMenuName")}</span><input data-menu-name-ko value="${escapeHtml(menu?.nameKo || "")}" /></label>
        <label><span>${I18n.t("englishMenuName")}</span><input data-menu-name-en value="${escapeHtml(menu?.nameEn || "")}" /></label>
        <label><span>${I18n.t("menuCategory")}</span><select data-menu-category>${menuCategoryOptions(selectedCategory)}</select></label>
        <label><span>${I18n.t("price")} (CAD)</span><input data-menu-price inputmode="decimal" value="${escapeHtml(menu?.price || "")}" /></label>
        <div class="menu-option-row">
          <div class="menu-option-card menu-status-card">
            <label class="menu-check-option">
              <input data-menu-active name="menu-status-${menu?.id || "new"}" type="radio" value="active" ${activeChecked ? "checked" : ""} />
              <span>${I18n.t("activeSale")}</span>
            </label>
            <label class="menu-check-option">
              <input data-menu-discontinued name="menu-status-${menu?.id || "new"}" type="radio" value="discontinued" ${discontinuedChecked ? "checked" : ""} />
              <span>${I18n.t("inactiveSale")}</span>
            </label>
          </div>
          <label class="menu-option-card menu-check-option">
            <input data-menu-seasonal type="checkbox" ${menu?.seasonal ? "checked" : ""} />
            <span data-i18n="seasonalMenu">계절 메뉴</span>
          </label>
        </div>
        <div class="recipe-item-form-actions">
          <button class="button" data-menu-action="save" data-menu-id="${menu?.id || ""}" type="button">${I18n.t("save")}</button>
          <button class="danger-button ${isNew ? "hidden" : ""}" data-menu-action="delete" data-menu-id="${menu?.id || ""}" type="button">${I18n.t("delete")}</button>
          <button class="ghost-button" data-menu-action="cancel" type="button">${I18n.t("close")}</button>
        </div>
      </div>
    `;
  }

  function saveMenuFromInline(form, menu = null) {
    const nameKo = form?.querySelector("[data-menu-name-ko]")?.value.trim() || "";
    if (!nameKo) return;
    if (blockDuplicateMenuName(menu?.id || "", nameKo)) return;
    const isActive = form.querySelector("[data-menu-active]")?.checked;
    const confirmMessage = isActive ? I18n.t("confirmSaveMenu") : I18n.t("confirmDiscontinueMenu");
    if (!confirm(confirmMessage)) return;
    const categoryValue = form.querySelector("[data-menu-category]")?.value.trim() || "기타";
    const existingRecipe = menu ? recipeFor(menu) : null;
    const recipe = existingRecipe || {
      id: Store.id("recipe"),
      name: nameKo,
      section: categoryValue,
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
      section: recipe.section || categoryValue,
      enabled: isActive,
      updatedAt: Store.today()
    };
    const categoryMenus = Store.getMenus().filter((row) => row.category === categoryValue);
    const nextSortOrder = categoryMenus.length
      ? Math.max(...categoryMenus.map((row) => Number(row.sortOrder) || 0)) + 1
      : 1;
    const sortOrder = menu && menu.category === categoryValue
      ? (menu.sortOrder ?? nextSortOrder)
      : nextSortOrder;
    const nextMenu = {
      ...(menu || {}),
      id: menu?.id || Store.id("menu"),
      recipeId: recipeToSave.id,
      recipeName: recipeToSave.name,
      nameKo,
      nameEn: form.querySelector("[data-menu-name-en]")?.value.trim() || "",
      category: categoryValue,
      price: form.querySelector("[data-menu-price]")?.value.trim() || "",
      currency: menu?.currency || "CAD",
      seasonal: Boolean(form.querySelector("[data-menu-seasonal]")?.checked),
      discontinued: !isActive,
      notes: menu?.notes || "",
      sortOrder
    };
    Store.saveMenuWithRecipe(recipeToSave, nextMenu);
    activeMenuEdit = null;
    renderFilters();
    render();
  }

  function clearDropMarker() {
    if (!activeDropElement) return;
    activeDropElement.classList.remove("is-drop-before", "is-drop-after");
    activeDropElement = null;
  }

  function isMenuCategoryCollapsed(categoryName) {
    return collapsedMenuCategories.has(categoryName || "-");
  }

  function setMenuCategoryCollapsed(categoryName, collapsed) {
    const key = categoryName || "-";
    if (collapsed) collapsedMenuCategories.add(key);
    else collapsedMenuCategories.delete(key);
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

  function reorderMenus(fromId, toId, position = "before") {
    if (!fromId || !toId || fromId === toId) return;
    const menus = Store.getMenus();
    const fromMenu = menus.find((menu) => menu.id === fromId);
    const toMenu = menus.find((menu) => menu.id === toId);
    if (!fromMenu || !toMenu || fromMenu.category !== toMenu.category) return;
    const categoryMenus = menus
      .filter((menu) => menu.category === fromMenu.category)
      .sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0) || String(a.nameKo || "").localeCompare(String(b.nameKo || ""), "ko"));
    const fromIndex = categoryMenus.findIndex((menu) => menu.id === fromId);
    const toIndex = categoryMenus.findIndex((menu) => menu.id === toId);
    if (fromIndex < 0 || toIndex < 0) return;
    const moved = categoryMenus[fromIndex];
    const target = categoryMenus[toIndex];
    const nextCategoryMenus = categoryMenus.filter((menu) => menu.id !== fromId);
    const targetAfterMove = nextCategoryMenus.findIndex((menu) => menu.id === target.id);
    nextCategoryMenus.splice(position === "after" ? targetAfterMove + 1 : targetAfterMove, 0, moved);
    const orderById = new Map(nextCategoryMenus.map((menu, index) => [menu.id, index + 1]));
    const nextMenus = menus.map((menu) => orderById.has(menu.id) ? { ...menu, sortOrder: orderById.get(menu.id) } : menu);
    Store.setMenus(nextMenus);
    activeMenuEdit = null;
    draggedMenuId = null;
    clearDropMarker();
    render();
  }

  function actionButton(action, label, menu, extraClass = "") {
    const icons = {
      create: addIcon,
      edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></svg>',
      drag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14" /><path d="m8 9 4-4 4 4" /><path d="m8 15 4 4 4-4" /></svg>',
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
        ${isMenuEditMode() ? actionButton("edit", "U", menu, "is-edit") : ""}
        ${actionButton("recipe", I18n.t("recipes"), menu, "is-recipe")}
      </div>
    `;
  }

  function render() {
    updateMenuModeUI();
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
    list.innerHTML = Object.entries(groups).map(([group, groupMenus]) => {
      const collapsed = isMenuCategoryCollapsed(group) && activeMenuEdit?.category !== group;
      return `
      <section class="menu-category-group ${collapsed ? "is-collapsed" : ""}" data-menu-category-row data-menu-category-name="${escapeHtml(group)}">
        <div class="section-title-row menu-category-title-row">
          <h2>${I18n.menuCategoryLabel(group, groupMenus[0])}</h2>
          <div class="menu-row-actions menu-category-actions">
            <button class="menu-row-action menu-category-toggle ${collapsed ? "" : "is-expanded"}" data-menu-category-action="toggle" data-menu-category="${escapeHtml(group)}" type="button" aria-expanded="${collapsed ? "false" : "true"}" aria-label="${I18n.menuCategoryLabel(group, groupMenus[0])} ${I18n.t(collapsed ? "expandCategory" : "collapseCategory")}">${toggleIcon}</button>
            ${isMenuEditMode() && !collapsed ? `<button class="menu-row-action is-create" data-menu-action="create" data-menu-category="${escapeHtml(group)}" type="button" aria-label="${escapeHtml(group)} 메뉴 추가">${addIcon}</button>` : ""}
          </div>
        </div>
        ${collapsed ? "" : `<hr class="section-divider section-title-divider" />`}
        <div class="list menu-category-list">
          ${collapsed ? "" : `
          ${groupMenus.map((menu) => `
            <article class="list-card menu-row ${isMenuEditMode() ? "has-leading-action" : ""}" data-menu="${menu.id}" ${isMenuEditMode() && activeMenuEdit?.id !== menu.id ? 'draggable="true"' : ""}>
              ${isMenuEditMode() ? actionButton("drag", I18n.t("moveOrder"), menu, "menu-drag-handle recipe-drag-handle") : ""}
              <div class="menu-row-main">
                <div class="menu-title-line">
                  <span class="menu-title-badges">${menuStatusBadges(menu)}</span>
                  <strong class="${menu.discontinued ? "is-discontinued" : ""}">${I18n.menuName(menu)}</strong>
                  ${!isMenuEditMode() && menuPriceLabel(menu) ? `<span class="menu-price-label">${escapeHtml(menuPriceLabel(menu))}</span>` : ""}
                </div>
              </div>
              ${rowActions(menu)}
            </article>
            ${activeMenuEdit?.id === menu.id ? menuEditForm(menu) : ""}
          `).join("")}
          ${activeMenuEdit?.isNew && activeMenuEdit.category === group ? menuEditForm(null, { category: group }) : ""}
          `}
        </div>
      </section>
    `;
    }).join("");
    list.querySelectorAll("[data-menu-category-action]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const categoryName = button.dataset.menuCategory || "-";
        setMenuCategoryCollapsed(categoryName, !isMenuCategoryCollapsed(categoryName));
        activeMenuEdit = null;
        clearDropMarker();
        render();
      });
    });
    list.querySelectorAll("[data-menu-action]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const menu = Store.getMenus().find((row) => row.id === button.dataset.menuId);
        const action = button.dataset.menuAction;
        if (["create", "cancel", "save", "edit", "delete"].includes(action) && !isMenuEditMode()) return;
        if (action === "create") {
          activeMenuEdit = { isNew: true, category: button.dataset.menuCategory || Store.getMenuCategories()[0] || "식사" };
          render();
          return;
        }
        if (action === "cancel") {
          activeMenuEdit = null;
          render();
          return;
        }
        if (action === "save") {
          saveMenuFromInline(button.closest("[data-menu-form]"), menu || null);
          return;
        }
        if (!menu) return;
        if (action === "edit") {
          activeMenuEdit = activeMenuEdit?.id === menu.id ? null : { id: menu.id };
          render();
        }
        if (action === "delete") {
          if (!confirm(I18n.format("confirmDeleteItem", { name: I18n.menuName(menu) }))) return;
          Store.deleteMenu(menu.id);
          activeMenuEdit = null;
          renderFilters();
          render();
        }
        if (action === "recipe") openRecipe(menu);
      });
    });
    list.querySelectorAll("[data-menu]").forEach((row) => {
      row.addEventListener("dragstart", (event) => {
        if (!isMenuEditMode()) return;
        if (event.target.closest("[data-menu-form]")) return;
        draggedMenuId = row.dataset.menu;
        event.dataTransfer?.setData("text/plain", draggedMenuId);
        event.dataTransfer && (event.dataTransfer.effectAllowed = "move");
      });
      row.addEventListener("dragover", (event) => {
        if (!isMenuEditMode()) return;
        event.preventDefault();
        markDropPosition(row, event);
      });
      row.addEventListener("drop", (event) => {
        if (!isMenuEditMode()) return;
        event.preventDefault();
        const position = markDropPosition(row, event);
        const fromId = draggedMenuId || event.dataTransfer?.getData("text/plain");
        reorderMenus(fromId, row.dataset.menu, position);
      });
      row.addEventListener("dragend", () => {
        draggedMenuId = null;
        clearDropMarker();
      });
    });
  }

  function applySearch() {
    searchQuery = search.value;
    render();
  }

  function setMenuMode(mode) {
    menuMode = canManageMenu && mode === "edit" ? "edit" : "view";
    activeMenuEdit = null;
    activeIngredientEdit = null;
    activeStepEdit = null;
    draggedMenuId = null;
    draggedIngredientIndex = null;
    draggedStepIndex = null;
    openStepPhotos = new Set();
    clearDropMarker();
    render();
    if (activeRecipeMenuId && !modal.classList.contains("hidden")) {
      rerenderActiveRecipe();
    }
  }

  viewModeButton?.addEventListener("click", () => setMenuMode("view"));
  editModeButton?.addEventListener("click", () => setMenuMode("edit"));
  recipeViewModeButton?.addEventListener("click", () => setMenuMode("view"));
  recipeEditModeButton?.addEventListener("click", () => setMenuMode("edit"));
  searchButton.addEventListener("click", applySearch);
  search.addEventListener("keydown", (event) => {
    if (event.key === "Enter") applySearch();
  });
  category.addEventListener("change", render);
  saveMenuEdit.addEventListener("click", saveMenuFromEditor);
  deleteMenuEdit.addEventListener("click", deleteMenuFromEditor);
  cancelMenuEdit.addEventListener("click", closeMenuEditor);
  editRecipeFromMenu.addEventListener("click", closeRecipe);
  deleteRecipeFromMenu.addEventListener("click", deleteActiveRecipeFromMenu);
  saveRecipeEdit.addEventListener("click", saveRecipeFromEditor);
  deleteRecipeEdit.addEventListener("click", deleteRecipeFromEditor);
  cancelRecipeEdit.addEventListener("click", closeRecipeEditor);
  modalClose.addEventListener("click", closeRecipe);
  modalContent.addEventListener("click", (event) => {
    if (handleStepPhotoToggle(event)) event.stopPropagation();
  });
  modalContent.addEventListener("click", handleIngredientAction);
  modalContent.addEventListener("click", handleStepAction);
  modalContent.addEventListener("change", handleStepFilePreview);
  modalContent.addEventListener("dragstart", handleIngredientDragStart);
  modalContent.addEventListener("dragover", handleIngredientDragOver);
  modalContent.addEventListener("drop", handleIngredientDrop);
  modalContent.addEventListener("dragstart", handleStepDragStart);
  modalContent.addEventListener("dragover", handleStepDragOver);
  modalContent.addEventListener("drop", handleStepDrop);
  modalContent.addEventListener("dragend", clearDropMarker);
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
  const recipeParam = new URLSearchParams(window.location.search).get("recipe") || "";
  if (recipeParam) {
    const menu = Store.getMenus().find((row) => row.id === recipeParam);
    if (menu) {
      openRecipe(menu, { updateUrl: false });
    } else {
      setRecipeUrl("");
    }
  }
  I18n.applyI18n();
})();
