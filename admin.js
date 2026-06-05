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

  const addIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14" /><path d="M5 12h14" /></svg>';
  const editIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></svg>';
  const deleteIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h12" /><path d="M9 7V5h6v2" /><path d="M9 11v6" /><path d="M15 11v6" /><path d="M8 7l1 14h6l1-14" /></svg>';

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

  function roleOptions(selected = "department") {
    return [
      ["department", "부서"],
      ["restaurant", "레스토랑"],
      ["admin", "관리자"]
    ].map(([value, label]) => `<option value="${value}" ${value === selected ? "selected" : ""}>${label}</option>`).join("");
  }

  function departmentOptions(selected = "") {
    return [
      ["", "-"],
      ["카페테리아", "카페테리아"],
      ["야채", "야채"],
      ["그로서리", "그로서리"]
    ].map(([value, label]) => `<option value="${value}" ${value === selected ? "selected" : ""}>${label}</option>`).join("");
  }

  function accessForm(mode, password = "", account = {}) {
    const isEdit = mode === "edit";
    return `
      <div class="recipe-item-form admin-access-form" data-access-form data-mode="${mode}" data-old-password="${escapeHtml(password)}">
        <label><span>비밀번호</span><input data-access-password value="${escapeHtml(password)}" autocomplete="off" /></label>
        <label><span>권한</span><select data-access-role>${roleOptions(account.role || "department")}</select></label>
        <label><span>부서</span><select data-access-department>${departmentOptions(account.department || "")}</select></label>
        <label><span>이름</span><input data-access-label value="${escapeHtml(account.label || account.department || "")}" /></label>
        <div class="recipe-item-form-actions admin-access-form-actions">
          <button class="button" data-access-action="save" type="button">${isEdit ? "저장" : "추가"}</button>
          <button class="ghost-button" data-access-action="cancel" type="button">취소</button>
        </div>
      </div>
    `;
  }

  function accountSummary(account) {
    const roleLabel = account.role === "admin" ? "관리자" : account.role === "restaurant" ? "레스토랑" : "부서";
    const detail = account.role === "department" ? account.department || "-" : account.label || roleLabel;
    return `${roleLabel} · ${detail}`;
  }

  function renderFormSlot() {
    if (activeForm?.mode === "create") {
      formSlot.innerHTML = accessForm("create", "", { role: "department", department: "카페테리아", label: "카페테리아" });
      return;
    }
    formSlot.innerHTML = "";
  }

  function renderAccessAccounts() {
    const accounts = Store.getAccessAccounts();
    accessList.innerHTML = Object.entries(accounts).map(([password, account]) => `
      <article class="list-card admin-access-row">
        <div class="admin-access-main">
          <strong>${escapeHtml(account.label || account.department || password)}</strong>
          <span>${escapeHtml(accountSummary(account))}</span>
          <code>${escapeHtml(password)}</code>
        </div>
        <div class="menu-row-actions admin-access-actions">
          <button class="menu-row-action is-edit" data-access-action="edit" data-password="${escapeHtml(password)}" type="button" aria-label="수정">${editIcon}</button>
          <button class="menu-row-action is-danger" data-access-action="delete" data-password="${escapeHtml(password)}" type="button" aria-label="삭제">${deleteIcon}</button>
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
    const role = form.querySelector("[data-access-role]")?.value || "department";
    const department = role === "department" ? form.querySelector("[data-access-department]")?.value || "" : "";
    const label = form.querySelector("[data-access-label]")?.value.trim() || department || (role === "admin" ? "관리자" : "레스토랑");
    if (!password) {
      setStatus("비밀번호를 입력하세요.");
      return;
    }
    if (role === "department" && !department) {
      setStatus("부서를 선택하세요.");
      return;
    }
    if ((mode === "create" || password !== oldPassword) && accounts[password]) {
      setStatus("이미 사용 중인 비밀번호입니다.");
      return;
    }
    const next = { ...accounts };
    if (mode === "edit" && oldPassword && oldPassword !== password) delete next[oldPassword];
    next[password] = { role, department, label };
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
  }

  renderAll();
})();
