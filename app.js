(async function () {
  await Store.init({ datasets: ["settings", "history"] });
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
    if (entry.memoOnly) return entry;
    if (session?.role === "department" && session.department) {
      const department = Store.normalizeTargetName(session.department);
      const items = (entry.items || []).filter((item) => Store.normalizeTargetName(item.target) === department);
      return items.length ? { ...entry, items } : null;
    }
    return entry;
  }

  function latestStandaloneMemoEntry() {
    const memos = orderedMemos(Store.getStandaloneMemos ? Store.getStandaloneMemos() : []);
    if (!memos.length) return null;
    const latest = memos.slice().sort((a, b) =>
      String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || ""))
    )[0];
    const stamp = latest?.updatedAt || latest?.createdAt || new Date().toISOString();
    return {
      id: "standalone-memos",
      date: stamp.slice(0, 10),
      time: stamp.slice(11, 16),
      mode: "memo",
      employee: "",
      target: "",
      items: [],
      memos,
      memo: memoText(memos),
      message: "",
      memoOnly: true
    };
  }

  function latestEntry() {
    const latestHistory = Store.getHistory()
      .map(visibleEntry)
      .filter(Boolean)
      .sort((a, b) => `${b.date} ${b.time || ""}`.localeCompare(`${a.date} ${a.time || ""}`))[0] || null;
    const memoEntry = visibleEntry(latestStandaloneMemoEntry());
    if (!latestHistory) return memoEntry;
    if (!memoEntry) return latestHistory;
    return `${memoEntry.date} ${memoEntry.time || ""}`.localeCompare(`${latestHistory.date} ${latestHistory.time || ""}`) >= 0
      ? memoEntry
      : latestHistory;
  }

  function categoryValue(item) {
    return item.category || item.section || "기타";
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

  function normalizedLabel(value) {
    return Store.normalizeTargetName(value);
  }

  function memoSlot(memo) {
    const author = normalizedLabel(memo.authorLabel);
    const department = normalizedLabel(memo.department);
    if (memo.role === "admin" || author === "관리자") return "admin";
    if (memo.role === "restaurant" || author === "레스토랑") return "restaurant";
    if (department === "카페테리아" || author === "카페테리아") return "cafeteria";
    if (department === "야채" || author === "야채") return "vegetable";
    if (department === "그로서리" || author === "그로서리") return "grocery";
    return "other";
  }

  function sessionMemoSlot() {
    if (session?.role === "admin") return "admin";
    if (session?.role === "restaurant") return "restaurant";
    const department = normalizedLabel(session?.department || session?.label);
    if (department === "카페테리아") return "cafeteria";
    if (department === "야채") return "vegetable";
    if (department === "그로서리") return "grocery";
    return "other";
  }

  function memoSlotInfo(slot) {
    return {
      admin: { role: "admin", department: "", label: "관리자" },
      restaurant: { role: "restaurant", department: "", label: "레스토랑" },
      cafeteria: { role: "department", department: "카페테리아", label: "카페테리아" },
      vegetable: { role: "department", department: "야채", label: "야채" },
      grocery: { role: "department", department: "그로서리", label: "그로서리" }
    }[slot] || { role: session?.role || "", department: session?.department || "", label: session?.label || "" };
  }

  function memoSlots() {
    return ["admin", "restaurant", "cafeteria", "vegetable", "grocery"];
  }

  function orderedMemos(memos) {
    const slotOrder = { admin: 0, restaurant: 1, cafeteria: 2, vegetable: 3, grocery: 4, other: 5 };
    return (Array.isArray(memos) ? memos : [])
      .filter((memo) => memo && String(memo.text || "").trim())
      .slice()
      .sort((a, b) => {
        const slotDiff = (slotOrder[memoSlot(a)] ?? 99) - (slotOrder[memoSlot(b)] ?? 99);
        if (slotDiff) return slotDiff;
        return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
      });
  }

  function currentMemo(memos) {
    const slot = sessionMemoSlot();
    return memos
      .filter((memo) => memoSlot(memo) === slot)
      .sort((a, b) =>
        String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || ""))
      )[0] || null;
  }

  function memoEntry(text, existingMemo = null) {
    const trimmed = text.trim();
    if (!trimmed) return null;
    const slotInfo = memoSlotInfo(sessionMemoSlot());
    return {
      id: existingMemo?.id || Store.id("memo"),
      role: slotInfo.role,
      department: slotInfo.department,
      authorLabel: slotInfo.label,
      text: trimmed,
      createdAt: existingMemo?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
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
    const category = categoryValue(item);
    if (target === "그로서리" && category === "식재료") return "상온";
    if (target === "그로서리" && Store.getRequestCategories("그로서리").includes(category)) return category;
    if (target === "그로서리") return "기타";
    if (target === "야채") return category || "야채";
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

  function renderRows(items) {
    const showRestaurantReceive = session?.role === "restaurant";
    return `
      <div class="item-section-list">
        ${items.map((item) => `
          <label class="receive-row ${showRestaurantReceive ? "has-restaurant-receive" : ""}">
            <input type="checkbox" data-receive="${item.id}" ${item.received ? "checked" : ""} ${showRestaurantReceive ? "disabled" : ""} />
            <span class="receive-row-main">
              <strong>${I18n.itemName(item)}</strong>
            </span>
            ${showRestaurantReceive ? `<input class="restaurant-receive-check" type="checkbox" data-restaurant-receive="${item.id}" ${item.restaurantReceived ? "checked" : ""} aria-label="${I18n.itemName(item)} 입고 확인" />` : ""}
          </label>
        `).join("")}
      </div>
    `;
  }

  function renderMemoPanel(entry) {
    const allMemos = orderedMemos(Array.isArray(entry.memos) ? entry.memos : []);
    const currentSlot = sessionMemoSlot();
    const current = currentMemo(allMemos);
    const memoBySlot = allMemos.reduce((acc, memo) => {
      const slot = memoSlot(memo);
      if (!acc.has(slot)) acc.set(slot, memo);
      return acc;
    }, new Map());
    const readonlySlots = memoSlots().filter((slot) => slot !== currentSlot);
    return `
      <section class="memo-panel home-memo-panel admin-section">
        <h3>${I18n.t("readonlyMemoTitle")} <span>${I18n.t("readOnly")}</span></h3>
        <div class="memo-log">
          ${readonlySlots.map((slot) => {
            const memo = memoBySlot.get(slot);
            const label = memo ? memoLabel(memo) : memoSlotInfo(slot).label;
            return `
            <article class="memo-entry">
              <div class="memo-entry-meta">
                <strong>${I18n.roleLabel(label)}</strong>
                <span>${memo?.createdAt ? new Date(memo.createdAt).toLocaleString(I18n.lang() === "en" ? "en-CA" : "ko-KR") : ""}</span>
              </div>
              <p class="${memo ? "" : "memo-placeholder"}">${memo?.text || I18n.t("memoNone")}</p>
            </article>
          `;
          }).join("")}
        </div>
        <label class="field">
          <span>${I18n.t("addMemo")}</span>
          <textarea id="home-memo" placeholder="${current?.text ? I18n.t("memoPlaceholder") : I18n.t("memoNone")}">${current?.text || ""}</textarea>
        </label>
        <div class="button-row home-action-row">
          <button class="button" id="home-save" type="button">${I18n.t("save")}</button>
          <button class="danger-button" id="home-reset" type="button">${I18n.t("reset")}</button>
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
    if (entry.memoOnly || !draftItems.length) {
      list.innerHTML = renderMemoPanel(entry);
      document.getElementById("home-save")?.addEventListener("click", saveCurrent);
      document.getElementById("home-reset")?.addEventListener("click", resetDraft);
      I18n.applyI18n();
      return;
    }
    const isDepartment = session?.role === "department";
    const targetOrder = ["카페테리아", "야채", "그로서리"];
    const categoryOrders = {
      "카페테리아": [...Store.getRequestCategories("카페테리아"), "기타"],
      "야채": Store.getRequestCategories("야채"),
      "그로서리": Store.getRequestCategories("그로서리")
    };
    const targetGroups = draftItems.reduce((acc, item) => {
      const target = isDepartment ? (session.department || targetFor(item)) : targetFor(item);
      const category = categoryFor(item);
      acc[target] = acc[target] || {};
      acc[target][category] = acc[target][category] || [];
      acc[target][category].push(item);
      return acc;
    }, {});
    const targets = isDepartment ? Object.keys(targetGroups) : orderedKeys(targetGroups, targetOrder);
    list.innerHTML = `
      ${targets.map((target) => {
        const categoryGroups = targetGroups[target];
        const categories = orderedKeys(categoryGroups, categoryOrders[target] || categoryOrders["카페테리아"]);
        return `
          <section class="department-group home-target-group">
            <h2>${I18n.targetLabel(target)}</h2>
            <hr class="section-divider department-divider" />
            <div class="department-card home-target-section">
              ${categories.map((category) => renderCategorySection(category, categoryGroups[category])).join("")}
            </div>
          </section>
        `;
      }).join("")}
      ${renderMemoPanel(entry)}
    `;
    list.querySelectorAll("[data-receive]").forEach((input) => {
      input.addEventListener("change", () => {
        const itemId = input.dataset.receive;
        draftItems = draftItems.map((item) =>
          item.id === itemId ? { ...item, received: input.checked } : item
        );
      });
    });
    list.querySelectorAll("[data-restaurant-receive]").forEach((input) => {
      input.addEventListener("change", () => {
        const itemId = input.dataset.restaurantReceive;
        draftItems = draftItems.map((item) =>
          item.id === itemId ? { ...item, restaurantReceived: input.checked } : item
        );
      });
    });
    document.getElementById("home-save")?.addEventListener("click", saveCurrent);
    document.getElementById("home-reset")?.addEventListener("click", resetDraft);
    I18n.applyI18n();
  }

  function buildEntry() {
    if (!currentEntry) return null;
    if (currentEntry.memoOnly) {
      const baseMemos = orderedMemos(Store.getStandaloneMemos ? Store.getStandaloneMemos() : currentEntry.memos);
      const existingMemo = baseMemos.find((memo) => memoSlot(memo) === sessionMemoSlot());
      const memo = memoEntry(document.getElementById("home-memo")?.value || "", existingMemo);
      if (!memo) return null;
      return { ...currentEntry, memos: [memo], memo: memo.text, memoOnly: true };
    }
    const baseEntry = Store.getHistory().find((entry) => entry.id === currentEntry.id) || currentEntry;
    const draftById = new Map(draftItems.map((item) => [item.id, item]));
    const currentSlot = sessionMemoSlot();
    const baseMemos = orderedMemos(Array.isArray(baseEntry.memos) ? baseEntry.memos : []);
    const existingMemo = baseMemos.find((memo) => memoSlot(memo) === currentSlot);
    const memo = memoEntry(document.getElementById("home-memo")?.value || "", existingMemo);
    const memos = [
      ...baseMemos.filter((row) => memoSlot(row) !== currentSlot),
      ...(memo ? [memo] : [])
    ];
    const entry = {
      ...baseEntry,
      items: (baseEntry.items || []).map((item) => {
        const draft = draftById.get(item.id);
        return draft ? { ...item, ...draft } : item;
      }),
      memos,
      memo: memoText(memos)
    };
    return entry;
  }

  function refreshFrom(entry) {
    renderLatest(visibleEntry(entry));
    setStatus(I18n.t("saved"));
  }

  async function saveCurrent() {
    const entry = buildEntry();
    if (!entry) {
      setStatus(I18n.t("chooseItemOrMemo"));
      return;
    }
    const result = entry.memoOnly ? await Store.saveStandaloneMemo(entry.memos[0]) : await Store.saveHistoryEntry(entry);
    if (result?.ok === false) {
      setStatus(result.error || I18n.t("csvImportInvalid"));
      return;
    }
    refreshFrom(entry.memoOnly ? latestStandaloneMemoEntry() : entry);
  }

  function resetDraft() {
    draftItems = draftItems.map((item) =>
      session?.role === "restaurant"
        ? { ...item, restaurantReceived: false }
        : { ...item, received: false }
    );
    const memo = document.getElementById("home-memo");
    if (memo) memo.value = "";
    if (session?.role !== "restaurant") {
      list.querySelectorAll("[data-receive]").forEach((input) => {
        input.checked = false;
      });
    }
    list.querySelectorAll("[data-restaurant-receive]").forEach((input) => {
      input.checked = false;
    });
    setStatus(I18n.t("resetDone"));
  }

  async function refreshLatestFromDb() {
    await Store.refreshHistory();
    renderLatest(latestEntry());
  }

  window.addEventListener("focus", refreshLatestFromDb);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshLatestFromDb();
  });

  renderLatest(latestEntry());
  I18n.applyI18n();
})();
