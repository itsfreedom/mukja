(async function () {
  await Store.init();
  AppUI.renderSidebar("admin");
  AppUI.registerServiceWorker();

  const loginPanel = document.getElementById("login-panel");
  const adminPanel = document.getElementById("admin-panel");
  const logout = document.getElementById("logout");
  const status = document.getElementById("admin-status");
  const loginStatus = document.getElementById("login-status");

  function isAuthed() {
    return sessionStorage.getItem(Store.keys.adminAuthed) === "true";
  }

  function hasPassword() {
    return Boolean(localStorage.getItem(Store.keys.adminPassword));
  }

  function setStatus(text) {
    status.textContent = text || "";
    loginStatus.textContent = text || "";
    if (text) setTimeout(() => { status.textContent = ""; loginStatus.textContent = ""; }, 2500);
  }

  function showAdmin(show) {
    loginPanel.classList.toggle("hidden", show);
    adminPanel.classList.toggle("hidden", !show);
    logout.classList.toggle("hidden", !show);
    document.getElementById("login-title").textContent = hasPassword() ? I18n.t("login") : I18n.t("setPassword");
    if (show) renderAll();
  }

  function renderMode() {
    const mode = Store.getMode();
    document.getElementById("current-mode").textContent = mode === "simple" ? I18n.t("simpleMode") : I18n.t("normalMode");
    document.querySelectorAll("[data-mode]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.mode === mode);
    });
  }

  function renderOptions() {
    const options = Store.getSections().map((s) => `<option value="${s}">${I18n.sectionLabel(s)}</option>`).join("");
    document.getElementById("ingredient-section").innerHTML = options;
    document.getElementById("recipe-section").innerHTML = options;
    document.getElementById("recipe-filter").innerHTML = `<option value="">${I18n.t("all")}</option>${options}`;
  }

  function renderEmployees() {
    document.getElementById("employee-list").innerHTML = Store.getEmployees().map((emp) => `
      <div class="list-card">
        <div class="list-card-header">
          <div><strong>${emp.name}</strong><div class="item-meta">${emp.enabled ? I18n.t("enabled") : I18n.t("disabled")}</div></div>
          <div class="button-row">
            <button class="ghost-button" data-edit-employee="${emp.id}">${I18n.t("edit")}</button>
            <button class="ghost-button" data-toggle-employee="${emp.id}">${emp.enabled ? I18n.t("disabled") : I18n.t("enabled")}</button>
            <button class="danger-button" data-delete-employee="${emp.id}">${I18n.t("delete")}</button>
          </div>
        </div>
      </div>
    `).join("");
  }

  function renderSections() {
    document.getElementById("section-list").innerHTML = Store.getSections().map((section) => `
      <div class="list-card">
        <div class="list-card-header">
          <strong>${I18n.sectionLabel(section)}</strong>
          <div class="button-row">
            <button class="ghost-button" data-edit-section="${section}">${I18n.t("edit")}</button>
            <button class="danger-button" data-delete-section="${section}">${I18n.t("delete")}</button>
          </div>
        </div>
      </div>
    `).join("");
  }

  function renderIngredients() {
    document.getElementById("ingredient-list").innerHTML = `
      <table>
        <thead><tr><th>${I18n.t("name")}</th><th>${I18n.t("section")}</th><th>${I18n.t("unit")}</th><th>${I18n.t("target")}</th><th>${I18n.t("enabled")}</th><th></th></tr></thead>
        <tbody>
          ${Store.getIngredients().map((item) => `
            <tr>
              <td>${item.name}</td><td>${I18n.sectionLabel(item.section)}</td><td>${item.unit}</td><td>${I18n.targetLabel(item.target)}</td><td>${item.enabled ? I18n.t("enabled") : I18n.t("disabled")}</td>
              <td class="button-row">
                <button class="ghost-button" data-edit-ingredient="${item.id}">${I18n.t("edit")}</button>
                <button class="ghost-button" data-toggle-ingredient="${item.id}">${item.enabled ? I18n.t("disabled") : I18n.t("enabled")}</button>
                <button class="danger-button" data-delete-ingredient="${item.id}">${I18n.t("delete")}</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>`;
  }

  function recipeRows() {
    const q = document.getElementById("recipe-search").value.trim().toLowerCase();
    const section = document.getElementById("recipe-filter").value;
    return Store.getRecipes().filter((recipe) => {
      if (section && recipe.section !== section) return false;
      if (q && !`${recipe.name} ${recipe.description} ${recipe.ingredients}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  function renderRecipes() {
    document.getElementById("recipe-list").innerHTML = `
      <table>
        <thead><tr><th>${I18n.t("name")}</th><th>${I18n.t("section")}</th><th>${I18n.t("description")}</th><th>${I18n.t("enabled")}</th><th></th></tr></thead>
        <tbody>
          ${recipeRows().map((recipe) => `
            <tr>
              <td>${recipe.name}</td><td>${I18n.sectionLabel(recipe.section)}</td><td>${recipe.description || ""}</td><td>${recipe.enabled ? I18n.t("enabled") : I18n.t("disabled")}</td>
              <td class="button-row">
                <button class="ghost-button" data-edit-recipe="${recipe.id}">${I18n.t("edit")}</button>
                <button class="ghost-button" data-toggle-recipe="${recipe.id}">${recipe.enabled ? I18n.t("disabled") : I18n.t("enabled")}</button>
                <button class="danger-button" data-delete-recipe="${recipe.id}">${I18n.t("delete")}</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>`;
  }

  function renderAll() {
    renderMode();
    renderOptions();
    renderEmployees();
    renderSections();
    renderIngredients();
    renderRecipes();
    attachRowEvents();
    I18n.applyI18n();
  }

  function attachRowEvents() {
    document.querySelectorAll("[data-edit-employee]").forEach((button) => button.onclick = () => {
      const rows = Store.getEmployees();
      const emp = rows.find((row) => row.id === button.dataset.editEmployee);
      const name = prompt(I18n.t("name"), emp.name);
      if (name) { emp.name = name; Store.setEmployees(rows); renderAll(); }
    });
    document.querySelectorAll("[data-toggle-employee]").forEach((button) => button.onclick = () => {
      const rows = Store.getEmployees();
      const emp = rows.find((row) => row.id === button.dataset.toggleEmployee);
      emp.enabled = !emp.enabled; Store.setEmployees(rows); renderAll();
    });
    document.querySelectorAll("[data-delete-employee]").forEach((button) => button.onclick = () => {
      Store.setEmployees(Store.getEmployees().filter((row) => row.id !== button.dataset.deleteEmployee)); renderAll();
    });
    document.querySelectorAll("[data-edit-section]").forEach((button) => button.onclick = () => {
      const oldName = button.dataset.editSection;
      const name = prompt(I18n.t("section"), oldName);
      if (!name) return;
      Store.setSections(Store.getSections().map((row) => row === oldName ? name : row));
      Store.setIngredients(Store.getIngredients().map((item) => item.section === oldName ? { ...item, section: name } : item));
      Store.setRecipes(Store.getRecipes().map((recipe) => recipe.section === oldName ? { ...recipe, section: name } : recipe));
      renderAll();
    });
    document.querySelectorAll("[data-delete-section]").forEach((button) => button.onclick = () => {
      Store.setSections(Store.getSections().filter((row) => row !== button.dataset.deleteSection)); renderAll();
    });
    document.querySelectorAll("[data-edit-ingredient]").forEach((button) => button.onclick = () => {
      const rows = Store.getIngredients();
      const item = rows.find((row) => row.id === button.dataset.editIngredient);
      item.name = prompt(I18n.t("name"), item.name) || item.name;
      item.unit = prompt(I18n.t("unit"), item.unit) || item.unit;
      Store.setIngredients(rows); renderAll();
    });
    document.querySelectorAll("[data-toggle-ingredient]").forEach((button) => button.onclick = () => {
      const rows = Store.getIngredients();
      const item = rows.find((row) => row.id === button.dataset.toggleIngredient);
      item.enabled = !item.enabled; Store.setIngredients(rows); renderAll();
    });
    document.querySelectorAll("[data-delete-ingredient]").forEach((button) => button.onclick = () => {
      Store.setIngredients(Store.getIngredients().filter((row) => row.id !== button.dataset.deleteIngredient)); renderAll();
    });
    document.querySelectorAll("[data-edit-recipe]").forEach((button) => button.onclick = () => loadRecipe(button.dataset.editRecipe));
    document.querySelectorAll("[data-toggle-recipe]").forEach((button) => button.onclick = () => {
      const rows = Store.getRecipes();
      const recipe = rows.find((row) => row.id === button.dataset.toggleRecipe);
      recipe.enabled = !recipe.enabled; recipe.updatedAt = Store.today(); Store.setRecipes(rows); renderAll();
    });
    document.querySelectorAll("[data-delete-recipe]").forEach((button) => button.onclick = () => {
      Store.setRecipes(Store.getRecipes().filter((row) => row.id !== button.dataset.deleteRecipe)); renderAll();
    });
  }

  function loadRecipe(id) {
    const recipe = Store.getRecipes().find((row) => row.id === id);
    if (!recipe) return;
    document.getElementById("recipe-name").value = recipe.name;
    document.getElementById("recipe-section").value = recipe.section;
    document.getElementById("recipe-description").value = recipe.description || "";
    document.getElementById("recipe-image").value = recipe.imageUrl || "";
    document.getElementById("recipe-ingredients").value = recipe.ingredients || "";
    document.getElementById("recipe-steps").value = recipe.steps || "";
    document.getElementById("recipe-notes").value = recipe.notes || "";
    document.getElementById("add-recipe").dataset.editing = id;
  }

  document.getElementById("admin-login").addEventListener("click", () => {
    const input = document.getElementById("admin-password").value;
    if (!hasPassword()) {
      localStorage.setItem(Store.keys.adminPassword, input);
      sessionStorage.setItem(Store.keys.adminAuthed, "true");
      showAdmin(true);
    } else if (input === localStorage.getItem(Store.keys.adminPassword)) {
      sessionStorage.setItem(Store.keys.adminAuthed, "true");
      showAdmin(true);
    } else {
      setStatus(I18n.t("wrongPassword"));
    }
  });
  logout.addEventListener("click", () => { sessionStorage.removeItem(Store.keys.adminAuthed); showAdmin(false); });
  document.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => { Store.setMode(button.dataset.mode); renderAll(); }));
  document.getElementById("add-employee").addEventListener("click", () => {
    const name = document.getElementById("employee-name").value.trim();
    if (!name) return;
    Store.setEmployees([...Store.getEmployees(), { id: Store.id("emp"), name, enabled: true }]);
    document.getElementById("employee-name").value = "";
    renderAll();
  });
  document.getElementById("add-section").addEventListener("click", () => {
    const name = document.getElementById("section-name").value.trim();
    if (!name) return;
    Store.setSections([...new Set([...Store.getSections(), name])]);
    document.getElementById("section-name").value = "";
    renderAll();
  });
  document.getElementById("add-ingredient").addEventListener("click", () => {
    const name = document.getElementById("ingredient-name").value.trim();
    if (!name) return;
    Store.setIngredients([...Store.getIngredients(), {
      id: Store.id("item"),
      name,
      section: document.getElementById("ingredient-section").value,
      unit: document.getElementById("ingredient-unit").value.trim(),
      target: document.getElementById("ingredient-target").value,
      enabled: true
    }]);
    ["ingredient-name", "ingredient-unit"].forEach((id) => (document.getElementById(id).value = ""));
    renderAll();
  });
  document.getElementById("add-recipe").addEventListener("click", (event) => {
    const id = event.currentTarget.dataset.editing;
    const recipe = {
      id: id || Store.id("recipe"),
      name: document.getElementById("recipe-name").value.trim(),
      section: document.getElementById("recipe-section").value,
      description: document.getElementById("recipe-description").value.trim(),
      ingredients: document.getElementById("recipe-ingredients").value.trim(),
      steps: document.getElementById("recipe-steps").value.trim(),
      notes: document.getElementById("recipe-notes").value.trim(),
      imageUrl: document.getElementById("recipe-image").value.trim(),
      enabled: true,
      updatedAt: Store.today()
    };
    if (!recipe.name) return;
    const rows = Store.getRecipes();
    Store.setRecipes(id ? rows.map((row) => row.id === id ? { ...row, ...recipe, enabled: row.enabled } : row) : [...rows, recipe]);
    event.currentTarget.dataset.editing = "";
    ["recipe-name", "recipe-description", "recipe-ingredients", "recipe-steps", "recipe-notes", "recipe-image"].forEach((field) => document.getElementById(field).value = "");
    renderAll();
  });
  document.getElementById("recipe-search").addEventListener("input", renderRecipes);
  document.getElementById("recipe-filter").addEventListener("change", renderRecipes);
  document.getElementById("change-password").addEventListener("click", () => {
    const value = document.getElementById("new-password").value;
    if (!value) return;
    localStorage.setItem(Store.keys.adminPassword, value);
    document.getElementById("new-password").value = "";
    setStatus(I18n.t("saved"));
  });
  document.getElementById("export-settings").addEventListener("click", () => {
    Store.downloadText("restaurant-request-settings.json", JSON.stringify(Store.exportSettings(), null, 2), "application/json;charset=utf-8");
    setStatus(I18n.t("exportDone"));
  });
  document.getElementById("export-history-csv").addEventListener("click", () => {
    Store.downloadText("ingredient-request-all.csv", Store.historyToCsv(Store.getHistory()), "text/csv;charset=utf-8");
    setStatus(I18n.t("exportDone"));
  });
  document.getElementById("export-recipes-csv").addEventListener("click", () => {
    Store.downloadText("restaurant-recipes.csv", Store.recipesToCsv(Store.getRecipes()), "text/csv;charset=utf-8");
    setStatus(I18n.t("exportDone"));
  });
  document.getElementById("import-history-csv").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const rows = Store.historyFromCsv(await file.text());
      if (!rows.length) throw new Error("empty csv");
      if (!confirm(I18n.t("confirmCsvImport"))) return;
      Store.replaceHistory(rows);
      setStatus(I18n.t("csvImportDone"));
      renderAll();
    } catch {
      setStatus(I18n.t("csvImportInvalid"));
    } finally {
      event.target.value = "";
    }
  });
  document.getElementById("import-recipes-csv").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const rows = Store.recipesFromCsv(await file.text());
      if (!rows.length) throw new Error("empty csv");
      if (!confirm(I18n.t("confirmCsvImport"))) return;
      Store.setRecipes(rows);
      setStatus(I18n.t("csvImportDone"));
      renderAll();
    } catch {
      setStatus(I18n.t("csvImportInvalid"));
    } finally {
      event.target.value = "";
    }
  });
  document.getElementById("import-settings").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!confirm(I18n.t("confirmImport"))) return;
      Store.importSettings(data);
      setStatus(I18n.t("importDone"));
      renderAll();
    } catch {
      setStatus(I18n.t("importInvalid"));
    } finally {
      event.target.value = "";
    }
  });

  showAdmin(isAuthed());
  I18n.applyI18n();
})();
