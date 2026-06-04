(async function () {
  await Store.init();
  AppUI.renderSidebar("recipes");
  AppUI.registerServiceWorker();

  const search = document.getElementById("recipe-search");
  const section = document.getElementById("recipe-section");
  const list = document.getElementById("recipe-list");
  const detail = document.getElementById("recipe-detail");
  let activeId = "";

  function renderFilters() {
    section.innerHTML = `<option value="">${I18n.t("all")}</option>` + Store.getSections().map((s) => `<option value="${s}">${I18n.sectionLabel(s)}</option>`).join("");
  }

  function filtered() {
    const q = search.value.trim().toLowerCase();
    return Store.getRecipes().filter((recipe) => {
      if (!recipe.enabled) return false;
      if (section.value && recipe.section !== section.value) return false;
      if (q && !`${recipe.name} ${recipe.description} ${recipe.ingredients}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  function renderDetail(recipe) {
    if (!recipe) {
      detail.textContent = I18n.t("noRecipes");
      return;
    }
    detail.innerHTML = `
      ${recipe.imageUrl ? `<img class="recipe-image" src="${recipe.imageUrl}" alt="${recipe.name}" />` : ""}
      <div class="list-card-header">
        <h2>${recipe.name}</h2>
        <span class="badge">${I18n.sectionLabel(recipe.section)}</span>
      </div>
      <h3 class="admin-section">${I18n.t("ingredients")}</h3>
      <p class="preview-box">${recipe.ingredients || "-"}</p>
      <h3 class="admin-section">${I18n.t("steps")}</h3>
      <p class="preview-box">${recipe.steps || "-"}</p>
      <h3 class="admin-section">${I18n.t("notes")}</h3>
      <p class="preview-box">${recipe.notes || "-"}</p>
      <p class="muted">${I18n.t("updatedAt")}: ${recipe.updatedAt || "-"}</p>
    `;
  }

  function render() {
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
          <span class="badge">${I18n.sectionLabel(recipe.section)}</span>
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
  renderFilters();
  render();
  I18n.applyI18n();
})();
