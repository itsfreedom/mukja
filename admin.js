(async function () {
  await Store.init();
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
    ].map(([value, label]) => `<option value="${value}" ${value === selected ? "selected" : ""}>${label}</option>`).join("");
  }

  function accountBadge(account = {}) {
    if (account.role === "admin") return "A";
    if (account.role === "restaurant") return "R";
    if (account.department === "야채") return "V";
    if (account.department === "그로서리") return "G";
    return "C";
  }

  function accessForm(mode, password = "", account = {}) {
    const isEdit = mode === "edit";
    return `
      <div class="recipe-item-form admin-access-form" data-access-form data-mode="${mode}" data-old-password="${escapeHtml(password)}">
        <label><span>비밀번호</span><input data-access-password value="${escapeHtml(password)}" autocomplete="off" /></label>
        <label><span>권한</span><select data-access-role>${roleOptions(roleValue(account))}</select></label>
        <div class="recipe-item-form-actions admin-access-form-actions">
          <button class="button" data-access-action="save" type="button">${isEdit ? "저장" : "추가"}</button>
          ${isEdit ? `<button class="danger-button" data-access-action="delete" data-password="${escapeHtml(password)}" type="button">삭제</button>` : ""}
          <button class="ghost-button" data-access-action="cancel" type="button">취소</button>
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
          <span class="admin-role-badge">${escapeHtml(accountBadge(account))}</span>
        </div>
        <div class="menu-row-actions admin-access-actions">
          <button class="menu-row-action is-edit" data-access-action="edit" data-password="${escapeHtml(password)}" type="button" aria-label="수정">${editIcon}</button>
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

  function saveAccess(form) {
    const accounts = Store.getAccessAccounts();
    const mode = form.dataset.mode;
    const oldPassword = form.dataset.oldPassword || "";
    const password = form.querySelector("[data-access-password]")?.value.trim() || "";
    const selected = roleFromValue(form.querySelector("[data-access-role]")?.value || "cafeteria");
    if (!password) {
      setStatus("비밀번호를 입력하세요.");
      return;
    }
    if ((mode === "create" || password !== oldPassword) && accounts[password]) {
      setStatus("이미 사용 중인 비밀번호입니다.");
      return;
    }
    const next = { ...accounts };
    if (mode === "edit" && oldPassword && oldPassword !== password) delete next[oldPassword];
    next[password] = {
      ...selected,
      userName: accounts[oldPassword]?.userName || accounts[oldPassword]?.user_name || password,
      name: accounts[oldPassword]?.name || selected.label
    };
    Store.setAccessAccounts(next);
    activeForm = null;
    setStatus(mode === "edit" ? "수정했습니다." : "추가했습니다.");
    renderAll();
  }

  function deleteAccess(password) {
    const accounts = Store.getAccessAccounts();
    const account = accounts[password];
    const adminCount = Object.values(accounts).filter((row) => row.role === "admin").length;
    if (account?.role === "admin" && adminCount <= 1) {
      setStatus("마지막 관리자 계정은 삭제할 수 없습니다.");
      return;
    }
    if (!window.confirm(`${account?.label || password} 계정을 삭제할까요?`)) return;
    const next = { ...accounts };
    delete next[password];
    Store.setAccessAccounts(next);
    if (activeForm?.password === password) activeForm = null;
    setStatus("삭제했습니다.");
    renderAll();
  }

  function exportCsv(kind) {
    if (kind === "history") {
      Store.downloadText("mukja-request-history.csv", Store.historyToCsv(Store.getHistory()), "text/csv;charset=utf-8");
    } else if (kind === "menus") {
      Store.downloadText("mukja-menus.csv", Store.menusToCsv(Store.getMenus()), "text/csv;charset=utf-8");
    } else if (kind === "recipes") {
      Store.downloadText("mukja-recipes.csv", Store.recipesToCsv(Store.getRecipes()), "text/csv;charset=utf-8");
    }
    setStatus("CSV를 내보냈습니다.");
  }

  async function importCsv(kind, fileInput) {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      if (kind === "history") {
        const history = Store.historyFromCsv(text);
        if (!history.length) throw new Error("empty");
        if (!window.confirm("요청 목록 CSV를 가져올까요? 기존 요청 목록이 교체됩니다.")) return;
        Store.replaceHistory(history);
      } else if (kind === "menus") {
        const menus = Store.menusFromCsv(text);
        if (!menus.length) throw new Error("empty");
        if (!window.confirm("메뉴 CSV를 가져올까요? 기존 메뉴 목록이 교체됩니다.")) return;
        Store.setMenus(menus);
      } else if (kind === "recipes") {
        const recipes = Store.recipesFromCsv(text);
        if (!recipes.length) throw new Error("empty");
        if (!window.confirm("레시피 CSV를 가져올까요? 기존 레시피 목록이 교체됩니다.")) return;
        Store.setRecipes(recipes);
      }
      setStatus("CSV를 가져왔습니다.");
    } catch {
      setStatus("CSV 내용을 확인하세요.");
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
