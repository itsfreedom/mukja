(async function () {
  await Store.init();
  localStorage.setItem("restaurant_sidebar_collapsed", "0");
  AppUI.renderSidebar("history");
  AppUI.registerServiceWorker();

  const params = new URLSearchParams(window.location.search);
  const detailId = params.get("id") || "";
  const weekView = document.getElementById("history-week-view");
  const detailView = document.getElementById("history-detail");
  const closeDetail = document.getElementById("close-detail");
  const list = document.getElementById("history-list");
  const pager = document.getElementById("week-pager");
  const pageParam = Number(params.get("week") || "0");
  let weekOffset = Number.isFinite(pageParam) && pageParam >= 0 ? pageParam : 0;

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
            <strong>${entry.date} ${entry.time || ""}</strong>
            <span class="history-arrow">&gt;</span>
          </a>
        `).join("")}
      </div>
    `;
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
    detailView.innerHTML = `
      <article class="list-card">
        <div class="list-card-header">
          <div>
            <h2>${entry.date} ${entry.time || ""}</h2>
            <div class="item-meta">${entry.mode === "simple" ? I18n.t("simpleMode") : I18n.t("normalMode")}</div>
          </div>
          <span class="badge">${(entry.items || []).length}</span>
        </div>
        <div class="table-wrap admin-section">
          <table>
            <thead><tr><th>${I18n.t("items")}</th><th>${I18n.t("quantity")}</th><th>${I18n.t("unit")}</th><th>${I18n.t("target")}</th><th>${I18n.t("received")}</th></tr></thead>
            <tbody>
              ${(entry.items || []).map((item) => `
                <tr>
                  <td>${I18n.itemName(item)}</td>
                  <td>${item.quantity || ""}</td>
                  <td>${item.unit || ""}</td>
                  <td>${I18n.targetLabel(item.target || "")}</td>
                  <td>${item.received ? "Y" : ""}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        <h3 class="admin-section">${I18n.t("memo")}</h3>
        <div class="memo-log">
          ${Array.isArray(entry.memos) && entry.memos.length
            ? entry.memos.map((memo) => `<article class="memo-entry"><strong>${memo.authorLabel || memo.department || memo.role || ""}</strong><p>${memo.text || ""}</p></article>`).join("")
            : `<p class="muted">${entry.memo || "-"}</p>`}
        </div>
      </article>
    `;
  }

  closeDetail.addEventListener("click", () => {
    window.location.href = `history.html?week=${weekOffset}`;
  });

  if (detailId) renderDetail();
  else renderList();
  I18n.applyI18n();
})();
