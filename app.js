(async function () {
  await Store.init();
  AppUI.renderSidebar("home");
  AppUI.registerServiceWorker();

  const title = document.querySelector("[data-home-title]");
  const subtitle = document.querySelector("[data-home-subtitle]");
  const list = document.getElementById("home-request-list");
  const status = document.getElementById("home-status");
  const session = Store.getAuth();
  let currentEntry = null;
  let draftItems = [];

  function visibleEntry(entry) {
    if (!entry) return null;
    if (session?.role === "department" && session.department) {
      const items = (entry.items || []).filter((item) => item.target === session.department);
      return items.length ? { ...entry, items } : null;
    }
    return entry;
  }

  function latestEntry() {
    return Store.getHistory()
      .map(visibleEntry)
      .filter(Boolean)
      .sort((a, b) => `${b.date} ${b.time || ""}`.localeCompare(`${a.date} ${a.time || ""}`))[0];
  }

  function sectionFor(item) {
    return item.section || "기타";
  }

  function setStatus(text) {
    status.textContent = text || "";
    if (text) setTimeout(() => (status.textContent = ""), 2600);
  }

  function memoLabel(memo) {
    if (memo.authorLabel) return I18n.roleLabel(memo.authorLabel);
    if (memo.department) return I18n.targetLabel(memo.department);
    if (memo.role === "restaurant") return I18n.roleLabel("레스토랑");
    if (memo.role === "admin") return I18n.roleLabel("관리자");
    return I18n.t("memo");
  }

  function memoEntry(text) {
    const trimmed = text.trim();
    if (!trimmed) return null;
    return {
      id: Store.id("memo"),
      role: session?.role || "",
      department: session?.department || "",
      authorLabel: session?.label || "",
      text: trimmed,
      createdAt: new Date().toISOString()
    };
  }

  function memoText(memos) {
    return memos.map((memo) => `[${memoLabel(memo)}] ${memo.text}`).join("\n");
  }

  function targetFor(item) {
    return item.target || "그로서리";
  }

  function categoryFor(item) {
    const target = targetFor(item);
    const section = sectionFor(item);
    if (target === "그로서리" && section === "식재료") return "상온";
    if (target === "그로서리" && ["상온", "냉장", "냉동", "기타"].includes(section)) return section;
    if (target === "그로서리") return "기타";
    if (target === "야채") return "야채";
    if (["반조리", "소스", "반찬", "냉장", "냉동", "기타"].includes(section)) return section;
    return "기타";
  }

  function orderedKeys(groups, order) {
    return [
      ...order.filter((key) => groups[key]),
      ...Object.keys(groups).filter((key) => !order.includes(key))
    ];
  }

  function renderRows(items) {
    return `
      <div class="item-section-list">
        ${items.map((item) => `
          <label class="receive-row">
            <input type="checkbox" data-receive="${item.id}" ${item.received ? "checked" : ""} />
            <span class="receive-row-main">
              <strong>${I18n.itemName(item)}</strong>
            </span>
          </label>
        `).join("")}
      </div>
    `;
  }

  function renderMemoPanel(entry) {
    const memos = Array.isArray(entry.memos) ? entry.memos : [];
    return `
      <section class="memo-panel home-memo-panel admin-section">
        <h3>타부서에서 작성한 메모 <span>수정 불가</span></h3>
        <div class="memo-log">
          ${memos.length ? memos.map((memo) => `
            <article class="memo-entry">
              <div class="memo-entry-meta">
                <strong>${memoLabel(memo)}</strong>
                <span>${memo.createdAt ? new Date(memo.createdAt).toLocaleString(I18n.lang() === "en" ? "en-CA" : "ko-KR") : ""}</span>
              </div>
              <p>${memo.text || ""}</p>
            </article>
          `).join("") : `<div class="memo-empty">${I18n.t("noMemo")}</div>`}
        </div>
        <label class="field">
          <span>메모 추가</span>
          <textarea id="home-memo" data-i18n-placeholder="memoPlaceholder"></textarea>
        </label>
        <div class="button-row home-action-row">
          <button class="button" id="home-save" type="button">저장</button>
          <button class="ghost-button" id="home-update" type="button">수정</button>
          <button class="danger-button" id="home-reset" type="button">초기화</button>
        </div>
      </section>
    `;
  }

  function renderCategorySection(category, items) {
    return `
      <section class="item-section home-request-section">
        <h3>${I18n.sectionLabel(category)}</h3>
        <hr class="section-divider" />
        ${renderRows(items)}
      </section>
    `;
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
    const isDepartment = session?.role === "department";
    const targetOrder = ["카페테리아", "야채", "그로서리"];
    const categoryOrders = {
      "카페테리아": ["반조리", "소스", "반찬", "냉장", "냉동", "기타"],
      "야채": ["야채"],
      "그로서리": ["상온", "냉장", "냉동", "기타"]
    };
    const targetGroups = draftItems.reduce((acc, item) => {
      const target = isDepartment ? "요청 품목" : targetFor(item);
      const category = categoryFor(item);
      acc[target] = acc[target] || {};
      acc[target][category] = acc[target][category] || [];
      acc[target][category].push(item);
      return acc;
    }, {});
    const targets = isDepartment ? Object.keys(targetGroups) : orderedKeys(targetGroups, targetOrder);
    list.innerHTML = `
      <article class="list-card">
        ${targets.map((target) => {
          const categoryGroups = targetGroups[target];
          const categories = orderedKeys(categoryGroups, categoryOrders[target] || categoryOrders["카페테리아"]);
          return `
            <section class="home-target-section">
              ${isDepartment ? "" : `<h2>${I18n.targetLabel(target)}</h2>`}
              ${categories.map((category) => renderCategorySection(category, categoryGroups[category])).join("")}
            </section>
          `;
        }).join("")}
        ${renderMemoPanel(entry)}
      </article>
    `;
    list.querySelectorAll("[data-receive]").forEach((input) => {
      input.addEventListener("change", () => {
        const itemId = input.dataset.receive;
        draftItems = draftItems.map((item) =>
          item.id === itemId ? { ...item, received: input.checked } : item
        );
      });
    });
    document.getElementById("home-save")?.addEventListener("click", saveSnapshot);
    document.getElementById("home-update")?.addEventListener("click", updateCurrent);
    document.getElementById("home-reset")?.addEventListener("click", resetDraft);
    I18n.applyI18n();
  }

  function buildEntry({ snapshot = false } = {}) {
    if (!currentEntry) return null;
    const memo = memoEntry(document.getElementById("home-memo")?.value || "");
    const memos = [...(Array.isArray(currentEntry.memos) ? currentEntry.memos : []), ...(memo ? [memo] : [])];
    const entry = {
      ...currentEntry,
      id: snapshot ? Store.id("history") : currentEntry.id,
      date: snapshot ? Store.today() : currentEntry.date,
      time: snapshot ? Store.nowTime() : currentEntry.time,
      items: draftItems.map((item) => ({ ...item })),
      memos,
      memo: memoText(memos)
    };
    return entry;
  }

  function refreshFrom(entry) {
    renderLatest(visibleEntry(entry));
    setStatus(I18n.t("saved"));
  }

  function saveSnapshot() {
    const entry = buildEntry({ snapshot: true });
    if (!entry) return;
    Store.saveHistoryEntry(entry);
    refreshFrom(entry);
  }

  function updateCurrent() {
    const entry = buildEntry();
    if (!entry) return;
    Store.saveHistoryEntry(entry);
    refreshFrom(entry);
  }

  function resetDraft() {
    draftItems = draftItems.map((item) => ({ ...item, received: false }));
    const memo = document.getElementById("home-memo");
    if (memo) memo.value = "";
    list.querySelectorAll("[data-receive]").forEach((input) => {
      input.checked = false;
    });
    setStatus("초기화했습니다.");
  }

  renderLatest(latestEntry());
  I18n.applyI18n();
})();
