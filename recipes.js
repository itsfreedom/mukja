(async function () {
  await Store.init();
  AppUI.renderSidebar("recipes");
  AppUI.registerServiceWorker();

  const search = document.getElementById("recipe-search");
  const section = document.getElementById("recipe-section");
  const list = document.getElementById("recipe-list");
  const detail = document.getElementById("recipe-detail");
  const manageActions = document.getElementById("recipe-manage-actions");
  const params = new URLSearchParams(window.location.search);
  let activeId = params.get("id") || "";
  const session = Store.getAuth();
  const canManageRecipes = session?.role === "admin";
  const closeButton = document.getElementById("close-recipe");
  let activeIngredientEdit = null;
  let activeStepEdit = null;
  let draggedStepIndex = null;
  if (params.get("from") === "menu") closeButton.classList.remove("hidden");
  closeButton.addEventListener("click", () => {
    window.location.href = "menu.html";
  });

  function renderFilters() {
    section.innerHTML = `<option value="">${I18n.t("all")}</option>` + Store.getSections().map((s) => `<option value="${s}">${I18n.sectionLabel(s)}</option>`).join("");
  }

  function filtered() {
    const q = search.value.trim().toLowerCase();
    return Store.getRecipes().filter((recipe) => {
      if (section.value && recipe.section !== section.value) return false;
      if (q && !`${recipe.name} ${recipe.description} ${recipe.ingredients} ${recipe.seasonings}`.toLowerCase().includes(q)) return false;
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

  function ingredientCrudSection(recipe) {
    const rows = Store.parseRecipeItems(recipe.ingredientItems?.length ? recipe.ingredientItems : recipe.ingredients);
    return `
      <section class="history-detail-card recipe-detail-section recipe-crud-section">
        <div class="recipe-section-title-row">
          <h2>${I18n.t("ingredients")}</h2>
          ${canManageRecipes ? `<button class="menu-row-action is-create" data-ingredient-action="add" type="button" aria-label="재료 추가"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14" /><path d="M5 12h14" /></svg></button>` : ""}
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
                ${canManageRecipes ? `<button class="menu-row-action is-edit" data-ingredient-action="edit" data-index="${index}" type="button" aria-label="${escapeHtml(item.name)} 수정"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></svg></button>` : ""}
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

  function stepCrudSection(recipe) {
    const rows = Store.parseRecipeSteps(recipe.stepItems?.length ? recipe.stepItems : recipe.steps);
    return `
      <section class="history-detail-card recipe-detail-section recipe-crud-section">
        <div class="recipe-section-title-row">
          <h2>${I18n.t("steps")}</h2>
          ${canManageRecipes ? `<button class="menu-row-action is-create" data-step-action="add" type="button" aria-label="조리 순서 추가"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14" /><path d="M5 12h14" /></svg></button>` : ""}
        </div>
        <div class="recipe-crud-list">
          ${rows.length ? rows.map((step, index) => `
            <article class="list-card recipe-crud-row recipe-step-crud-row" data-step-index="${index}" ${canManageRecipes ? 'draggable="true"' : ""}>
              <div class="recipe-step-crud-main">
                <span class="recipe-step-number">${index + 1}</span>
                <p>${escapeHtml(step.text || "-")}</p>
                ${step.imageUrl ? `<small>${escapeHtml(step.imageUrl)}</small>` : ""}
              </div>
              ${canManageRecipes ? `
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

  function recipeTextArea(id, title, value, placeholder) {
    const disabled = canManageRecipes ? "" : "disabled";
    return `
      <section class="history-detail-card recipe-detail-section">
        <h2>${title}</h2>
        <textarea id="${id}" class="recipe-inline-textarea" ${disabled} placeholder="${escapeHtml(placeholder)}">${escapeHtml(value)}</textarea>
      </section>
    `;
  }

  function recipeSaveButton(position) {
    if (!canManageRecipes) return "";
    return `<button class="danger-button recipe-save-button" data-save-recipe="${position}" type="button">레시피 수정</button>`;
  }

  function recipeDeleteButton() {
    if (!canManageRecipes) return "";
    return `<button class="danger-button recipe-save-button" data-delete-recipe type="button">레시피 삭제</button>`;
  }

  function renderDetail(recipe) {
    if (!recipe) {
      detail.textContent = I18n.t("noRecipes");
      return;
    }
    detail.innerHTML = `
      <div class="recipe-detail-title-row">
        <h2>${recipe.name}</h2>
        <span class="badge ${recipe.enabled ? "green" : "yellow"} recipe-status-badge">${recipe.enabled ? I18n.t("activeMenu") : I18n.t("discontinuedMenu")}</span>
      </div>
      <hr class="recipe-detail-rule" />
      <p class="recipe-delete-warning">삭제는 확인 후 진행됩니다.</p>
      ${recipeSaveButton("top")}
      ${recipeDeleteButton()}
      ${recipeTextArea("recipe-description-inline", "설명", recipe.description || "", "설명")}
      ${ingredientCrudSection(recipe)}
      ${stepCrudSection(recipe)}
      ${recipeTextArea("recipe-notes-inline", I18n.t("notes"), recipe.notes || "", I18n.t("notes"))}
      ${recipeSaveButton("bottom")}
      <p class="muted">${I18n.t("updatedAt")}: ${recipe.updatedAt || "-"}</p>
    `;
  }

  function selectedRecipe() {
    return Store.getRecipes().find((recipe) => recipe.id === activeId) || null;
  }

  function saveInlineRecipe() {
    const existing = selectedRecipe();
    if (!existing || !canManageRecipes) return;
    const ingredientItems = Store.parseRecipeItems(existing.ingredientItems?.length ? existing.ingredientItems : existing.ingredients);
    const stepItems = Store.parseRecipeSteps(existing.stepItems?.length ? existing.stepItems : existing.steps);
    const recipe = {
      ...(existing || {}),
      description: document.getElementById("recipe-description-inline")?.value.trim() || "",
      ingredients: Store.recipeItemsToLines(ingredientItems),
      seasonings: existing.seasonings || "",
      steps: Store.recipeStepsToLines(stepItems),
      notes: document.getElementById("recipe-notes-inline")?.value.trim() || "",
      imageUrl: existing?.imageUrl || "",
      ingredientItems,
      seasoningItems: existing.seasoningItems || [],
      stepItems,
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
    if (!recipe || !canManageRecipes) return;
    if (!confirm(`${recipe.name} 레시피를 삭제할까요?`)) return;
    Store.deleteRecipe(recipe.id);
    activeId = "";
    renderFilters();
    render();
  }

  function render() {
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
          <strong>${recipe.name}</strong>
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
    if (!button || !canManageRecipes) return;
    const recipe = selectedRecipe();
    if (!recipe) return;
    const rows = Store.parseRecipeItems(recipe.ingredientItems?.length ? recipe.ingredientItems : recipe.ingredients);
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
      if (!confirm("재료를 삭제할까요?")) return;
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

  function handleStepAction(event) {
    const button = event.target.closest("[data-step-action]");
    if (!button || !canManageRecipes) return;
    const recipe = selectedRecipe();
    if (!recipe) return;
    const rows = Store.parseRecipeSteps(recipe.stepItems?.length ? recipe.stepItems : recipe.steps);
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
      if (!confirm("조리 순서를 삭제할까요?")) return;
      Store.saveRecipe(recipeWithStepItems(recipe, rows.filter((_, rowIndex) => rowIndex !== index)));
      activeStepEdit = null;
      renderFilters();
      render();
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
      renderFilters();
      render();
    }
  }

  function reorderSteps(fromIndex, toIndex) {
    const recipe = selectedRecipe();
    if (!recipe || fromIndex === null || toIndex === null || fromIndex === toIndex) return;
    const rows = Store.parseRecipeSteps(recipe.stepItems?.length ? recipe.stepItems : recipe.steps);
    if (!rows[fromIndex] || !rows[toIndex]) return;
    const next = rows.slice();
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    Store.saveRecipe(recipeWithStepItems(recipe, next));
    activeStepEdit = null;
    draggedStepIndex = null;
    renderFilters();
    render();
  }

  function handleStepDragStart(event) {
    const row = event.target.closest("[data-step-index]");
    if (!row || !canManageRecipes) return;
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
    if (!row || !canManageRecipes) return;
    event.preventDefault();
    const from = draggedStepIndex ?? Number(event.dataTransfer?.getData("text/plain"));
    const to = Number(row.dataset.stepIndex);
    reorderSteps(from, to);
  }

  search.addEventListener("input", render);
  section.addEventListener("change", render);
  detail.addEventListener("click", (event) => {
    if (event.target.closest("[data-save-recipe]")) saveInlineRecipe();
    if (event.target.closest("[data-delete-recipe]")) deleteInlineRecipe();
    handleIngredientAction(event);
    handleStepAction(event);
  });
  detail.addEventListener("dragstart", handleStepDragStart);
  detail.addEventListener("dragover", handleStepDragOver);
  detail.addEventListener("drop", handleStepDrop);
  renderFilters();
  render();
  I18n.applyI18n();
})();
