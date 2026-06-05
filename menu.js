(async function () {
  await Store.init();
  AppUI.renderSidebar("menus");
  AppUI.registerServiceWorker();

  const search = document.getElementById("menu-search");
  const searchButton = document.getElementById("menu-search-button");
  const category = document.getElementById("menu-category");
  const list = document.getElementById("menu-list");
  const manageActions = document.getElementById("menu-manage-actions");
  const createMenu = document.getElementById("create-menu");
  const editMenu = document.getElementById("edit-menu");
  const deleteMenu = document.getElementById("delete-menu");
  const modal = document.getElementById("menu-recipe-modal");
  const modalTitle = document.getElementById("menu-recipe-title");
  const modalMeta = document.getElementById("menu-recipe-meta");
  const modalStatus = document.getElementById("menu-recipe-status");
  const modalContent = document.getElementById("menu-recipe-content");
  const modalClose = document.getElementById("close-menu-recipe");
  const recipeActions = document.getElementById("menu-recipe-actions");
  const createRecipeFromMenu = document.getElementById("create-recipe-from-menu");
  const editRecipeFromMenu = document.getElementById("edit-recipe-from-menu");
  const recipeEditModal = document.getElementById("menu-recipe-edit-modal");
  const recipeEditModalTitle = document.getElementById("menu-recipe-edit-title");
  const closeRecipeEdit = document.getElementById("close-menu-recipe-edit");
  const saveRecipeEdit = document.getElementById("save-menu-recipe-edit");
  const cancelRecipeEdit = document.getElementById("cancel-menu-recipe-edit");
  const editModal = document.getElementById("menu-edit-modal");
  const editModalTitle = document.getElementById("menu-edit-title");
  const editModalClose = document.getElementById("close-menu-edit");
  const saveMenuEdit = document.getElementById("save-menu-edit");
  const cancelMenuEdit = document.getElementById("cancel-menu-edit");
  const editFields = {
    nameKo: document.getElementById("edit-menu-name-ko"),
    nameEn: document.getElementById("edit-menu-name-en"),
    category: document.getElementById("edit-menu-category"),
    price: document.getElementById("edit-menu-price"),
    recipe: document.getElementById("edit-menu-recipe"),
    seasonal: document.getElementById("edit-menu-seasonal"),
    active: document.getElementById("edit-menu-active")
  };
  const recipeEditFields = {
    name: document.getElementById("menu-edit-recipe-name"),
    section: document.getElementById("menu-edit-recipe-section"),
    description: document.getElementById("menu-edit-recipe-description"),
    ingredients: document.getElementById("menu-edit-recipe-ingredients"),
    seasonings: document.getElementById("menu-edit-recipe-seasonings"),
    steps: document.getElementById("menu-edit-recipe-steps"),
    notes: document.getElementById("menu-edit-recipe-notes"),
    enabled: document.getElementById("menu-edit-recipe-enabled")
  };
  let searchQuery = "";
  let selectedMenuId = "";
  let editingMenuId = "";
  let activeRecipeMenuId = "";
  let editingRecipeId = "";
  const session = Store.getAuth();
  const canViewMenu = ["restaurant", "admin"].includes(session?.role);
  const canManageMenu = session?.role === "admin";

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

  function menuStatusBadges(menu) {
    const recipe = recipeFor(menu);
    const statusText = menu.discontinued ? I18n.t("discontinuedMenu") : I18n.t("activeMenu");
    const sectionText = recipe?.section ? I18n.sectionLabel(recipe.section) : "";
    return `
      <span class="tiny-badge ${menu.discontinued ? "is-paused" : "is-live"}">${statusText}</span>
      ${menu.seasonal ? `<span class="tiny-badge is-seasonal">${I18n.t("seasonalMenu")}</span>` : ""}
      ${sectionText ? `<span class="tiny-badge">${sectionText}</span>` : ""}
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
      ${measuredList(I18n.t("ingredients"), recipe.ingredientItems?.length ? recipe.ingredientItems : recipe.ingredients)}
      ${measuredList(I18n.t("seasonings"), recipe.seasoningItems?.length ? recipe.seasoningItems : recipe.seasonings)}
      ${stepList(recipe)}
      ${(recipe.notes || menu.notes) ? `<section class="history-detail-card recipe-detail-section"><h2>${I18n.t("notes")}</h2><p class="preview-box">${recipe.notes || menu.notes}</p></section>` : ""}
    `;
  }

  function openRecipe(menu) {
    const recipe = recipeFor(menu);
    activeRecipeMenuId = menu.id;
    modalTitle.textContent = I18n.menuName(menu);
    modalMeta.textContent = recipe?.section ? I18n.sectionLabel(recipe.section) : "";
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
    document.body.classList.remove("modal-open");
  }

  function activeRecipeMenu() {
    return Store.getMenus().find((menu) => menu.id === activeRecipeMenuId) || null;
  }

  function openRecipeEditor(recipe = null) {
    editingRecipeId = recipe?.id || "";
    recipeEditModalTitle.textContent = recipe ? "레시피 수정" : "레시피 생성";
    recipeEditFields.name.value = recipe?.name || "";
    recipeEditFields.section.value = recipe?.section || Store.getSections()[0] || "기타";
    recipeEditFields.description.value = recipe?.description || "";
    recipeEditFields.ingredients.value = Store.recipeItemsToLines(recipe?.ingredientItems?.length ? recipe.ingredientItems : recipe?.ingredients);
    recipeEditFields.seasonings.value = Store.recipeItemsToLines(recipe?.seasoningItems?.length ? recipe.seasoningItems : recipe?.seasonings);
    recipeEditFields.steps.value = Store.recipeStepsToLines(recipe?.stepItems?.length ? recipe.stepItems : recipe?.steps);
    recipeEditFields.notes.value = recipe?.notes || "";
    recipeEditFields.enabled.checked = recipe ? recipe.enabled !== false : true;
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
    const seasoningItems = Store.parseRecipeItems(recipeEditFields.seasonings.value);
    const stepItems = Store.parseRecipeSteps(recipeEditFields.steps.value);
    const recipe = {
      ...(existing || {}),
      id: editingRecipeId || Store.id("recipe"),
      name,
      section: recipeEditFields.section.value,
      description: recipeEditFields.description.value.trim(),
      ingredients: Store.recipeItemsToLines(ingredientItems),
      seasonings: Store.recipeItemsToLines(seasoningItems),
      steps: Store.recipeStepsToLines(stepItems),
      notes: recipeEditFields.notes.value.trim(),
      imageUrl: existing?.imageUrl || "",
      ingredientItems,
      seasoningItems,
      stepItems,
      enabled: recipeEditFields.enabled.checked,
      updatedAt: Store.today()
    };
    Store.saveRecipe(recipe);
    closeRecipeEditor();
    renderFilters();
    render();
    const menu = activeRecipeMenu();
    if (menu) openRecipe(menu);
  }

  function selectedMenu() {
    return Store.getMenus().find((menu) => menu.id === selectedMenuId) || null;
  }

  function chooseMenu(idValue, showError = false) {
    if (selectedMenuId && selectedMenuId !== idValue && showError) {
      alert("메뉴는 하나만 선택할 수 있습니다.");
      return false;
    }
    selectedMenuId = selectedMenuId === idValue ? "" : idValue;
    render();
    return true;
  }

  function openMenuEditor(menu = null) {
    editingMenuId = menu?.id || "";
    editModalTitle.textContent = menu ? "메뉴 수정" : "메뉴 생성";
    editFields.nameKo.value = menu?.nameKo || "";
    editFields.nameEn.value = menu?.nameEn || "";
    editFields.category.value = menu?.category || "";
    editFields.price.value = menu?.price || "";
    editFields.recipe.value = menu?.recipeId || "";
    editFields.seasonal.checked = Boolean(menu?.seasonal);
    editFields.active.checked = menu ? !menu.discontinued : true;
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
    const recipe = Store.getRecipes().find((row) => row.id === editFields.recipe.value);
    const existing = editingMenuId ? Store.getMenus().find((row) => row.id === editingMenuId) : null;
    const menu = {
      ...(existing || {}),
      id: editingMenuId || Store.id("menu"),
      recipeId: editFields.recipe.value,
      recipeName: recipe?.name || existing?.recipeName || "",
      nameKo,
      nameEn: editFields.nameEn.value.trim(),
      category: editFields.category.value.trim(),
      price: editFields.price.value.trim(),
      currency: existing?.currency || "CAD",
      seasonal: editFields.seasonal.checked,
      discontinued: !editFields.active.checked,
      notes: existing?.notes || ""
    };
    Store.saveMenu(menu);
    selectedMenuId = menu.id;
    closeMenuEditor();
    renderFilters();
    render();
  }

  function discontinueSelectedMenu() {
    const menu = selectedMenu();
    if (!menu) {
      alert("판매 중지할 메뉴를 하나 선택해 주세요.");
      return;
    }
    if (!confirm(`${I18n.menuName(menu)} 메뉴를 판매 중단 처리할까요?`)) return;
    Store.discontinueMenu(menu.id);
    selectedMenuId = menu.id;
    renderFilters();
    render();
  }

  function render() {
    if (!canViewMenu) {
      list.innerHTML = `<div class="list-card muted">${I18n.t("noAccess")}</div>`;
      return;
    }
    const menus = filteredMenus();
    manageActions.classList.toggle("hidden", !canManageMenu);
    if (!menus.length) {
      list.innerHTML = `<div class="list-card muted">${I18n.t("noMenus")}</div>`;
      return;
    }
    if (selectedMenuId && !menus.some((menu) => menu.id === selectedMenuId)) selectedMenuId = "";
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
            <button class="list-card menu-row ${menu.id === selectedMenuId ? "is-active" : ""} ${menu.discontinued ? "is-disabled" : ""}" data-menu="${menu.id}" type="button">
              <input class="menu-select-check" data-menu-check="${menu.id}" type="checkbox" ${menu.id === selectedMenuId ? "checked" : ""} aria-label="${I18n.menuName(menu)} 선택" />
              <div class="menu-row-main">
                <div class="menu-title-line">
                  <strong>${I18n.menuName(menu)}</strong>
                  <span class="menu-title-badges">${menuStatusBadges(menu)}</span>
                </div>
              </div>
              <div class="menu-row-price">
                <strong>${money(menu)}</strong>
              </div>
              <span class="menu-row-arrow" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </button>
          `).join("")}
        </div>
      </section>
    `).join("");
    list.querySelectorAll("[data-menu]").forEach((button) => {
      button.addEventListener("click", () => {
        const menu = Store.getMenus().find((row) => row.id === button.dataset.menu);
        if (menu) {
          selectedMenuId = menu.id;
          render();
          openRecipe(menu);
        }
      });
    });
    list.querySelectorAll("[data-menu-check]").forEach((checkbox) => {
      checkbox.addEventListener("click", (event) => {
        event.stopPropagation();
        if (!chooseMenu(checkbox.dataset.menuCheck, checkbox.checked)) checkbox.checked = false;
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
  createMenu.addEventListener("click", () => openMenuEditor());
  editMenu.addEventListener("click", () => {
    const menu = selectedMenu();
    if (!menu) {
      alert("수정할 메뉴를 하나 선택해 주세요.");
      return;
    }
    openMenuEditor(menu);
  });
  deleteMenu.addEventListener("click", discontinueSelectedMenu);
  saveMenuEdit.addEventListener("click", saveMenuFromEditor);
  cancelMenuEdit.addEventListener("click", closeMenuEditor);
  createRecipeFromMenu.addEventListener("click", () => openRecipeEditor());
  editRecipeFromMenu.addEventListener("click", () => {
    const menu = activeRecipeMenu();
    const recipe = menu ? recipeFor(menu) : null;
    if (!recipe) {
      alert("수정할 레시피가 없습니다.");
      return;
    }
    openRecipeEditor(recipe);
  });
  saveRecipeEdit.addEventListener("click", saveRecipeFromEditor);
  cancelRecipeEdit.addEventListener("click", closeRecipeEditor);
  modalClose.addEventListener("click", closeRecipe);
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
