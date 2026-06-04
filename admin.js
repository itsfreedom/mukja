(async function () {
  await Store.init();
  AppUI.renderSidebar("admin");
  AppUI.registerServiceWorker();

  const loginPanel = document.getElementById("login-panel");
  const adminPanel = document.getElementById("admin-panel");
  const logout = document.getElementById("logout");
  const status = document.getElementById("admin-status");
  const loginStatus = document.getElementById("login-status");
  const dbStatus = document.getElementById("db-status");

  function isAuthed() {
    return Store.canAdmin();
  }

  function setStatus(text) {
    status.textContent = text || "";
    loginStatus.textContent = text || "";
    if (text) setTimeout(() => { status.textContent = ""; loginStatus.textContent = ""; }, 2500);
  }

  async function renderDbStatus() {
    if (!dbStatus) return;
    dbStatus.textContent = I18n.t("checkingDb");
    const result = await Store.checkDbHealth();
    dbStatus.textContent = result.ok ? I18n.t("dbConnected") : `${I18n.t("dbNotConnected")} ${result.error || ""}`.trim();
  }

  function showAdmin(show) {
    loginPanel.classList.toggle("hidden", show);
    adminPanel.classList.toggle("hidden", !show);
    logout.classList.toggle("hidden", !show);
    document.getElementById("login-title").textContent = I18n.t("adminAccessRequired");
    if (show) {
      renderAll();
      renderDbStatus();
    }
  }

  function renderOptions() {
    const options = Store.getSections().map((s) => `<option value="${s}">${I18n.sectionLabel(s)}</option>`).join("");
    document.getElementById("ingredient-section").innerHTML = options;
    document.getElementById("recipe-section").innerHTML = options;
    document.getElementById("recipe-filter").innerHTML = `<option value="">${I18n.t("all")}</option>${options}`;
    document.getElementById("menu-recipe").innerHTML = `<option value="">${I18n.t("recipeDetail")}</option>` + Store.getRecipes()
      .map((recipe) => `<option value="${recipe.id}">${recipe.name}</option>`)
      .join("");
  }

  function renderAccessAccounts() {
    const accounts = Store.getAccessAccounts();
    document.getElementById("access-list").innerHTML = Object.entries(accounts).map(([password, account]) => `
      <div class="list-card">
        <div class="list-card-header">
          <div><strong>${password}</strong><div class="item-meta">${I18n.roleLabel(account.label || account.department || account.role)} · ${account.role}</div></div>
          <div class="button-row">
            <button class="ghost-button" data-edit-access="${password}">${I18n.t("edit")}</button>
            <button class="danger-button" data-delete-access="${password}">${I18n.t("delete")}</button>
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
        <thead><tr><th>${I18n.t("name")}</th><th>${I18n.t("englishName")}</th><th>${I18n.t("section")}</th><th>${I18n.t("unit")}</th><th>${I18n.t("target")}</th><th>${I18n.t("enabled")}</th><th></th></tr></thead>
        <tbody>
          ${Store.getIngredients().map((item) => `
            <tr>
              <td>${item.nameKo || item.name}</td><td>${item.nameEn || ""}</td><td>${I18n.sectionLabel(item.section)}</td><td>${item.unit}</td><td>${I18n.targetLabel(item.target)}</td><td>${item.enabled ? I18n.t("enabled") : I18n.t("disabled")}</td>
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

  function renderMenus() {
    document.getElementById("admin-menu-list").innerHTML = `
      <table>
        <thead><tr><th>${I18n.t("name")}</th><th>${I18n.t("englishName")}</th><th>${I18n.t("menuCategory")}</th><th>${I18n.t("price")}</th><th>${I18n.t("enabled")}</th><th></th></tr></thead>
        <tbody>
          ${Store.getMenus().map((menu) => `
            <tr class="${menu.discontinued ? "is-disabled" : ""}">
              <td>${menu.nameKo}</td><td>${menu.nameEn || ""}</td><td>${menu.category || ""}</td><td>${menu.price || ""}</td><td>${menu.discontinued ? I18n.t("disabled") : I18n.t("enabled")}</td>
              <td class="button-row">
                <button class="ghost-button" data-edit-menu="${menu.id}">${I18n.t("edit")}</button>
                <button class="ghost-button" data-toggle-menu="${menu.id}">${menu.discontinued ? I18n.t("enabled") : I18n.t("disabled")}</button>
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
      if (q && !`${recipe.name} ${recipe.description} ${recipe.ingredients} ${recipe.seasonings}`.toLowerCase().includes(q)) return false;
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
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>`;
  }

  function renderAll() {
    renderOptions();
    renderAccessAccounts();
    renderSections();
    renderIngredients();
    renderMenus();
    renderRecipes();
    attachRowEvents();
    I18n.applyI18n();
  }

  function attachRowEvents() {
    document.querySelectorAll("[data-edit-access]").forEach((button) => button.onclick = () => {
      const accounts = Store.getAccessAccounts();
      const oldPassword = button.dataset.editAccess;
      const account = accounts[oldPassword];
      const password = prompt(I18n.t("password"), oldPassword) || oldPassword;
      if (password !== oldPassword && accounts[password]) {
        setStatus(I18n.t("duplicatePassword"));
        return;
      }
      const department = account.role === "department"
        ? prompt(I18n.t("target"), account.department || "") || account.department || ""
        : account.department || "";
      const label = prompt(I18n.t("name"), account.label || department || account.role);
      if (!label) return;
      if (password !== oldPassword) delete accounts[oldPassword];
      accounts[password] = { ...account, label, department };
      Store.setAccessAccounts(accounts);
      renderAll();
    });
    document.querySelectorAll("[data-delete-access]").forEach((button) => button.onclick = () => {
      const accounts = Store.getAccessAccounts();
      const account = accounts[button.dataset.deleteAccess];
      const adminCount = Object.values(accounts).filter((row) => row.role === "admin").length;
      if (account?.role === "admin" && adminCount <= 1) {
        setStatus(I18n.t("adminAccessRequired"));
        return;
      }
      delete accounts[button.dataset.deleteAccess];
      Store.setAccessAccounts(accounts);
      renderAll();
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
      item.name = prompt(I18n.t("name"), item.nameKo || item.name) || item.name;
      item.nameKo = item.name;
      item.nameEn = prompt(I18n.t("englishName"), item.nameEn || "") || item.nameEn || "";
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
    document.querySelectorAll("[data-edit-menu]").forEach((button) => button.onclick = () => loadMenu(button.dataset.editMenu));
    document.querySelectorAll("[data-toggle-menu]").forEach((button) => button.onclick = () => {
      Store.setMenus(Store.getMenus().map((menu) =>
        menu.id === button.dataset.toggleMenu ? { ...menu, discontinued: !menu.discontinued } : menu
      ));
      renderAll();
    });
    document.querySelectorAll("[data-toggle-recipe]").forEach((button) => button.onclick = () => {
      const rows = Store.getRecipes();
      const recipe = rows.find((row) => row.id === button.dataset.toggleRecipe);
      recipe.enabled = !recipe.enabled; recipe.updatedAt = Store.today(); Store.setRecipes(rows); renderAll();
    });
  }

  function loadRecipe(id) {
    const recipe = Store.getRecipes().find((row) => row.id === id);
    if (!recipe) return;
    document.getElementById("recipe-name").value = recipe.name;
    document.getElementById("recipe-section").value = recipe.section;
    document.getElementById("recipe-description").value = recipe.description || "";
    document.getElementById("recipe-image").value = recipe.imageUrl || "";
    document.getElementById("recipe-ingredients").value = Store.recipeItemsToLines(recipe.ingredientItems?.length ? recipe.ingredientItems : recipe.ingredients);
    document.getElementById("recipe-seasonings").value = Store.recipeItemsToLines(recipe.seasoningItems?.length ? recipe.seasoningItems : recipe.seasonings);
    document.getElementById("recipe-steps").value = Store.recipeStepsToLines(recipe.stepItems?.length ? recipe.stepItems : recipe.steps);
    document.getElementById("recipe-notes").value = recipe.notes || "";
    document.getElementById("add-recipe").dataset.editing = id;
  }

  function loadMenu(id) {
    const menu = Store.getMenus().find((row) => row.id === id);
    if (!menu) return;
    document.getElementById("menu-name-ko").value = menu.nameKo || "";
    document.getElementById("menu-name-en").value = menu.nameEn || "";
    document.getElementById("menu-category-input").value = menu.category || "";
    document.getElementById("menu-price").value = menu.price || "";
    document.getElementById("menu-recipe").value = menu.recipeId || "";
    document.getElementById("menu-seasonal").checked = Boolean(menu.seasonal);
    document.getElementById("add-menu").dataset.editing = id;
  }

  document.getElementById("admin-login").addEventListener("click", () => {
    const input = document.getElementById("admin-password").value;
    if (input.trim() === "madmin" && Store.authenticate(input)?.role === "admin") {
      showAdmin(true);
      window.location.reload();
      return;
    }
    setStatus(I18n.t("wrongPassword"));
  });
  logout.addEventListener("click", () => { Store.logoutAuth(); window.location.reload(); });
  document.getElementById("add-access").addEventListener("click", () => {
    const password = document.getElementById("access-password").value.trim();
    const role = document.getElementById("access-role").value;
    const department = document.getElementById("access-department").value;
    const label = document.getElementById("access-label").value.trim() || department || role;
    if (!password || (role === "department" && !department)) return;
    Store.setAccessAccounts({
      ...Store.getAccessAccounts(),
      [password]: { role, department: role === "department" ? department : "", label }
    });
    ["access-password", "access-label"].forEach((id) => (document.getElementById(id).value = ""));
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
      nameKo: name,
      nameEn: document.getElementById("ingredient-name-en").value.trim(),
      section: document.getElementById("ingredient-section").value,
      unit: document.getElementById("ingredient-unit").value.trim(),
      target: document.getElementById("ingredient-target").value,
      enabled: true
    }]);
    ["ingredient-name", "ingredient-name-en", "ingredient-unit"].forEach((id) => (document.getElementById(id).value = ""));
    renderAll();
  });
  document.getElementById("add-menu").addEventListener("click", (event) => {
    const id = event.currentTarget.dataset.editing;
    const nameKo = document.getElementById("menu-name-ko").value.trim();
    if (!nameKo) return;
    const recipeId = document.getElementById("menu-recipe").value;
    const recipe = Store.getRecipes().find((row) => row.id === recipeId);
    const menu = {
      id: id || Store.id("menu"),
      recipeId,
      recipeName: recipe?.name || "",
      nameKo,
      nameEn: document.getElementById("menu-name-en").value.trim(),
      category: document.getElementById("menu-category-input").value.trim(),
      price: document.getElementById("menu-price").value.trim(),
      currency: "CAD",
      seasonal: document.getElementById("menu-seasonal").checked,
      discontinued: id ? Boolean(Store.getMenus().find((row) => row.id === id)?.discontinued) : false,
      notes: ""
    };
    Store.saveMenu(menu);
    event.currentTarget.dataset.editing = "";
    ["menu-name-ko", "menu-name-en", "menu-category-input", "menu-price"].forEach((field) => document.getElementById(field).value = "");
    document.getElementById("menu-recipe").value = "";
    document.getElementById("menu-seasonal").checked = false;
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
      seasonings: document.getElementById("recipe-seasonings").value.trim(),
      steps: document.getElementById("recipe-steps").value.trim(),
      notes: document.getElementById("recipe-notes").value.trim(),
      imageUrl: document.getElementById("recipe-image").value.trim(),
      ingredientItems: Store.parseRecipeItems(document.getElementById("recipe-ingredients").value),
      seasoningItems: Store.parseRecipeItems(document.getElementById("recipe-seasonings").value),
      stepItems: Store.parseRecipeSteps(document.getElementById("recipe-steps").value),
      enabled: true,
      updatedAt: Store.today()
    };
    if (!recipe.name) return;
    const rows = Store.getRecipes();
    Store.setRecipes(id ? rows.map((row) => row.id === id ? { ...row, ...recipe, enabled: row.enabled } : row) : [...rows, recipe]);
    event.currentTarget.dataset.editing = "";
    ["recipe-name", "recipe-description", "recipe-ingredients", "recipe-seasonings", "recipe-steps", "recipe-notes", "recipe-image"].forEach((field) => document.getElementById(field).value = "");
    renderAll();
  });
  document.getElementById("recipe-search").addEventListener("input", renderRecipes);
  document.getElementById("recipe-filter").addEventListener("change", renderRecipes);
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
  document.getElementById("seed-test-data").addEventListener("click", () => {
    if (!confirm(I18n.t("confirmSeedTestData"))) return;
    Store.seedTestData();
    setStatus(I18n.t("testDataSeeded"));
    renderAll();
  });
  document.getElementById("reset-demo-data").addEventListener("click", () => {
    if (!confirm(I18n.t("confirmResetDemoData"))) return;
    Store.resetDemoData();
    setStatus(I18n.t("demoDataReset"));
    renderDbStatus();
    renderAll();
  });
  document.getElementById("refresh-db-status").addEventListener("click", renderDbStatus);
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
      const current = Store.getRecipes();
      const merged = [...current];
      rows.forEach((row) => {
        const index = merged.findIndex((recipe) => recipe.id === row.id);
        if (index >= 0) merged[index] = { ...merged[index], ...row };
        else merged.push(row);
      });
      Store.setRecipes(merged);
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
