(async function () {
  await Store.init({ datasets: ["settings", "history"] });
  AppUI.renderSidebar("history");
  AppUI.registerServiceWorker();

  const params = new URLSearchParams(window.location.search);
  const detailId = params.get("id") || "";
  const listView = document.getElementById("history-list-view");
  const detailView = document.getElementById("history-detail");
  const closeDetail = document.getElementById("close-detail");
  const pageTitle = document.getElementById("history-page-title");
  const pageMeta = document.getElementById("history-page-meta");
  const list = document.getElementById("history-list");
  const pager = document.getElementById("history-pager");
  const pageSize = 10;
  const pageParam = Number(params.get("page") || "0");
  let pageIndex = Number.isFinite(pageParam) && pageParam >= 0 ? pageParam : 0;
  const session = Store.getAuth();

  function visibleHistory() {
    const session = Store.getAuth();
    return Store.getHistory().flatMap((entry) => {
      if (session?.role !== "department" || !session.department || Store.isMukjaSession(session)) return [entry];
      const department = Store.normalizeTargetName(session.department);
      const items = (entry.items || []).filter((item) => Store.normalizeTargetName(item.target) === department);
      return items.length ? [{ ...entry, items }] : [];
    });
  }

  function formatSavedAt(entry) {
    const source = entry.updatedAt || entry.createdAt || "";
    const date = source ? new Date(source) : new Date(`${entry.date}T${entry.time || "00:00"}`);
    if (Number.isNaN(date.getTime())) return `${entry.date} ${entry.time || ""}`.trim();
    return date.toLocaleString(I18n.lang() === "en" ? "en-CA" : "ko-KR", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function sortedHistory() {
    return visibleHistory()
      .sort((a, b) => `${b.date} ${b.time || ""}`.localeCompare(`${a.date} ${a.time || ""}`));
  }

  function renderPager(totalPages) {
    if (totalPages <= 0) {
      pager.innerHTML = "";
      return;
    }
    pageIndex = Math.min(Math.max(pageIndex, 0), totalPages - 1);
    const startSlot = Math.max(0, Math.min(pageIndex - 2, Math.max(0, totalPages - 5)));
    const slots = Array.from({ length: Math.min(5, totalPages - startSlot) }, (_, index) => startSlot + index);
    pager.innerHTML = `
      <button type="button" data-history-page="${Math.max(0, pageIndex - 1)}">&lt;</button>
      ${slots.map((page) => `<button type="button" class="${page === pageIndex ? "is-active" : ""}" data-history-page="${page}">${page + 1}</button>`).join("")}
      <button type="button" data-history-page="${Math.min(totalPages - 1, pageIndex + 1)}">&gt;</button>
    `;
    pager.querySelectorAll("[data-history-page]").forEach((button) => {
      button.addEventListener("click", () => {
        pageIndex = Number(button.dataset.historyPage || "0");
        renderList();
      });
    });
  }

  function renderList() {
    const entries = sortedHistory();
    const totalPages = Math.ceil(entries.length / pageSize);
    renderPager(totalPages);
    if (!entries.length) {
      list.innerHTML = `<div class="list-card muted">${I18n.t("noHistory")}</div>`;
      return;
    }
    const pageEntries = entries.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
    list.innerHTML = `
      <div class="history-table">
        ${pageEntries.map((entry, index) => `
          <a class="history-row" href="history.html?id=${encodeURIComponent(entry.id)}&page=${pageIndex}">
            <span>${pageIndex * pageSize + index + 1}</span>
            <span class="history-row-main">
              <strong>${entry.date} ${entry.time || ""}</strong>
              <small>${formatSavedAt(entry)}</small>
            </span>
            <span class="menu-row-action is-recipe history-arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg></span>
          </a>
        `).join("")}
      </div>
    `;
  }

  function groupItemsByTarget(items) {
    const order = Store.getTargets();
    const groups = items.reduce((acc, item) => {
      const target = item.target || "기타";
      acc[target] = acc[target] || [];
      acc[target].push(item);
      return acc;
    }, {});
    return [
      ...order.filter((target) => groups[target]).map((target) => [target, groups[target]]),
      ...Object.keys(groups).filter((target) => !order.includes(target)).map((target) => [target, groups[target]])
    ];
  }

  function targetFor(item) {
    return Store.normalizeTargetName(item.target) || Store.getTargets()[0] || "매장";
  }

  function categoryFor(item) {
    const target = targetFor(item);
    const category = item.category || item.section || "기타";
    const targetCategories = Store.getRequestCategories(target);
    if (!["매장", "야채", "카페테리아"].includes(target)) {
      return targetCategories.includes(category) ? category : "기타";
    }
    if (target === "매장" && category === "식재료") return "분말";
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

  function groupItemsByCategory(items, target) {
    const groups = items.reduce((acc, item) => {
      const category = categoryFor(item);
      acc[category] = acc[category] || [];
      acc[category].push(item);
      return acc;
    }, {});
    const categoryOrders = Object.fromEntries(Store.getTargets().map((department) => [
      department,
      [...Store.getRequestCategories(department), "기타"]
    ]));
    return orderedKeys(groups, categoryOrders[target] || []).map((category) => [category, groups[category]]);
  }

  function checkCell(item, field) {
    const checked = item[field] ? "checked" : "";
    const disabled = session?.role === "admin" ? "" : "disabled";
    return `<input type="checkbox" data-detail-check="${item.id}|${field}" ${checked} ${disabled} />`;
  }

  function renderDetailGroups(entry) {
    return groupItemsByTarget(entry.items || []).map(([target, items]) => `
      <section class="department-group history-detail-group">
        <h2>${I18n.targetLabel(target)}</h2>
        <hr class="section-divider department-divider" />
        <div class="department-card history-detail-card">
          ${groupItemsByCategory(items, target).map(([category, categoryItems]) => `
            <section class="history-detail-category">
              <h3>${I18n.sectionLabel(category)}</h3>
              <hr class="section-divider" />
              <div class="history-detail-grid history-detail-head">
                <span>${I18n.t("items")}</span>
                <span>${I18n.t("outgoingConfirm")}</span>
                <span>${I18n.t("incomingConfirm")}</span>
              </div>
              ${categoryItems.map((item) => `
                <div class="history-detail-grid history-detail-row">
                  <strong>${I18n.itemName(item)}</strong>
                  <span>${checkCell(item, "received")}</span>
                  <span>${checkCell(item, "restaurantReceived")}</span>
                </div>
              `).join("")}
            </section>
          `).join("")}
        </div>
      </section>
    `).join("");
  }

  function bindDetailChecks(entry) {
    detailView.querySelectorAll("[data-detail-check]").forEach((input) => {
      input.addEventListener("change", async () => {
        if (session?.role !== "admin") return;
        const [itemId, field] = input.dataset.detailCheck.split("|");
        const nextEntry = {
          ...entry,
          items: (entry.items || []).map((item) =>
            item.id === itemId ? { ...item, [field]: input.checked } : item
          )
        };
        const result = await Store.saveHistoryEntry(nextEntry);
        if (result?.ok === false) {
          input.checked = !input.checked;
          alert(result.error || I18n.t("csvImportInvalid"));
          return;
        }
        entry.items = nextEntry.items;
        alert(I18n.t("updatedNotice"));
      });
    });
  }

  function renderDetail() {
    const entry = visibleHistory().find((row) => row.id === detailId);
    if (!entry) {
      detailView.innerHTML = `<div class="list-card muted">${I18n.t("noHistory")}</div>`;
      return;
    }
    listView.classList.add("hidden");
    detailView.classList.remove("hidden");
    closeDetail.classList.remove("hidden");
    pageTitle.textContent = I18n.t("detailHistory");
    pageTitle.removeAttribute("data-i18n");
    pageMeta.textContent = `${entry.date} ${entry.time || ""}`.trim();
    detailView.innerHTML = `
      <article class="history-detail-content">
        ${renderDetailGroups(entry)}
        <h3 class="admin-section">${I18n.t("memo")}</h3>
        <div class="memo-log">
          ${Array.isArray(entry.memos) && entry.memos.length
            ? entry.memos.map((memo) => `<article class="memo-entry"><strong>${memo.authorLabel || memo.department || memo.role || ""}</strong><p>${memo.text || ""}</p></article>`).join("")
            : `<p class="muted">${entry.memo || "-"}</p>`}
        </div>
      </article>
    `;
    bindDetailChecks(entry);
  }

  closeDetail.addEventListener("click", () => {
    window.location.href = `history.html?page=${pageIndex}`;
  });

  if (detailId) renderDetail();
  else renderList();
  I18n.applyI18n();
})();
