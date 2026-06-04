(async function () {
  await Store.init();
  AppUI.renderSidebar("home");
  AppUI.registerServiceWorker();

  const title = document.querySelector("[data-home-title]");
  const subtitle = document.querySelector("[data-home-subtitle]");
  const list = document.getElementById("home-request-list");
  const status = document.getElementById("home-status");
  const session = Store.getAuth();

  function sectionFor(item) {
    if (item.section) return item.section;
    const matched = Store.getIngredients().find((ingredient) => ingredient.id === item.id || ingredient.name === item.name);
    return matched?.section || "기타";
  }

  function relevantEntries() {
    const history = Store.getHistory();
    if (session?.role === "department" && session.department) {
      return history.flatMap((entry) => {
        const items = (entry.items || []).filter((item) => item.target === session.department);
        return items.length ? [{ ...entry, items }] : [];
      });
    }
    return history;
  }

  function itemLine(item, canReceive) {
    return `
      <label class="receive-row">
        <input type="checkbox" data-receive="${item.__entryId}|${item.__index}" ${item.received ? "checked" : ""} ${canReceive ? "" : "disabled"} />
        <span class="receive-row-main">
          <strong>${I18n.itemName(item)}</strong>
          <span>${[item.quantity, item.unit, I18n.targetLabel(item.target || "")].filter(Boolean).join(" · ")}</span>
        </span>
      </label>
    `;
  }

  function departmentView(entries) {
    title.textContent = I18n.t("receivedRequests");
    subtitle.textContent = session?.department ? I18n.targetLabel(session.department) : "";
    if (!entries.length) {
      list.innerHTML = `<div class="list-card muted">${I18n.t("noDepartmentRequests")}</div>`;
      return;
    }
    list.innerHTML = entries.slice(0, 12).map((entry) => `
      <article class="list-card">
        <div class="list-card-header">
          <strong>${entry.date} ${entry.time || ""}</strong>
          <a class="ghost-button compact-button" href="history.html?id=${encodeURIComponent(entry.id)}">${I18n.t("detail")}</a>
        </div>
        <div class="receive-list admin-section">
          ${(entry.items || []).map((item, index) => itemLine({ ...item, __entryId: entry.id, __index: index }, false)).join("")}
        </div>
        ${entry.memo ? `<p class="muted">${entry.memo}</p>` : ""}
      </article>
    `).join("");
  }

  function receiptView(entries) {
    title.textContent = I18n.t("receiptStatus");
    subtitle.textContent = I18n.t("restaurantReceiptStatus");
    if (!entries.length) {
      list.innerHTML = `<div class="list-card muted">${I18n.t("noHistory")}</div>`;
      return;
    }
    list.innerHTML = entries.slice(0, 10).map((entry) => {
      const items = (entry.items || []).map((item, index) => ({ ...item, __entryId: entry.id, __index: index }));
      const received = items.filter((item) => item.received).length;
      return `
        <article class="list-card">
          <div class="list-card-header">
            <div>
              <strong>${entry.date} ${entry.time || ""}</strong>
              <div class="item-meta">${received}/${items.length} ${I18n.t("receivedCount")}</div>
            </div>
            <a class="ghost-button compact-button" href="history.html?id=${encodeURIComponent(entry.id)}">${I18n.t("detail")}</a>
          </div>
          <div class="receive-list admin-section">
            ${items.map((item) => itemLine(item, true)).join("")}
          </div>
        </article>
      `;
    }).join("");
    list.querySelectorAll("[data-receive]").forEach((input) => {
      input.addEventListener("change", () => {
        const [entryId, indexText] = input.dataset.receive.split("|");
        const history = Store.getHistory();
        const next = history.map((entry) => {
          if (entry.id !== entryId) return entry;
          const items = (entry.items || []).map((item, index) =>
            index === Number(indexText) ? { ...item, received: input.checked } : item
          );
          return { ...entry, items };
        });
        Store.replaceHistory(next);
        status.textContent = I18n.t("receivedSaved");
        setTimeout(() => (status.textContent = ""), 1800);
      });
    });
  }

  const entries = relevantEntries();
  if (session?.role === "department") departmentView(entries);
  else receiptView(entries);
  I18n.applyI18n();
})();
