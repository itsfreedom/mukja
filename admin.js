(async function () {
  await Store.init({ datasets: [] });
  AppUI.renderSidebar("admin");
  AppUI.registerServiceWorker();

  const adminPanel = document.getElementById("admin-panel");
  const accessList = document.getElementById("access-list");
  const formSlot = document.getElementById("access-form-slot");
  const status = document.getElementById("admin-status");
  const addToggle = document.getElementById("add-access-toggle");
  let activeForm = null;

  const editIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></svg>';

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function setStatus(text) {
    status.textContent = text || "";
    if (text) setTimeout(() => (status.textContent = ""), 2400);
  }

  function roleValue(account = {}) {
    if (account.role === "admin") return "admin";
    if (account.role === "restaurant") return "restaurant";
    if (account.department === "야채") return "vegetable";
    if (account.department === "그로서리") return "grocery";
    return "cafeteria";
  }

  function roleFromValue(value) {
    if (value === "admin") return { role: "admin", department: "", label: "관리자" };
    if (value === "restaurant") return { role: "restaurant", department: "", label: "레스토랑" };
    if (value === "vegetable") return { role: "department", department: "야채", label: "야채" };
    if (value === "grocery") return { role: "department", department: "그로서리", label: "그로서리" };
    return { role: "department", department: "카페테리아", label: "카페테리아" };
  }

  function roleOptions(selected = "cafeteria") {
    return [
      ["cafeteria", "카페테리아"],
      ["vegetable", "야채"],
      ["grocery", "그로서리"],
      ["restaurant", "레스토랑"],
      ["admin", "관리자"]
    ].map(([value, label]) => `<option value="${value}" ${value === selected ? "selected" : ""}>${I18n.roleLabel(label)}</option>`).join("");
  }

  function accountBadge(account = {}) {
    if (account.role === "admin") return "A";
    if (account.role === "restaurant") return "R";
    if (account.department === "야채") return "V";
    if (account.department === "그로서리") return "G";
    return "C";
  }

  function badgeIcon(label) {
    const adminClass = label === "A" ? " is-admin" : "";
    return `
      <svg class="admin-role-badge${adminClass}" viewBox="0 0 28 28" aria-hidden="true">
        <circle cx="14" cy="14" r="13" />
        <text x="14" y="14" dominant-baseline="central" text-anchor="middle">${escapeHtml(label)}</text>
      </svg>
    `;
  }

  function accessForm(mode, password = "", account = {}) {
    const isEdit = mode === "edit";
    return `
      <div class="recipe-item-form admin-access-form" data-access-form data-mode="${mode}" data-old-password="${escapeHtml(password)}">
        <label><span>${I18n.t("password")}</span><input data-access-password value="${escapeHtml(password)}" autocomplete="off" /></label>
        <label><span>${I18n.t("currentRole")}</span><select data-access-role>${roleOptions(roleValue(account))}</select></label>
        <div class="recipe-item-form-actions admin-access-form-actions">
          <button class="button" data-access-action="save" type="button">${isEdit ? I18n.t("save") : I18n.t("add")}</button>
          ${isEdit ? `<button class="danger-button" data-access-action="delete" data-password="${escapeHtml(password)}" type="button">${I18n.t("delete")}</button>` : ""}
          <button class="ghost-button" data-access-action="cancel" type="button">${I18n.t("close")}</button>
        </div>
      </div>
    `;
  }

  function renderFormSlot() {
    if (activeForm?.mode === "create") {
      formSlot.innerHTML = accessForm("create", "", { role: "department", department: "카페테리아" });
      return;
    }
    formSlot.innerHTML = "";
  }

  function renderAccessAccounts() {
    const accounts = Store.getAccessAccounts();
    accessList.innerHTML = Object.entries(accounts).map(([password, account], index) => `
      <article class="list-card admin-access-row">
        <div class="admin-access-main">
          <span class="admin-access-number">${index + 1}</span>
          <code>${escapeHtml(password)}</code>
          ${badgeIcon(accountBadge(account))}
        </div>
        <div class="menu-row-actions admin-access-actions">
          <button class="menu-row-action is-edit" data-access-action="edit" data-password="${escapeHtml(password)}" type="button" aria-label="${I18n.t("edit")}">${editIcon}</button>
        </div>
      </article>
      ${activeForm?.mode === "edit" && activeForm.password === password ? accessForm("edit", password, account) : ""}
    `).join("");
  }

  function renderAll() {
    adminPanel.classList.toggle("hidden", !Store.canAdmin());
    if (!Store.canAdmin()) return;
    renderFormSlot();
    renderAccessAccounts();
    attachEvents();
    I18n.applyI18n();
  }

  async function saveAccess(form) {
    const accounts = Store.getAccessAccounts();
    const mode = form.dataset.mode;
    const oldPassword = form.dataset.oldPassword || "";
    const password = form.querySelector("[data-access-password]")?.value.trim() || "";
    const selected = roleFromValue(form.querySelector("[data-access-role]")?.value || "cafeteria");
    if (!password) {
      setStatus(I18n.t("accessPassword"));
      return;
    }
    if ((mode === "create" || password !== oldPassword) && accounts[password]) {
      setStatus(I18n.t("duplicatePassword"));
      return;
    }
    const next = { ...accounts };
    if (mode === "edit" && oldPassword && oldPassword !== password) delete next[oldPassword];
    next[password] = {
      ...selected,
      userName: accounts[oldPassword]?.userName || accounts[oldPassword]?.user_name || password,
      name: accounts[oldPassword]?.name || selected.label
    };
    const result = await Store.setAccessAccounts(next);
    if (result?.ok === false) {
      setStatus(result.error || I18n.t("csvImportInvalid"));
      return;
    }
    activeForm = null;
    setStatus(mode === "edit" ? I18n.t("updatedNotice") : I18n.t("saveDone"));
    renderAll();
  }

  async function deleteAccess(password) {
    const accounts = Store.getAccessAccounts();
    const account = accounts[password];
    const adminCount = Object.values(accounts).filter((row) => row.role === "admin").length;
    if (account?.role === "admin" && adminCount <= 1) {
      setStatus(I18n.t("adminAccessRequired"));
      return;
    }
    if (!window.confirm(I18n.format("confirmDeleteItem", { name: I18n.roleLabel(account?.label || password) }))) return;
    const next = { ...accounts };
    delete next[password];
    const result = await Store.setAccessAccounts(next);
    if (result?.ok === false) {
      setStatus(result.error || I18n.t("csvImportInvalid"));
      return;
    }
    if (activeForm?.password === password) activeForm = null;
    setStatus(I18n.t("delete"));
    renderAll();
  }

  async function exportCsv(kind) {
    if (kind === "history") {
      await Store.ensureData(["history"]);
      Store.downloadText("mukja-request-history.csv", Store.historyToCsv(Store.getHistory()), "text/csv;charset=utf-8");
    } else if (kind === "ingredients") {
      await Store.ensureData(["settings", "ingredients"]);
      Store.downloadText("mukja-ingredients.csv", Store.ingredientsToCsv(Store.getIngredients()), "text/csv;charset=utf-8");
    } else if (kind === "menus") {
      await Store.ensureData(["recipes", "menus"]);
      Store.downloadText("mukja-menus.csv", Store.menusToCsv(Store.getMenus()), "text/csv;charset=utf-8");
    } else if (kind === "recipes") {
      await Store.ensureData(["recipes"]);
      Store.downloadText("mukja-recipes.csv", Store.recipesToCsv(Store.getRecipes()), "text/csv;charset=utf-8");
    }
    setStatus(I18n.t("exportDone"));
  }

  async function importCsv(kind, fileInput) {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      let result = null;
      if (kind === "history") {
        const history = Store.historyFromCsv(text);
        if (!history.length) throw new Error("empty");
        if (!window.confirm(I18n.t("confirmCsvImport"))) return;
        result = await Store.replaceHistory(history);
      } else if (kind === "ingredients") {
        const ingredients = Store.ingredientsFromCsv(text);
        if (!ingredients.length) throw new Error("empty");
        if (!window.confirm(I18n.t("confirmCsvImport"))) return;
        result = await Store.setIngredients(ingredients);
      } else if (kind === "menus") {
        const menus = Store.menusFromCsv(text);
        if (!menus.length) throw new Error("empty");
        if (!window.confirm(I18n.t("confirmCsvImport"))) return;
        result = await Store.setMenus(menus);
      } else if (kind === "recipes") {
        const recipes = Store.recipesFromCsv(text);
        if (!recipes.length) throw new Error("empty");
        if (!window.confirm(I18n.t("confirmCsvImport"))) return;
        result = await Store.setRecipes(recipes);
      }
      if (result?.ok === false) throw new Error(result.error || "sync failed");
      setStatus(I18n.t("csvImportDone"));
    } catch {
      setStatus(I18n.t("csvImportInvalid"));
    } finally {
      fileInput.value = "";
    }
  }

  function attachEvents() {
    addToggle.onclick = () => {
      activeForm = activeForm?.mode === "create" ? null : { mode: "create" };
      renderAll();
    };
    document.querySelectorAll("[data-access-action]").forEach((button) => {
      button.onclick = () => {
        const action = button.dataset.accessAction;
        if (action === "edit") {
          const password = button.dataset.password;
          activeForm = activeForm?.mode === "edit" && activeForm.password === password ? null : { mode: "edit", password };
          renderAll();
          return;
        }
        if (action === "delete") {
          deleteAccess(button.dataset.password);
          return;
        }
        if (action === "save") {
          saveAccess(button.closest("[data-access-form]"));
          return;
        }
        if (action === "cancel") {
          activeForm = null;
          renderAll();
        }
      };
    });
    document.querySelectorAll("[data-export-csv]").forEach((button) => {
      button.onclick = () => exportCsv(button.dataset.exportCsv);
    });
    document.querySelectorAll("[data-import-csv]").forEach((input) => {
      input.onchange = () => importCsv(input.dataset.importCsv, input);
    });
  }

  renderAll();
})();
