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
  const editModal = document.getElementById("menu-edit-modal");
  const editModalTitle = document.getElementById("menu-edit-title");
  const editModalClose = document.getElementById("close-menu-edit");
  const saveMenuEdit = document.getElementById("save-menu-edit");
  const editFields = {
    nameKo: document.getElementById("edit-menu-name-ko"),
    nameEn: document.getElementById("edit-menu-name-en"),
    category: document.getElementById("edit-menu-category"),
    price: document.getElementById("edit-menu-price"),
    recipe: document.getElementById("edit-menu-recipe"),
    seasonal: document.getElementById("edit-menu-seasonal"),
    active: document.getElementById("edit-menu-active")
  };
  let searchQuery = "";
  let selectedMenuId = "";
  let editingMenuId = "";
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
    modalTitle.textContent = I18n.menuName(menu);
    modalMeta.textContent = I18n.secondaryMenuName(menu);
    modalStatus.textContent = menu.discontinued ? I18n.t("discontinuedMenu") : I18n.t("activeMenu");
    modalStatus.className = `badge ${menu.discontinued ? "yellow" : "green"}`;
    modalContent.innerHTML = `
      ${recipeSections(menu, recipe)}
    `;
    modal.classList.remove("hidden");
    document.body.classList.add("modal-open");
    modalClose.focus();
  }

  function closeRecipe() {
    modal.classList.add("hidden");
    document.body.classList.remove("modal-open");
  }

  function selectedMenu() {
    const menus = filteredMenus();
    return Store.getMenus().find((menu) => menu.id === selectedMenuId) || menus[0] || null;
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
    if (!menu) return;
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
    if (!selectedMenuId || !menus.some((menu) => menu.id === selectedMenuId)) selectedMenuId = menus[0].id;
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
              <div>
                <strong>${I18n.menuName(menu)}</strong>
                <div class="item-meta">${I18n.secondaryMenuName(menu)}</div>
              </div>
              <div class="menu-row-price">
                <strong>${money(menu)}</strong>
                ${menu.discontinued ? `<span>${I18n.t("discontinuedMenu")}</span>` : menu.seasonal ? `<span>${I18n.t("seasonalMenu")}</span>` : ""}
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
    if (menu) openMenuEditor(menu);
  });
  deleteMenu.addEventListener("click", discontinueSelectedMenu);
  saveMenuEdit.addEventListener("click", saveMenuFromEditor);
  modalClose.addEventListener("click", closeRecipe);
  editModalClose.addEventListener("click", closeMenuEditor);
  modal.querySelectorAll("[data-close-recipe-modal]").forEach((button) => {
    button.addEventListener("click", closeRecipe);
  });
  editModal.querySelectorAll("[data-close-menu-edit]").forEach((button) => {
    button.addEventListener("click", closeMenuEditor);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.classList.contains("hidden")) closeRecipe();
    if (event.key === "Escape" && !editModal.classList.contains("hidden")) closeMenuEditor();
  });
  renderFilters();
  render();
  I18n.applyI18n();
})();
