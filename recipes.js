(async function () {
  await Store.init({ datasets: ["settings", "recipes"] });
  AppUI.renderSidebar("recipes");
  AppUI.registerServiceWorker();

  const search = document.getElementById("recipe-search");
  const section = document.getElementById("recipe-section");
  const list = document.getElementById("recipe-list");
  const detail = document.getElementById("recipe-detail");
  const manageActions = document.getElementById("recipe-manage-actions");
  const modeRow = document.getElementById("recipe-mode-row");
  const viewModeButton = document.getElementById("recipe-mode-view");
  const editModeButton = document.getElementById("recipe-mode-edit");
  const params = new URLSearchParams(window.location.search);
  let activeId = params.get("id") || "";
  const session = Store.getAuth();
  const canManageRecipes = session?.role === "admin";
  let recipeMode = "view";
  const closeButton = document.getElementById("close-recipe");
  const addIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14" /><path d="M5 12h14" /></svg>';
  let activeIngredientEdit = null;
  let activeStepEdit = null;
  let draggedIngredientIndex = null;
  let draggedStepIndex = null;
  let activeDropElement = null;
  if (params.get("from") === "menu") closeButton.classList.remove("hidden");
  closeButton.addEventListener("click", () => {
    window.location.href = "menu.html";
  });

  function isRecipeEditMode() {
    return canManageRecipes && recipeMode === "edit";
  }

  function updateRecipeModeUI() {
    const edit = isRecipeEditMode();
    modeRow?.classList.toggle("hidden", !canManageRecipes);
    viewModeButton?.classList.toggle("is-active", !edit);
    editModeButton?.classList.toggle("is-active", edit);
  }

  function renderFilters() {
    section.innerHTML = `<option value="">${I18n.t("all")}</option>` + Store.getSections().map((s) => `<option value="${s}">${I18n.sectionLabel(s)}</option>`).join("");
  }

  function filtered() {
    const q = search.value.trim().toLowerCase();
    return Store.getRecipes().filter((recipe) => {
      if (section.value && recipe.section !== section.value) return false;
      if (q && !`${recipe.name} ${recipe.nameEn} ${recipe.description} ${recipe.descriptionEn} ${recipe.ingredients} ${recipe.ingredientsEn} ${recipe.seasonings}`.toLowerCase().includes(q)) return false;
      return true;
    });
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

  function ingredientCrudSection(recipe) {
    const rows = I18n.recipeIngredientItems(recipe);
    const dragIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14" /><path d="m8 9 4-4 4 4" /><path d="m8 15 4 4 4-4" /></svg>';
    return `
      <section class="history-detail-card recipe-detail-section recipe-crud-section">
        <div class="recipe-section-title-row">
          <h2>${I18n.t("ingredients")}</h2>
          ${isRecipeEditMode() ? `<button class="menu-row-action is-create" data-ingredient-action="add" type="button" aria-label="${I18n.t("addIngredient")}">${addIcon}</button>` : ""}
        </div>
        <div class="recipe-crud-list">
          ${rows.length ? rows.map((item, index) => {
            const amount = splitAmount(item.amount);
            return `
              <article class="list-card recipe-crud-row ${isRecipeEditMode() ? "recipe-sortable-row" : ""}" data-ingredient-index="${index}" ${isRecipeEditMode() ? 'draggable="true"' : ""}>
                ${isRecipeEditMode() ? `<button class="menu-row-action recipe-drag-handle recipe-leading-drag-handle" data-ingredient-drag-handle type="button" aria-label="${escapeHtml(item.name)} ${I18n.t("moveOrder")}">${dragIcon}</button>` : ""}
                <div class="recipe-crud-main">
                  <strong>${escapeHtml(item.name)}</strong>
                  <span>${escapeHtml([amount.quantity, amount.unit].filter(Boolean).join(" ") || "-")}</span>
                </div>
                ${isRecipeEditMode() ? `<button class="menu-row-action is-edit" data-ingredient-action="edit" data-index="${index}" type="button" aria-label="${escapeHtml(item.name)} ${I18n.t("edit")}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></svg></button>` : ""}
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
        ${step.imageUrl ? `
          <div class="recipe-step-photo-preview">
            <img src="${escapeHtml(step.imageUrl)}" alt="${I18n.t("photo")}" />
            <label class="menu-check-option"><input data-step-remove-image type="checkbox" /><span>${I18n.t("removePhoto")}</span></label>
          </div>
        ` : ""}
        <div class="recipe-item-form-actions">
          <button class="button" data-step-action="save" data-index="${index}" type="button">${I18n.t("save")}</button>
          <button class="danger-button" data-step-action="delete" data-index="${index}" type="button">${I18n.t("delete")}</button>
          <button class="ghost-button" data-step-action="cancel" type="button">${I18n.t("close")}</button>
        </div>
      </div>
    `;
  }

  function stepCrudSection(recipe) {
    const rows = I18n.recipeStepItems(recipe);
    const dragIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14" /><path d="m8 9 4-4 4 4" /><path d="m8 15 4 4 4-4" /></svg>';
    return `
      <section class="history-detail-card recipe-detail-section recipe-crud-section">
        <div class="recipe-section-title-row">
          <h2>${I18n.t("steps")}</h2>
          ${isRecipeEditMode() ? `<button class="menu-row-action is-create" data-step-action="add" type="button" aria-label="${I18n.t("addStep")}">${addIcon}</button>` : ""}
        </div>
        <div class="recipe-crud-list">
          ${rows.length ? rows.map((step, index) => `
            <article class="list-card recipe-crud-row recipe-step-crud-row ${isRecipeEditMode() ? "recipe-sortable-row" : ""}" data-step-index="${index}" ${isRecipeEditMode() ? 'draggable="true"' : ""}>
              ${isRecipeEditMode() ? `<button class="menu-row-action recipe-drag-handle recipe-leading-drag-handle" data-step-drag-handle type="button" aria-label="${index + 1} ${I18n.t("moveOrder")}">${dragIcon}</button>` : ""}
              <div class="recipe-step-crud-main">
                <p>${escapeHtml(step.text || "-")}</p>
                ${step.imageUrl ? `<small>${escapeHtml(step.imageUrl)}</small>` : ""}
              </div>
              ${isRecipeEditMode() ? `
                <div class="recipe-crud-actions">
                  <button class="menu-row-action is-edit" data-step-action="edit" data-index="${index}" type="button" aria-label="${index + 1} ${I18n.t("edit")}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></svg></button>
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

  function recipeTextArea(id, title, value, placeholder) {
    const disabled = isRecipeEditMode() ? "" : "disabled";
    return `
      <section class="history-detail-card recipe-detail-section">
        <h2>${title}</h2>
        <textarea id="${id}" class="recipe-inline-textarea" ${disabled} placeholder="${escapeHtml(placeholder)}">${escapeHtml(value)}</textarea>
      </section>
    `;
  }

  function recipeFooterActions() {
    if (!isRecipeEditMode()) return "";
    return `
      <section class="recipe-footer-actions">
        <button class="ghost-button recipe-action-button" data-close-recipe-detail type="button">${I18n.t("close")}</button>
        <button class="danger-button recipe-action-button" data-delete-recipe type="button">${I18n.t("delete")}</button>
      </section>
    `;
  }

  function stepViewSection(recipe) {
    const rows = I18n.recipeStepItems(recipe);
    return `
      <section class="history-detail-card recipe-detail-section">
        <h2>${I18n.t("steps")}</h2>
        <div class="recipe-step-list">
          ${rows.length ? rows.map((step, index) => `
            <article class="recipe-step-row">
              ${step.imageUrl ? `<img src="${escapeHtml(step.imageUrl)}" alt="${I18n.recipeName(recipe)} ${index + 1}" />` : ""}
              <div>
                <span>${index + 1}</span>
                <p>${escapeHtml(step.text || "-")}</p>
              </div>
            </article>
          `).join("") : `<p class="muted">-</p>`}
        </div>
      </section>
    `;
  }

  function renderDetail(recipe) {
    if (!recipe) {
      detail.textContent = I18n.t("noRecipes");
      return;
    }
    detail.innerHTML = `
      <div class="recipe-detail-title-row">
        <h2>${I18n.recipeName(recipe)}</h2>
      </div>
      <hr class="recipe-detail-rule" />
      ${recipeTextArea("recipe-description-inline", I18n.t("description"), I18n.recipeDescription(recipe), I18n.t("description"))}
      ${ingredientCrudSection(recipe)}
      ${isRecipeEditMode() ? stepCrudSection(recipe) : stepViewSection(recipe)}
      ${recipeTextArea("recipe-notes-inline", I18n.t("notes"), I18n.recipeNotes(recipe), I18n.t("notes"))}
      <p class="muted">${I18n.t("updatedAt")}: ${recipe.updatedAt || "-"}</p>
      ${recipeFooterActions()}
    `;
  }

  function selectedRecipe() {
    return Store.getRecipes().find((recipe) => recipe.id === activeId) || null;
  }

  function saveInlineRecipe() {
    const existing = selectedRecipe();
    if (!existing || !isRecipeEditMode()) return;
    const ingredientItems = Store.parseRecipeItems(existing.ingredientItems?.length ? existing.ingredientItems : existing.ingredients);
    const ingredientItemsEn = Store.parseRecipeItems(existing.ingredientItemsEn?.length ? existing.ingredientItemsEn : existing.ingredientsEn);
    const stepItems = Store.parseRecipeSteps(existing.stepItems?.length ? existing.stepItems : existing.steps);
    const stepItemsEn = Store.parseRecipeSteps(existing.stepItemsEn?.length ? existing.stepItemsEn : existing.stepsEn);
    const descriptionValue = document.getElementById("recipe-description-inline")?.value.trim() || "";
    const notesValue = document.getElementById("recipe-notes-inline")?.value.trim() || "";
    const recipe = {
      ...(existing || {}),
      description: I18n.lang() === "en" ? existing.description || "" : descriptionValue,
      descriptionEn: I18n.lang() === "en" ? descriptionValue : existing.descriptionEn || "",
      ingredients: Store.recipeItemsToLines(ingredientItems),
      ingredientsEn: Store.recipeItemsToLines(ingredientItemsEn),
      seasonings: existing.seasonings || "",
      steps: Store.recipeStepsToLines(stepItems),
      stepsEn: Store.recipeStepsToLines(stepItemsEn),
      notes: I18n.lang() === "en" ? existing.notes || "" : notesValue,
      notesEn: I18n.lang() === "en" ? notesValue : existing.notesEn || "",
      imageUrl: existing?.imageUrl || "",
      ingredientItems,
      ingredientItemsEn,
      seasoningItems: existing.seasoningItems || [],
      stepItems,
      stepItemsEn,
      enabled: existing.enabled !== false,
      updatedAt: Store.today()
    };
    Store.saveRecipe(recipe);
    activeId = recipe.id;
    renderFilters();
    render();
  }

  function deleteInlineRecipe() {
    const recipe = selectedRecipe();
    if (!recipe || !isRecipeEditMode()) return;
    if (!confirm(I18n.format("confirmDeleteRecipe", { name: I18n.recipeName(recipe) }))) return;
    Store.deleteRecipe(recipe.id);
    activeId = "";
    renderFilters();
    render();
  }

  function render() {
    updateRecipeModeUI();
    manageActions.classList.toggle("hidden", !canManageRecipes);
    const recipes = filtered();
    if (!recipes.length) {
      list.innerHTML = `<div class="panel muted">${I18n.t("noRecipes")}</div>`;
      renderDetail(null);
      return;
    }
    if (!activeId || !recipes.some((recipe) => recipe.id === activeId)) activeId = recipes[0].id;
    list.innerHTML = recipes.map((recipe) => `
      <button class="list-card ${recipe.id === activeId ? "is-active" : ""}" data-recipe="${recipe.id}" type="button">
        <div class="list-card-header">
          <strong>${I18n.recipeName(recipe)}</strong>
        </div>
      </button>
    `).join("");
    list.querySelectorAll("[data-recipe]").forEach((button) => {
      button.addEventListener("click", () => {
        activeId = button.dataset.recipe;
        render();
      });
    });
    renderDetail(recipes.find((recipe) => recipe.id === activeId));
  }

  function handleIngredientAction(event) {
    const button = event.target.closest("[data-ingredient-action]");
    if (!button || !isRecipeEditMode()) return;
    const recipe = selectedRecipe();
    if (!recipe) return;
    const rows = I18n.recipeIngredientItems(recipe);
    const action = button.dataset.ingredientAction;
    const index = Number(button.dataset.index || rows.length);
    if (action === "add") {
      activeIngredientEdit = { index: rows.length, isNew: true };
      render();
      return;
    }
    if (action === "edit") {
      activeIngredientEdit = { index, isNew: false };
      render();
      return;
    }
    if (action === "cancel") {
      activeIngredientEdit = null;
      render();
      return;
    }
    if (action === "delete") {
      if (!confirm(I18n.t("confirmDeleteIngredient"))) return;
      Store.saveRecipe(recipeWithIngredientItems(recipe, rows.filter((_, rowIndex) => rowIndex !== index)));
      activeIngredientEdit = null;
      renderFilters();
      render();
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
      renderFilters();
      render();
    }
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
    const recipe = selectedRecipe();
    if (!recipe || fromIndex === null || toIndex === null || fromIndex === toIndex) return;
    const rows = I18n.recipeIngredientItems(recipe);
    if (!rows[fromIndex] || !rows[toIndex]) return;
    const next = reorderedRows(rows, fromIndex, toIndex, position);
    Store.saveRecipe(recipeWithIngredientItems(recipe, next));
    activeIngredientEdit = null;
    draggedIngredientIndex = null;
    clearDropMarker();
    renderFilters();
    render();
  }

  function handleIngredientDragStart(event) {
    const row = event.target.closest("[data-ingredient-index]");
    if (!row || !isRecipeEditMode()) return;
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
    if (!row || !isRecipeEditMode()) return;
    event.preventDefault();
    const position = markDropPosition(row, event);
    const from = draggedIngredientIndex ?? Number(event.dataTransfer?.getData("text/plain"));
    const to = Number(row.dataset.ingredientIndex);
    reorderIngredients(from, to, position);
  }

  async function handleStepAction(event) {
    const button = event.target.closest("[data-step-action]");
    if (!button || !isRecipeEditMode()) return;
    const recipe = selectedRecipe();
    if (!recipe) return;
    const rows = I18n.recipeStepItems(recipe);
    const action = button.dataset.stepAction;
    const index = Number(button.dataset.index || rows.length);
    if (action === "add") {
      activeStepEdit = { index: rows.length, isNew: true };
      render();
      return;
    }
    if (action === "edit") {
      activeStepEdit = { index, isNew: false };
      render();
      return;
    }
    if (action === "cancel") {
      activeStepEdit = null;
      render();
      return;
    }
    if (action === "delete") {
      if (!confirm(I18n.t("confirmDeleteStep"))) return;
      Store.saveRecipe(recipeWithStepItems(recipe, rows.filter((_, rowIndex) => rowIndex !== index)));
      activeStepEdit = null;
      renderFilters();
      render();
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
      renderFilters();
      render();
    }
  }

  function reorderSteps(fromIndex, toIndex, position = "before") {
    const recipe = selectedRecipe();
    if (!recipe || fromIndex === null || toIndex === null || fromIndex === toIndex) return;
    const rows = I18n.recipeStepItems(recipe);
    if (!rows[fromIndex] || !rows[toIndex]) return;
    const next = reorderedRows(rows, fromIndex, toIndex, position);
    Store.saveRecipe(recipeWithStepItems(recipe, next));
    activeStepEdit = null;
    draggedStepIndex = null;
    clearDropMarker();
    renderFilters();
    render();
  }

  function handleStepDragStart(event) {
    const row = event.target.closest("[data-step-index]");
    if (!row || !isRecipeEditMode()) return;
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
    if (!row || !isRecipeEditMode()) return;
    event.preventDefault();
    const position = markDropPosition(row, event);
    const from = draggedStepIndex ?? Number(event.dataTransfer?.getData("text/plain"));
    const to = Number(row.dataset.stepIndex);
    reorderSteps(from, to, position);
  }

  search.addEventListener("input", render);
  section.addEventListener("change", render);
  function setRecipeMode(mode) {
    recipeMode = canManageRecipes && mode === "edit" ? "edit" : "view";
    activeIngredientEdit = null;
    activeStepEdit = null;
    draggedIngredientIndex = null;
    draggedStepIndex = null;
    clearDropMarker();
    render();
  }
  viewModeButton?.addEventListener("click", () => setRecipeMode("view"));
  editModeButton?.addEventListener("click", () => setRecipeMode("edit"));
  detail.addEventListener("click", (event) => {
    if (event.target.closest("[data-close-recipe-detail]")) {
      window.location.href = "menu.html";
      return;
    }
    if (event.target.closest("[data-delete-recipe]")) deleteInlineRecipe();
    handleIngredientAction(event);
    handleStepAction(event);
  });
  detail.addEventListener("dragstart", handleIngredientDragStart);
  detail.addEventListener("dragover", handleIngredientDragOver);
  detail.addEventListener("drop", handleIngredientDrop);
  detail.addEventListener("dragstart", handleStepDragStart);
  detail.addEventListener("dragover", handleStepDragOver);
  detail.addEventListener("drop", handleStepDrop);
  detail.addEventListener("dragend", clearDropMarker);
  renderFilters();
  render();
  I18n.applyI18n();
})();
