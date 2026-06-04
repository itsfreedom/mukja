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
        ${sections.map((section) => `
          <section class="item-section home-request-section">
            <h3>${I18n.sectionLabel(section)}</h3>
            <hr class="section-divider" />
            <div class="item-section-list">
              ${groups[section].map((item, index) => `
                <label class="receive-row">
                  <input type="checkbox" data-receive="${entry.id}|${section}|${index}" ${item.received ? "checked" : ""} />
                  <span class="receive-row-main">
                    <strong>${I18n.itemName(item)}</strong>
                  </span>
                </label>
              `).join("")}
            </div>
          </section>
        `).join("")}
      </article>
    `;
    list.querySelectorAll("[data-receive]").forEach((input) => {
      input.addEventListener("change", () => {
        const [, section, indexText] = input.dataset.receive.split("|");
        const targetItems = groups[section] || [];
        const changed = targetItems[Number(indexText)];
        if (!changed) return;
        Store.replaceHistory(Store.getHistory().map((historyEntry) => {
          if (historyEntry.id !== entry.id) return historyEntry;
          return {
            ...historyEntry,
            items: (historyEntry.items || []).map((item) =>
              item.id === changed.id ? { ...item, received: input.checked } : item
            )
          };
        }));
      });
    });
  }

  renderLatest(latestEntry());
  I18n.applyI18n();
})();
