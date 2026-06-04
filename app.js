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
    title.textContent = I18n.t("lastRequest");
    subtitle.textContent = entry ? `${entry.date} ${entry.time || ""}` : "";
    if (!entry) {
      list.innerHTML = `<div class="list-card muted">${I18n.t("noHistory")}</div>`;
      return;
    }
    const isDepartment = session?.role === "department";
    const targetOrder = ["카페테리아", "야채", "그로서리"];
    const categoryOrders = {
      "카페테리아": ["반조리", "소스", "반찬", "냉장", "냉동", "기타"],
      "야채": ["야채"],
      "그로서리": ["상온", "냉장", "냉동", "기타"]
    };
    const targetGroups = (entry.items || []).reduce((acc, item) => {
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
      </article>
    `;
    list.querySelectorAll("[data-receive]").forEach((input) => {
      input.addEventListener("change", () => {
        const itemId = input.dataset.receive;
        Store.replaceHistory(Store.getHistory().map((historyEntry) => {
          if (historyEntry.id !== entry.id) return historyEntry;
          return {
            ...historyEntry,
            items: (historyEntry.items || []).map((item) =>
              item.id === itemId ? { ...item, received: input.checked } : item
            )
          };
        }));
      });
    });
  }

  renderLatest(latestEntry());
  I18n.applyI18n();
})();
