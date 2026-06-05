(async function () {
  await Store.init();
  AppUI.renderSidebar("recipes");
  AppUI.registerServiceWorker();

  const search = document.getElementById("recipe-search");
  const section = document.getElementById("recipe-section");
  const list = document.getElementById("recipe-list");
  const detail = document.getElementById("recipe-detail");
  const manageActions = document.getElementById("recipe-manage-actions");
  const createRecipe = document.getElementById("create-recipe");
  const editRecipe = document.getElementById("edit-recipe");
  const editModal = document.getElementById("recipe-edit-modal");
  const editModalTitle = document.getElementById("recipe-edit-title");
  const closeRecipeEdit = document.getElementById("close-recipe-edit");
  const saveRecipeEdit = document.getElementById("save-recipe-edit");
  const cancelRecipeEdit = document.getElementById("cancel-recipe-edit");
  const editFields = {
    name: document.getElementById("edit-recipe-name"),
    section: document.getElementById("edit-recipe-section"),
    description: document.getElementById("edit-recipe-description"),
    ingredients: document.getElementById("edit-recipe-ingredients"),
    seasonings: document.getElementById("edit-recipe-seasonings"),
    steps: document.getElementById("edit-recipe-steps"),
    notes: document.getElementById("edit-recipe-notes"),
    enabled: document.getElementById("edit-recipe-enabled")
  };
  const params = new URLSearchParams(window.location.search);
  let activeId = params.get("id") || "";
  let editingRecipeId = "";
  const session = Store.getAuth();
  const canManageRecipes = session?.role === "admin";
  const closeButton = document.getElementById("close-recipe");
  if (params.get("from") === "menu") closeButton.classList.remove("hidden");
  closeButton.addEventListener("click", () => {
    window.location.href = "menu.html";
  });

  function renderFilters() {
    section.innerHTML = `<option value="">${I18n.t("all")}</option>` + Store.getSections().map((s) => `<option value="${s}">${I18n.sectionLabel(s)}</option>`).join("");
    editFields.section.innerHTML = Store.getSections().map((s) => `<option value="${s}">${I18n.sectionLabel(s)}</option>`).join("");
  }

  function filtered() {
    const q = search.value.trim().toLowerCase();
    return Store.getRecipes().filter((recipe) => {
      if (!recipe.enabled) return false;
      if (section.value && recipe.section !== section.value) return false;
      if (q && !`${recipe.name} ${recipe.description} ${recipe.ingredients} ${recipe.seasonings}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  function renderMeasuredList(title, items) {
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

  function renderStepList(recipe) {
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

  function renderDetail(recipe) {
    if (!recipe) {
      detail.textContent = I18n.t("noRecipes");
      return;
    }
    detail.innerHTML = `
      <div class="recipe-detail-title-row">
        <h2>${recipe.name}</h2>
        <span class="badge ${recipe.enabled ? "green" : "yellow"}">${recipe.enabled ? I18n.t("activeMenu") : I18n.t("discontinuedMenu")}</span>
      </div>
      ${renderMeasuredList(I18n.t("ingredients"), recipe.ingredientItems?.length ? recipe.ingredientItems : recipe.ingredients)}
      ${renderMeasuredList(I18n.t("seasonings"), recipe.seasoningItems?.length ? recipe.seasoningItems : recipe.seasonings)}
      ${renderStepList(recipe)}
      ${recipe.notes ? `<section class="history-detail-card recipe-detail-section"><h2>${I18n.t("notes")}</h2><p class="preview-box">${recipe.notes}</p></section>` : ""}
      <p class="muted">${I18n.t("updatedAt")}: ${recipe.updatedAt || "-"}</p>
    `;
  }

  function selectedRecipe() {
    return Store.getRecipes().find((recipe) => recipe.id === activeId) || null;
  }

  function openRecipeEditor(recipe = null) {
    editingRecipeId = recipe?.id || "";
    editModalTitle.textContent = recipe ? "레시피 수정" : "레시피 생성";
    editFields.name.value = recipe?.name || "";
    editFields.section.value = recipe?.section || Store.getSections()[0] || "기타";
    editFields.description.value = recipe?.description || "";
    editFields.ingredients.value = Store.recipeItemsToLines(recipe?.ingredientItems?.length ? recipe.ingredientItems : recipe?.ingredients);
    editFields.seasonings.value = Store.recipeItemsToLines(recipe?.seasoningItems?.length ? recipe.seasoningItems : recipe?.seasonings);
    editFields.steps.value = Store.recipeStepsToLines(recipe?.stepItems?.length ? recipe.stepItems : recipe?.steps);
    editFields.notes.value = recipe?.notes || "";
    editFields.enabled.checked = recipe ? recipe.enabled !== false : true;
    editModal.classList.remove("hidden");
    document.body.classList.add("modal-open");
    editFields.name.focus();
  }

  function closeRecipeEditor() {
    editModal.classList.add("hidden");
    document.body.classList.remove("modal-open");
  }

  function saveRecipeFromEditor() {
    const name = editFields.name.value.trim();
    if (!name) return;
    const existing = editingRecipeId ? Store.getRecipes().find((recipe) => recipe.id === editingRecipeId) : null;
    const ingredientItems = Store.parseRecipeItems(editFields.ingredients.value);
    const seasoningItems = Store.parseRecipeItems(editFields.seasonings.value);
    const stepItems = Store.parseRecipeSteps(editFields.steps.value);
    const recipe = {
      ...(existing || {}),
      id: editingRecipeId || Store.id("recipe"),
      name,
      section: editFields.section.value,
      description: editFields.description.value.trim(),
      ingredients: Store.recipeItemsToLines(ingredientItems),
      seasonings: Store.recipeItemsToLines(seasoningItems),
      steps: Store.recipeStepsToLines(stepItems),
      notes: editFields.notes.value.trim(),
      imageUrl: existing?.imageUrl || "",
      ingredientItems,
      seasoningItems,
      stepItems,
      enabled: editFields.enabled.checked,
      updatedAt: Store.today()
    };
    Store.saveRecipe(recipe);
    activeId = recipe.id;
    closeRecipeEditor();
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
  createRecipe.addEventListener("click", () => openRecipeEditor());
  editRecipe.addEventListener("click", () => {
    const recipe = selectedRecipe();
    if (recipe) openRecipeEditor(recipe);
  });
  saveRecipeEdit.addEventListener("click", saveRecipeFromEditor);
  cancelRecipeEdit.addEventListener("click", closeRecipeEditor);
  closeRecipeEdit.addEventListener("click", closeRecipeEditor);
  editModal.querySelectorAll("[data-close-recipe-edit]").forEach((button) => {
    button.addEventListener("click", closeRecipeEditor);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !editModal.classList.contains("hidden")) closeRecipeEditor();
  });
  renderFilters();
  render();
  I18n.applyI18n();
})();
