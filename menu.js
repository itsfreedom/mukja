(async function () {
  await Store.init();
  AppUI.renderSidebar("menus");
  AppUI.registerServiceWorker();

  const search = document.getElementById("menu-search");
  const category = document.getElementById("menu-category");
  const list = document.getElementById("menu-list");
  const detail = document.getElementById("menu-detail");
  let activeId = "";

  function money(menu) {
    if (!menu.price) return "-";
    return `${menu.currency || "CAD"} ${Number(menu.price).toFixed(2)}`;
  }

  function renderFilters() {
    category.innerHTML = `<option value="">${I18n.t("all")}</option>` + Store.getMenuCategories()
      .map((name) => `<option value="${name}">${name}</option>`)
      .join("");
  }

  function filteredMenus() {
    const q = search.value.trim().toLowerCase();
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

  function renderDetail(menu) {
    if (!menu) {
      detail.textContent = I18n.t("noMenus");
      return;
    }
    const recipe = recipeFor(menu);
    detail.innerHTML = `
      <div class="list-card-header">
        <div>
          <h2>${I18n.menuName(menu)}</h2>
          <div class="item-meta">${I18n.secondaryMenuName(menu)}</div>
        </div>
        <span class="badge">${money(menu)}</span>
      </div>
      <div class="menu-badges admin-section">
        <span class="badge">${menu.category || "-"}</span>
        ${menu.seasonal ? `<span class="badge yellow">${I18n.t("seasonalMenu")}</span>` : ""}
        <span class="badge ${menu.discontinued ? "yellow" : "green"}">${menu.discontinued ? I18n.t("discontinuedMenu") : I18n.t("activeMenu")}</span>
      </div>
      ${recipe ? `
        <h3 class="admin-section">${I18n.t("ingredients")}</h3>
        <p class="preview-box">${recipe.ingredients || "-"}</p>
        <h3 class="admin-section">${I18n.t("steps")}</h3>
        <p class="preview-box">${recipe.steps || "-"}</p>
        <h3 class="admin-section">${I18n.t("notes")}</h3>
        <p class="preview-box">${recipe.notes || menu.notes || "-"}</p>
      ` : `<p class="muted admin-section">${I18n.t("noRecipes")}</p>`}
    `;
  }

  function render() {
    const menus = filteredMenus();
    if (!menus.length) {
      list.innerHTML = `<div class="panel muted">${I18n.t("noMenus")}</div>`;
      renderDetail(null);
      return;
    }
    if (!activeId || !menus.some((menu) => menu.id === activeId)) activeId = menus[0].id;
    list.innerHTML = menus.map((menu) => `
      <button class="list-card menu-row ${menu.id === activeId ? "is-active" : ""}" data-menu="${menu.id}" type="button">
        <div>
          <strong>${I18n.menuName(menu)}</strong>
          <div class="item-meta">${[I18n.secondaryMenuName(menu), menu.category].filter(Boolean).join(" · ")}</div>
        </div>
        <div class="menu-row-price">
          <strong>${money(menu)}</strong>
          ${menu.discontinued ? `<span>${I18n.t("discontinuedMenu")}</span>` : menu.seasonal ? `<span>${I18n.t("seasonalMenu")}</span>` : ""}
        </div>
      </button>
    `).join("");
    list.querySelectorAll("[data-menu]").forEach((button) => {
      button.addEventListener("click", () => {
        activeId = button.dataset.menu;
        render();
      });
    });
    renderDetail(menus.find((menu) => menu.id === activeId));
  }

  search.addEventListener("input", render);
  category.addEventListener("change", render);
  renderFilters();
  render();
  I18n.applyI18n();
})();
