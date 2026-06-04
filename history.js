(async function () {
  await Store.init();
  AppUI.renderSidebar("history");
  AppUI.registerServiceWorker();

  const list = document.getElementById("history-list");
  const dateFilter = document.getElementById("date-filter");

  function rows() {
    const date = dateFilter.value;
    const session = Store.getAuth();
    return Store.getHistory().flatMap((entry) => {
      if (date && entry.date !== date) return [];
      if (session?.role !== "department" || !session.department) return [entry];
      const items = entry.items.filter((item) => item.target === session.department);
      return items.length ? [{ ...entry, items }] : [];
    });
  }

  function canManageHistory() {
    const role = Store.getAuth()?.role;
    return role === "restaurant" || role === "admin";
  }

  function render() {
    const history = rows();
    if (!history.length) {
      list.innerHTML = `<div class="panel muted">${I18n.t("noHistory")}</div>`;
      return;
    }
    const grouped = history.reduce((acc, entry) => {
      acc[entry.date] = acc[entry.date] || [];
      acc[entry.date].push(entry);
      return acc;
    }, {});
    list.innerHTML = Object.entries(grouped).map(([date, entries]) => `
      <section class="panel">
        <div class="list-card-header">
          <h2>${date}</h2>
          <span class="badge">${entries.length}</span>
        </div>
        <div class="list admin-section">
          ${entries.map((entry) => `
            <article class="list-card">
              <div class="list-card-header">
                <div>
                  <strong>${entry.time} · ${entry.mode === "simple" ? I18n.t("simpleMode") : I18n.t("normalMode")}</strong>
                  ${entry.mode === "simple" ? "" : `<div class="item-meta">${entry.employee || "-"} · ${entry.items.map((item) => I18n.targetLabel(item.target)).filter(Boolean).join(", ")}</div>`}
                </div>
                ${canManageHistory() ? `<button class="danger-button" data-delete="${entry.id}" type="button">${I18n.t("delete")}</button>` : ""}
              </div>
              ${entry.mode === "simple" ? `
                <div class="simple-history-list admin-section">
                  ${entry.items.map((item) => `<div>${item.name}</div>`).join("")}
                </div>
              ` : `
                <div class="table-wrap admin-section">
                  <table>
                    <thead><tr><th>${I18n.t("items")}</th><th>${I18n.t("quantity")}</th><th>${I18n.t("unit")}</th><th>${I18n.t("target")}</th></tr></thead>
                    <tbody>
                      ${entry.items.map((item) => `<tr><td>${item.name}</td><td>${item.quantity || ""}</td><td>${item.unit || ""}</td><td>${I18n.targetLabel(item.target || "")}</td></tr>`).join("")}
                    </tbody>
                  </table>
                </div>
              `}
              <p class="muted">${I18n.t("memo")}: ${entry.memo || "-"}</p>
              <pre class="preview-box">${entry.message || ""}</pre>
            </article>
          `).join("")}
        </div>
      </section>
    `).join("");
    list.querySelectorAll("[data-delete]").forEach((button) => {
      button.addEventListener("click", () => {
        Store.deleteHistory(button.dataset.delete);
        render();
      });
    });
  }

  dateFilter.addEventListener("change", render);
  document.getElementById("clear-all").classList.toggle("hidden", !canManageHistory());
  document.getElementById("download-date").addEventListener("click", () => {
    const date = dateFilter.value || Store.today();
    const selected = rows().filter((entry) => entry.date === date);
    Store.downloadText(`ingredient-request-${date}.csv`, Store.historyToCsv(selected), "text/csv;charset=utf-8");
  });
  document.getElementById("download-all").addEventListener("click", () => {
    Store.downloadText("ingredient-request-all.csv", Store.historyToCsv(rows()), "text/csv;charset=utf-8");
  });
  document.getElementById("clear-all").addEventListener("click", () => {
    if (!canManageHistory()) return;
    if (confirm(I18n.t("confirmClear"))) {
      Store.clearHistory();
      render();
    }
  });

  render();
  I18n.applyI18n();
})();
