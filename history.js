(async function () {
  await Store.init();
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
      const items = (entry.items || []).filter((item) => item.target === session.department);
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
      <button type="button" data-week-jump="0">&lt;&lt;</button>
      <button type="button" data-week-jump="${Math.max(0, weekOffset - 1)}">&lt;</button>
      ${slots.map((offset) => pageHasItems(offset)
        ? `<button type="button" class="${offset === weekOffset ? "is-active" : ""}" data-week-jump="${offset}">${offset + 1}</button>`
        : `<span>.</span>`
      ).join("")}
      <button type="button" data-week-jump="${weekOffset + 1}">&gt;</button>
      <button type="button" data-week-jump="${weekOffset + 4}">&gt;&gt;</button>
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
            <strong>${entry.date}</strong>
            <span class="history-arrow">&gt;</span>
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

  function checkCell(item, field) {
    const checked = item[field] ? "checked" : "";
    const disabled = session?.role === "admin" ? "" : "disabled";
    return `<input type="checkbox" data-detail-check="${item.id}|${field}" ${checked} ${disabled} />`;
  }

  function renderDetailGroups(entry) {
    return groupItemsByTarget(entry.items || []).map(([target, items]) => `
      <section class="history-detail-card">
        <h2>${I18n.targetLabel(target)}</h2>
        <div class="history-detail-grid history-detail-head">
          <span>${I18n.t("items")}</span>
          <span>출고 확인</span>
          <span>입고 확인</span>
        </div>
        ${items.map((item) => `
          <div class="history-detail-grid history-detail-row">
            <strong>${I18n.itemName(item)}</strong>
            <span>${checkCell(item, "received")}</span>
            <span>${checkCell(item, "restaurantReceived")}</span>
          </div>
        `).join("")}
      </section>
    `).join("");
  }

  function bindDetailChecks(entry) {
    detailView.querySelectorAll("[data-detail-check]").forEach((input) => {
      input.addEventListener("change", () => {
        if (session?.role !== "admin") return;
        const [itemId, field] = input.dataset.detailCheck.split("|");
        const nextEntry = {
          ...entry,
          items: (entry.items || []).map((item) =>
            item.id === itemId ? { ...item, [field]: input.checked } : item
          )
        };
        Store.saveHistoryEntry(nextEntry);
        entry.items = nextEntry.items;
        alert("수정되었습니다.");
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
    pageTitle.textContent = "상세 내역";
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
