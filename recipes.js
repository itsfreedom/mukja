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
      <p class="recipe-delete-warning">레시피는 삭제 불가합니다</p>
      ${recipeSaveButton("top")}
      ${recipeTextArea("recipe-description-inline", "설명", recipe.description || "", "설명")}
      ${recipeTextArea("recipe-ingredients-inline", I18n.t("ingredients"), Store.recipeItemsToLines(recipe.ingredientItems?.length ? recipe.ingredientItems : recipe.ingredients), "재료명 | 양")}
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
    const ingredientItems = Store.parseRecipeItems(document.getElementById("recipe-ingredients-inline")?.value || "");
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

  search.addEventListener("input", render);
  section.addEventListener("change", render);
  detail.addEventListener("click", (event) => {
    if (event.target.closest("[data-save-recipe]")) saveInlineRecipe();
  });
  renderFilters();
  render();
  I18n.applyI18n();
})();
