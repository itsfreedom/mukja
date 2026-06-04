(async function () {
  await Store.init();
  AppUI.renderSidebar("home");
  AppUI.registerServiceWorker();

  const title = document.querySelector("[data-home-title]");
  const subtitle = document.querySelector("[data-home-subtitle]");
  const list = document.getElementById("home-request-list");
  const session = Store.getAuth();

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

  function renderLatest(entry) {
    title.textContent = I18n.t("lastRequest");
    subtitle.textContent = entry ? `${entry.date} ${entry.time || ""}` : "";
    if (!entry) {
      list.innerHTML = `<div class="list-card muted">${I18n.t("noHistory")}</div>`;
      return;
    }
    const groups = (entry.items || []).reduce((acc, item) => {
      const section = sectionFor(item);
      acc[section] = acc[section] || [];
      acc[section].push(item);
      return acc;
    }, {});
    const sections = Object.keys(groups);
    list.innerHTML = `
      <article class="list-card">
        <div class="list-card-header">
          <strong>${entry.date} ${entry.time || ""}</strong>
          <a class="ghost-button compact-button" href="history.html?id=${encodeURIComponent(entry.id)}">${I18n.t("detail")}</a>
        </div>
        ${sections.map((section) => `
          <section class="item-section">
            <h3>${I18n.sectionLabel(section)}</h3>
            <div class="item-section-list">
              ${groups[section].map((item) => `
                <div class="receive-row">
                  <span class="receive-row-main">
                    <strong>${I18n.itemName(item)}</strong>
                    <span>${I18n.targetLabel(item.target || "")}</span>
                  </span>
                </div>
              `).join("")}
            </div>
          </section>
        `).join("")}
      </article>
    `;
  }

  renderLatest(latestEntry());
  I18n.applyI18n();
})();
