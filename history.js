(async function () {
  await Store.init({ datasets: ["settings", "history"] });
  AppUI.renderSidebar("history");
  AppUI.registerServiceWorker();

  const params = new URLSearchParams(window.location.search);
  const detailId = params.get("id") || "";
  const weekView = document.getElementById("history-week-view");
  const detailView = document.getElementById("history-detail");
  const closeDetail = document.getElementById("close-detail");
  const pageTitle = document.getElementById("history-page-title");
  const pageMeta = document.getElementById("history-page-meta");
  const list = document.getElementById("history-list");
  const pager = document.getElementById("week-pager");
  const pageParam = Number(params.get("week") || "0");
  let weekOffset = Number.isFinite(pageParam) && pageParam >= 0 ? pageParam : 0;
  const session = Store.getAuth();

  function visibleHistory() {
    const session = Store.getAuth();
    return Store.getHistory().flatMap((entry) => {
      if (session?.role !== "department" || !session.department) return [entry];
      const department = Store.normalizeTargetName(session.department);
      const items = (entry.items || []).filter((item) => Store.normalizeTargetName(item.target) === department);
      return items.length ? [{ ...entry, items }] : [];
    });
  }

  function dateOnly(value) {
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatDate(date) {
    return date.toISOString().slice(0, 10);
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

  function weekRange(offset) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = today.getDay();
    const daysSinceTuesday = (day + 5) % 7;
    const start = new Date(today);
    start.setDate(today.getDate() - daysSinceTuesday - offset * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 5);
    return { start, end };
  }

  function inRange(entry, range) {
    const date = dateOnly(entry.date);
    return date && date >= range.start && date <= range.end;
  }

  function pageHasItems(offset) {
    const range = weekRange(offset);
    return visibleHistory().some((entry) => inRange(entry, range));
  }

  function renderPager() {
    const startSlot = Math.max(0, weekOffset - 2);
    const slots = Array.from({ length: 5 }, (_, index) => startSlot + index);
    pager.innerHTML = `
      <button type="button" data-week-jump="${Math.max(0, weekOffset - 1)}">&lt;</button>
      ${slots.map((offset) => pageHasItems(offset)
        ? `<button type="button" class="${offset === weekOffset ? "is-active" : ""}" data-week-jump="${offset}">${offset + 1}</button>`
        : `<span>.</span>`
      ).join("")}
      <button type="button" data-week-jump="${weekOffset + 1}">&gt;</button>
    `;
    pager.querySelectorAll("[data-week-jump]").forEach((button) => {
      button.addEventListener("click", () => {
        weekOffset = Number(button.dataset.weekJump || "0");
        renderList();
      });
    });
  }

  function renderList() {
    renderPager();
    const range = weekRange(weekOffset);
    const entries = visibleHistory()
      .filter((entry) => inRange(entry, range))
      .sort((a, b) => `${b.date} ${b.time || ""}`.localeCompare(`${a.date} ${a.time || ""}`));
    if (!entries.length) {
      list.innerHTML = `<div class="list-card muted">${I18n.t("noHistory")}</div>`;
      return;
    }
    list.innerHTML = `
      <div class="history-week-range">${formatDate(range.start)} - ${formatDate(range.end)}</div>
      <div class="history-table">
        ${entries.map((entry, index) => `
          <a class="history-row" href="history.html?id=${encodeURIComponent(entry.id)}&week=${weekOffset}">
            <span>${index + 1}</span>
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
    const order = ["카페테리아", "야채", "그로서리"];
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
    return item.target || "그로서리";
  }

  function categoryFor(item) {
    const target = targetFor(item);
    const category = item.category || item.section || "기타";
    if (target === "그로서리" && category === "식재료") return "분말";
    if (target === "그로서리" && Store.getRequestCategories("그로서리").includes(category)) return category;
    if (target === "그로서리") return "기타";
    if (target === "야채") return category || "야채";
    const cafeteriaSections = [...Store.getRequestCategories("카페테리아"), "기타"];
    if (cafeteriaSections.includes(category)) return category;
    return category || "기타";
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
    const categoryOrders = {
      "카페테리아": [...Store.getRequestCategories("카페테리아"), "기타"],
      "야채": Store.getRequestCategories("야채"),
      "그로서리": Store.getRequestCategories("그로서리")
    };
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
    weekView.classList.add("hidden");
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
    window.location.href = `history.html?week=${weekOffset}`;
  });

  if (detailId) renderDetail();
  else renderList();
  I18n.applyI18n();
})();
