(async function () {
  await Store.init({ datasets: ["settings", "history"] });
  AppUI.renderSidebar("home");
  AppUI.registerServiceWorker();

  const title = document.querySelector("[data-home-title]");
  const subtitle = document.querySelector("[data-home-subtitle]");
  const list = document.getElementById("home-request-list");
  const status = document.getElementById("home-status");
  const session = Store.getAuth();
  let currentEntry = null;
  let draftItems = [];
  let homeJumpSelection = { target: "", category: "" };
  const collapsedHomeCategories = new Set();
  const toggleIcon = '<svg class="toggle-triangle-icon" viewBox="0 0 24 24" aria-hidden="true"><path class="toggle-icon-line" d="M5 5.5h14v3.5H5z" /><path class="toggle-icon-triangle" d="M5 11h14l-7 8z" /></svg>';

  function canUseHomeNavigation() {
    return session?.role === "admin" || Store.isMukjaSession(session);
  }

  function usesIncomingHomeCheck() {
    return session?.role === "admin" || Store.isMukjaSession(session);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#039;"
    }[char]));
  }

  function visibleEntry(entry) {
    if (!entry) return null;
    if (entry.memoOnly) return entry;
    const hasItems = Array.isArray(entry.items) && entry.items.length > 0;
    const hasMemo = String(entry.memo || "").trim() || (Array.isArray(entry.memos) && entry.memos.some((memo) => String(memo?.text || "").trim()));
    if (!hasItems && hasMemo) return { ...entry, items: [] };
    if (session?.role === "department" && session.department && !Store.isMukjaSession(session)) {
      const department = Store.normalizeTargetName(session.department);
      const items = (entry.items || []).filter((item) => Store.normalizeTargetName(item.target) === department);
      return items.length ? { ...entry, items } : null;
    }
    return entry;
  }

  function latestStandaloneMemoEntry() {
    const memos = orderedMemos(Store.getStandaloneMemos ? Store.getStandaloneMemos() : []);
    if (!memos.length) return null;
    const latest = memos.slice().sort((a, b) =>
      String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || ""))
    )[0];
    const stamp = latest?.updatedAt || latest?.createdAt || new Date().toISOString();
    return {
      id: "standalone-memos",
      date: stamp.slice(0, 10),
      time: stamp.slice(11, 16),
      mode: "memo",
      employee: "",
      target: "",
      items: [],
      memos,
      memo: memoText(memos),
      message: "",
      memoOnly: true
    };
  }

  function latestEntry() {
    const entryStamp = (entry) => {
      const remoteStamp = entry?.updatedAt || entry?.createdAt || "";
      if (remoteStamp) return remoteStamp;
      return `${entry?.date || ""}T${entry?.time || "00:00"}`;
    };
    const latestHistory = Store.getHistory()
      .map(visibleEntry)
      .filter(Boolean)
      .sort((a, b) => entryStamp(b).localeCompare(entryStamp(a)))[0] || null;
    if (latestHistory) return latestHistory;
    return visibleEntry(latestStandaloneMemoEntry());
  }

  function categoryValue(item) {
    return item.category || item.section || "기타";
  }

  function setStatus(text) {
    status.textContent = text || "";
    if (text) setTimeout(() => (status.textContent = ""), 2600);
  }

  function memoLabel(memo) {
    if (memo.authorLabel) return I18n.roleLabel(memo.authorLabel);
    if (memo.department) return I18n.targetLabel(memo.department);
    if (memo.role === "admin") return I18n.roleLabel("관리자");
    return I18n.t("memo");
  }

  function normalizedLabel(value) {
    return Store.normalizeTargetName(value);
  }

  function memoSlot(memo) {
    const author = normalizedLabel(memo.authorLabel);
    const department = normalizedLabel(memo.department);
    if (memo.role === "admin" || author === "관리자") return "admin";
    const target = department || author;
    if (target) return `department:${target}`;
    return "other";
  }

  function sessionMemoSlot() {
    if (session?.role === "admin") return "admin";
    const department = normalizedLabel(session?.department || session?.label);
    if (department) return `department:${department}`;
    return "other";
  }

  function memoSlotInfo(slot) {
    if (slot.startsWith("department:")) {
      const department = slot.replace(/^department:/, "");
      return { role: "department", department, label: department };
    }
    return {
      admin: { role: "admin", department: "", label: "관리자" }
    }[slot] || { role: session?.role || "", department: session?.department || "", label: session?.label || "" };
  }

  function memoSlots() {
    return ["admin", ...Store.getTargets().map((target) => `department:${target}`)];
  }

  function orderedMemos(memos) {
    const slotOrder = Object.fromEntries(memoSlots().map((slot, index) => [slot, index]));
    slotOrder.other = 99;
    return (Array.isArray(memos) ? memos : [])
      .filter((memo) => memo && String(memo.text || "").trim())
      .slice()
      .sort((a, b) => {
        const slotDiff = (slotOrder[memoSlot(a)] ?? 99) - (slotOrder[memoSlot(b)] ?? 99);
        if (slotDiff) return slotDiff;
        return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
      });
  }

  function currentMemo(memos) {
    const slot = sessionMemoSlot();
    return memos
      .filter((memo) => memoSlot(memo) === slot)
      .sort((a, b) =>
        String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || ""))
      )[0] || null;
  }

  function memoEntry(text, existingMemo = null) {
    const trimmed = text.trim();
    if (!trimmed) return null;
    const slotInfo = memoSlotInfo(sessionMemoSlot());
    return {
      id: existingMemo?.id || Store.id("memo"),
      role: slotInfo.role,
      department: slotInfo.department,
      authorLabel: slotInfo.label,
      text: trimmed,
      createdAt: existingMemo?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  function memoText(memos) {
    return memos.map((memo) => `[${memoLabel(memo)}] ${memo.text}`).join("\n");
  }

  function targetFor(item) {
    return Store.normalizeTargetName(item.target) || Store.getTargets()[0] || "매장";
  }

  function categoryFor(item) {
    const target = targetFor(item);
    const category = categoryValue(item);
    const targetCategories = Store.getRequestCategories(target);
    if (!["매장", "야채", "카페테리아"].includes(target)) {
      return targetCategories.includes(category) ? category : "기타";
    }
    if (target === "매장" && category === "식재료") return "상온";
    if (target === "매장" && Store.getRequestCategories("매장").includes(category)) return category;
    if (target === "매장") return "기타";
    if (target === "야채" && Store.getRequestCategories("야채").includes(category)) return category;
    if (target === "야채") return "기타";
    const cafeteriaSections = [...Store.getRequestCategories("카페테리아"), "기타"];
    if (cafeteriaSections.includes(category)) return category;
    return "기타";
  }

  function orderedKeys(groups, order) {
    return [
      ...order.filter((key) => groups[key]),
      ...Object.keys(groups).filter((key) => !order.includes(key))
    ];
  }

  function homeCategoryKey(target, category) {
    return `${Store.normalizeTargetName(target)}::${category}`;
  }

  function isHomeCategoryCollapsed(target, category) {
    return collapsedHomeCategories.has(homeCategoryKey(target, category));
  }

  function setHomeCategoryCollapsed(target, category, collapsed) {
    const key = homeCategoryKey(target, category);
    if (collapsed) collapsedHomeCategories.add(key);
    else collapsedHomeCategories.delete(key);
  }

  function areHomeTargetCategoriesCollapsed(target, categories) {
    return categories.length > 0 && categories.every((category) => isHomeCategoryCollapsed(target, category));
  }

  function renderHomeJumpPanel(targets, targetCategoryMap) {
    if (!canUseHomeNavigation() || !targets.length) return "";
    const selectedTarget = targets.includes(homeJumpSelection.target) ? homeJumpSelection.target : targets[0];
    const categories = targetCategoryMap[selectedTarget] || [];
    const selectedCategory = categories.includes(homeJumpSelection.category) ? homeJumpSelection.category : (categories[0] || "");
    homeJumpSelection = { target: selectedTarget, category: selectedCategory };
    return `
      <div class="recipe-item-form order-bulk-panel home-jump-panel admin-section" data-home-jump-panel>
        <div class="order-jump-selects">
          <label><span>${I18n.t("department")}</span><select data-home-jump-target>
            ${targets.map((target) => `<option value="${escapeHtml(target)}" ${target === selectedTarget ? "selected" : ""}>${I18n.targetLabel(target)}</option>`).join("")}
          </select></label>
          <label><span>${I18n.t("menuCategory")}</span><select data-home-jump-category>
            ${categories.map((category) => `<option value="${escapeHtml(category)}" ${category === selectedCategory ? "selected" : ""}>${I18n.sectionLabel(category)}</option>`).join("")}
          </select></label>
        </div>
        <div class="order-jump-actions">
          <button class="ghost-button" data-home-jump="top" type="button">${I18n.t("top")}</button>
          <button class="ghost-button" data-home-jump="prev" type="button">${I18n.t("previous")}</button>
          <button class="button" data-home-jump="current" type="button">${I18n.t("move")}</button>
          <button class="ghost-button" data-home-jump="next" type="button">${I18n.t("next")}</button>
          <button class="ghost-button" data-home-jump="bottom" type="button">${I18n.t("bottom")}</button>
        </div>
      </div>
    `;
  }

  function renderRows(items) {
    const checkField = usesIncomingHomeCheck() ? "restaurantReceived" : "received";
    return `
      <div class="item-section-list">
        ${items.map((item) => `
          <label class="receive-row">
            <input type="checkbox" data-home-receive="${item.id}" data-home-receive-field="${checkField}" ${item[checkField] ? "checked" : ""} />
            <span class="receive-row-main">
              <strong>${I18n.itemName(item)}</strong>
            </span>
          </label>
        `).join("")}
      </div>
    `;
  }

  function renderMemoPanel(entry) {
    const allMemos = orderedMemos(Array.isArray(entry.memos) ? entry.memos : []);
    const currentSlot = sessionMemoSlot();
    const current = currentMemo(allMemos);
    const memoBySlot = allMemos.reduce((acc, memo) => {
      const slot = memoSlot(memo);
      if (!acc.has(slot)) acc.set(slot, memo);
      return acc;
    }, new Map());
    const readonlySlots = memoSlots().filter((slot) => slot !== currentSlot);
    return `
      <section class="memo-panel home-memo-panel admin-section">
        <h3>${I18n.t("readonlyMemoTitle")} <span>${I18n.t("readOnly")}</span></h3>
        <div class="memo-log">
          ${readonlySlots.map((slot) => {
            const memo = memoBySlot.get(slot);
            const label = memo ? memoLabel(memo) : memoSlotInfo(slot).label;
            return `
            <article class="memo-entry">
              <div class="memo-entry-meta">
                <strong>${I18n.roleLabel(label)}</strong>
                <span>${memo?.createdAt ? new Date(memo.createdAt).toLocaleString(I18n.lang() === "en" ? "en-CA" : "ko-KR") : ""}</span>
              </div>
              <p class="${memo ? "" : "memo-placeholder"}">${memo?.text || I18n.t("memoNone")}</p>
            </article>
          `;
          }).join("")}
        </div>
        <label class="field">
          <span>${I18n.t("addMemo")}</span>
          <textarea id="home-memo" placeholder="${current?.text ? I18n.t("memoPlaceholder") : I18n.t("memoNone")}">${current?.text || ""}</textarea>
        </label>
        <div class="button-row home-action-row">
          <button class="button" id="home-save" type="button">${I18n.t("save")}</button>
          <button class="danger-button" id="home-reset" type="button">${I18n.t("reset")}</button>
        </div>
      </section>
    `;
  }

  function renderCategorySection(target, category, items) {
    const collapsed = canUseHomeNavigation() && isHomeCategoryCollapsed(target, category);
    return `
      <section class="item-section home-request-section request-category-section ${collapsed ? "is-collapsed" : ""}" data-home-category-row data-category-target="${escapeHtml(target)}" data-category-name="${escapeHtml(category)}">
        <div class="section-title-row request-category-title-row">
          <h3><button class="request-category-title-button" data-home-category-action="focus" data-category-target="${escapeHtml(target)}" data-category-name="${escapeHtml(category)}" type="button">${I18n.sectionLabel(category)}</button></h3>
          ${canUseHomeNavigation() ? `
            <div class="menu-row-actions request-row-actions">
              <button class="menu-row-action request-category-toggle ${collapsed ? "" : "is-expanded"}" data-home-category-action="toggle" data-category-target="${escapeHtml(target)}" data-category-name="${escapeHtml(category)}" type="button" aria-expanded="${collapsed ? "false" : "true"}" aria-label="${I18n.sectionLabel(category)} ${I18n.t(collapsed ? "expandCategory" : "collapseCategory")}">${toggleIcon}</button>
            </div>
          ` : ""}
        </div>
        <hr class="section-divider section-title-divider" />
        ${renderRows(items)}
      </section>
    `;
  }

  function homeCategoryRows() {
    return [...list.querySelectorAll("[data-home-category-row]")];
  }

  function homeCategoryRowsForTarget(target) {
    return homeCategoryRows().filter((row) => row.dataset.categoryTarget === target);
  }

  function homeJumpPanel() {
    return list.querySelector("[data-home-jump-panel]");
  }

  function homeJumpTargetSelect() {
    return list.querySelector("[data-home-jump-target]");
  }

  function homeJumpCategorySelect() {
    return list.querySelector("[data-home-jump-category]");
  }

  function updateHomeCategorySelect() {
    const targetSelect = homeJumpTargetSelect();
    const categorySelect = homeJumpCategorySelect();
    if (!targetSelect || !categorySelect) return;
    const rows = homeCategoryRowsForTarget(targetSelect.value);
    const current = categorySelect.value;
    categorySelect.innerHTML = rows.map((row) => {
      const category = row.dataset.categoryName || "";
      return `<option value="${escapeHtml(category)}" ${category === current ? "selected" : ""}>${I18n.sectionLabel(category)}</option>`;
    }).join("");
    if (![...categorySelect.options].some((option) => option.value === current)) {
      categorySelect.value = rows[0]?.dataset.categoryName || "";
    }
    homeJumpSelection = { target: targetSelect.value, category: categorySelect.value };
  }

  function currentHomeCategoryRow() {
    const target = homeJumpTargetSelect()?.value || "";
    const category = homeJumpCategorySelect()?.value || "";
    return homeCategoryRows().find((row) => row.dataset.categoryTarget === target && row.dataset.categoryName === category);
  }

  function syncHomeJumpSelects(row) {
    if (!row) return;
    const targetSelect = homeJumpTargetSelect();
    const categorySelect = homeJumpCategorySelect();
    if (!targetSelect || !categorySelect) return;
    targetSelect.value = row.dataset.categoryTarget || "";
    updateHomeCategorySelect();
    categorySelect.value = row.dataset.categoryName || "";
    homeJumpSelection = { target: targetSelect.value, category: categorySelect.value };
  }

  function scrollToHomeRow(row) {
    if (!row) {
      setStatus(I18n.t("categoryNotFound"));
      return;
    }
    const stickyOffset = (homeJumpPanel()?.offsetHeight || 0) + 14;
    const top = row.getBoundingClientRect().top + window.scrollY - stickyOffset;
    const isTestDom = navigator.userAgent.toLowerCase().includes("jsdom");
    if (!isTestDom) {
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }
    row.classList.add("is-jump-focused");
    setTimeout(() => row.classList.remove("is-jump-focused"), 1400);
  }

  function scrollToHomeHeader() {
    const header = document.querySelector(".home-last-order .page-header");
    if (!header) return;
    const top = header.getBoundingClientRect().top + window.scrollY - 12;
    const isTestDom = navigator.userAgent.toLowerCase().includes("jsdom");
    if (!isTestDom) {
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }
    header.classList.add("is-jump-focused");
    setTimeout(() => header.classList.remove("is-jump-focused"), 1400);
  }

  function updateHomeTargetToggle(target) {
    const rows = homeCategoryRowsForTarget(target);
    const button = [...list.querySelectorAll("[data-home-target-action='toggle']")]
      .find((node) => node.dataset.categoryTarget === target);
    if (!button || !rows.length) return;
    const collapsed = rows.every((row) => row.classList.contains("is-collapsed"));
    button.classList.toggle("is-expanded", !collapsed);
    button.setAttribute("aria-expanded", String(!collapsed));
    button.setAttribute("aria-label", `${I18n.targetLabel(target)} ${I18n.t(collapsed ? "expandCategory" : "collapseCategory")}`);
  }

  function setHomeRowCollapsed(row, collapsed) {
    if (!row) return;
    const target = row.dataset.categoryTarget || "";
    const category = row.dataset.categoryName || "";
    row.classList.toggle("is-collapsed", collapsed);
    const button = row.querySelector("[data-home-category-action='toggle']");
    if (button) {
      button.classList.toggle("is-expanded", !collapsed);
      button.setAttribute("aria-expanded", String(!collapsed));
      button.setAttribute("aria-label", `${I18n.sectionLabel(category)} ${I18n.t(collapsed ? "expandCategory" : "collapseCategory")}`);
    }
    setHomeCategoryCollapsed(target, category, collapsed);
    updateHomeTargetToggle(target);
  }

  function bindHomeNavigation() {
    if (!canUseHomeNavigation()) return;
    homeJumpTargetSelect()?.addEventListener("change", () => updateHomeCategorySelect());
    homeJumpCategorySelect()?.addEventListener("change", () => {
      homeJumpSelection = {
        target: homeJumpTargetSelect()?.value || "",
        category: homeJumpCategorySelect()?.value || ""
      };
    });
    list.querySelectorAll("[data-home-jump]").forEach((button) => {
      button.addEventListener("click", () => {
        const rows = homeCategoryRows();
        if (!rows.length) return;
        const action = button.dataset.homeJump;
        if (action === "top") {
          scrollToHomeHeader();
          return;
        }
        const current = currentHomeCategoryRow();
        const currentIndex = Math.max(0, rows.indexOf(current));
        const index = {
          current: currentIndex,
          prev: Math.max(0, currentIndex - 1),
          next: Math.min(rows.length - 1, currentIndex + 1),
          bottom: rows.length - 1
        }[action] ?? currentIndex;
        const row = rows[index];
        syncHomeJumpSelects(row);
        scrollToHomeRow(row);
      });
    });
    list.querySelectorAll("[data-home-category-action]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const row = button.closest("[data-home-category-row]");
        if (button.dataset.homeCategoryAction === "focus") {
          syncHomeJumpSelects(row);
          scrollToHomeRow(row);
          return;
        }
        setHomeRowCollapsed(row, !row.classList.contains("is-collapsed"));
      });
    });
    list.querySelectorAll("[data-home-target-action='toggle']").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const target = button.dataset.categoryTarget || "";
        const rows = homeCategoryRowsForTarget(target);
        const collapse = !rows.every((row) => row.classList.contains("is-collapsed"));
        rows.forEach((row) => setHomeRowCollapsed(row, collapse));
      });
    });
  }

  function renderLatest(entry) {
    currentEntry = entry;
    title.textContent = I18n.t("lastRequest");
    subtitle.textContent = entry ? `${entry.date} ${entry.time || ""}` : "";
    if (!entry) {
      list.innerHTML = `<div class="list-card muted">${I18n.t("noHistory")}</div>`;
      return;
    }
    draftItems = (entry.items || []).map((item) => ({ ...item }));
    if (entry.memoOnly || !draftItems.length) {
      list.innerHTML = renderMemoPanel(entry);
      document.getElementById("home-save")?.addEventListener("click", saveCurrent);
      document.getElementById("home-reset")?.addEventListener("click", resetDraft);
      I18n.applyI18n();
      return;
    }
    const isDepartment = session?.role === "department" && !Store.isMukjaSession(session);
    const targetOrder = Store.getTargets();
    const categoryOrders = Object.fromEntries(targetOrder.map((target) => [
      target,
      [...Store.getRequestCategories(target), "기타"]
    ]));
    const targetGroups = draftItems.reduce((acc, item) => {
      const target = isDepartment ? (session.department || targetFor(item)) : targetFor(item);
      const category = categoryFor(item);
      acc[target] = acc[target] || {};
      acc[target][category] = acc[target][category] || [];
      acc[target][category].push(item);
      return acc;
    }, {});
    const targets = isDepartment ? Object.keys(targetGroups) : orderedKeys(targetGroups, targetOrder);
    const targetCategoryMap = Object.fromEntries(targets.map((target) => [
      target,
      orderedKeys(targetGroups[target], categoryOrders[target] || ["기타"])
    ]));
    list.innerHTML = `
      ${renderHomeJumpPanel(targets, targetCategoryMap)}
      ${targets.map((target) => {
        const categoryGroups = targetGroups[target];
        const categories = targetCategoryMap[target] || [];
        const targetCollapsed = canUseHomeNavigation() && areHomeTargetCategoriesCollapsed(target, categories);
        return `
          <section class="department-group home-target-group request-target-group" data-home-target-group data-category-target="${escapeHtml(target)}">
            <div class="section-title-row menu-category-title-row">
              <h2>${I18n.targetLabel(target)}</h2>
              ${canUseHomeNavigation() ? `
                <div class="menu-row-actions request-target-actions">
                  <button class="menu-row-action request-target-toggle ${targetCollapsed ? "" : "is-expanded"}" data-home-target-action="toggle" data-category-target="${escapeHtml(target)}" type="button" aria-expanded="${targetCollapsed ? "false" : "true"}" aria-label="${I18n.targetLabel(target)} ${I18n.t(targetCollapsed ? "expandCategory" : "collapseCategory")}">${toggleIcon}</button>
                </div>
              ` : ""}
            </div>
            <hr class="section-divider department-divider" />
            <div class="department-card home-target-section request-target-section">
              ${categories.map((category) => renderCategorySection(target, category, categoryGroups[category])).join("")}
            </div>
          </section>
        `;
      }).join("")}
      ${renderMemoPanel(entry)}
    `;
    bindHomeNavigation();
    list.querySelectorAll("[data-home-receive]").forEach((input) => {
      input.addEventListener("change", () => {
        const itemId = input.dataset.homeReceive;
        const field = input.dataset.homeReceiveField || (usesIncomingHomeCheck() ? "restaurantReceived" : "received");
        draftItems = draftItems.map((item) =>
          item.id === itemId ? { ...item, [field]: input.checked } : item
        );
      });
    });
    document.getElementById("home-save")?.addEventListener("click", saveCurrent);
    document.getElementById("home-reset")?.addEventListener("click", resetDraft);
    I18n.applyI18n();
  }

  function buildEntry() {
    if (!currentEntry) return null;
    if (currentEntry.memoOnly) {
      const baseMemos = orderedMemos(Store.getStandaloneMemos ? Store.getStandaloneMemos() : currentEntry.memos);
      const existingMemo = baseMemos.find((memo) => memoSlot(memo) === sessionMemoSlot());
      const memo = memoEntry(document.getElementById("home-memo")?.value || "", existingMemo);
      if (!memo) return null;
      return { ...currentEntry, memos: [memo], memo: memo.text, memoOnly: true };
    }
    const baseEntry = Store.getHistory().find((entry) => entry.id === currentEntry.id) || currentEntry;
    const draftById = new Map(draftItems.map((item) => [item.id, item]));
    const currentSlot = sessionMemoSlot();
    const baseMemos = orderedMemos(Array.isArray(baseEntry.memos) ? baseEntry.memos : []);
    const existingMemo = baseMemos.find((memo) => memoSlot(memo) === currentSlot);
    const memo = memoEntry(document.getElementById("home-memo")?.value || "", existingMemo);
    const memos = [
      ...baseMemos.filter((row) => memoSlot(row) !== currentSlot),
      ...(memo ? [memo] : [])
    ];
    const entry = {
      ...baseEntry,
      items: (baseEntry.items || []).map((item) => {
        const draft = draftById.get(item.id);
        return draft ? { ...item, ...draft } : item;
      }),
      memos,
      memo: memoText(memos)
    };
    return entry;
  }

  function refreshFrom(entry) {
    renderLatest(visibleEntry(entry));
    setStatus(I18n.t("saved"));
  }

  async function saveCurrent() {
    const entry = buildEntry();
    if (!entry) {
      setStatus(I18n.t("chooseItemOrMemo"));
      return;
    }
    const result = entry.memoOnly ? await Store.saveStandaloneMemo(entry.memos[0]) : await Store.saveHistoryEntry(entry);
    if (result?.ok === false) {
      setStatus(result.error || I18n.t("csvImportInvalid"));
      return;
    }
    refreshFrom(entry.memoOnly ? latestStandaloneMemoEntry() : entry);
  }

  function resetDraft() {
    draftItems = draftItems.map((item) =>
      usesIncomingHomeCheck()
        ? { ...item, restaurantReceived: false }
        : { ...item, received: false }
    );
    const memo = document.getElementById("home-memo");
    if (memo) memo.value = "";
    list.querySelectorAll("[data-home-receive]").forEach((input) => {
      input.checked = false;
    });
    setStatus(I18n.t("resetDone"));
  }

  async function refreshLatestFromDb() {
    await Store.refreshHistory();
    renderLatest(latestEntry());
  }

  window.addEventListener("focus", refreshLatestFromDb);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshLatestFromDb();
  });

  renderLatest(latestEntry());
  I18n.applyI18n();
})();
