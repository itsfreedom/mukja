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
      ${recipeTextArea("recipe-seasonings-inline", I18n.t("seasonings"), Store.recipeItemsToLines(recipe.seasoningItems?.length ? recipe.seasoningItems : recipe.seasonings), "양념명 | 양")}
      ${recipeTextArea("recipe-steps-inline", I18n.t("steps"), Store.recipeStepsToLines(recipe.stepItems?.length ? recipe.stepItems : recipe.steps), "조리순서 | 사진 URL")}
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
    const seasoningItems = Store.parseRecipeItems(document.getElementById("recipe-seasonings-inline")?.value || "");
    const stepItems = Store.parseRecipeSteps(document.getElementById("recipe-steps-inline")?.value || "");
    const recipe = {
      ...(existing || {}),
      description: document.getElementById("recipe-description-inline")?.value.trim() || "",
      ingredients: Store.recipeItemsToLines(ingredientItems),
      seasonings: Store.recipeItemsToLines(seasoningItems),
      steps: Store.recipeStepsToLines(stepItems),
      notes: document.getElementById("recipe-notes-inline")?.value.trim() || "",
      imageUrl: existing?.imageUrl || "",
      ingredientItems,
      seasoningItems,
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

  search.addEventListener("input", render);
  section.addEventListener("change", render);
  detail.addEventListener("click", (event) => {
    if (event.target.closest("[data-save-recipe]")) saveInlineRecipe();
    if (event.target.closest("[data-delete-recipe]")) deleteInlineRecipe();
    handleIngredientAction(event);
  });
  renderFilters();
  render();
  I18n.applyI18n();
})();
