(async function () {
  await Store.init();
  const startPath = Store.startPath();
  if (Store.getAuth()?.role === "department" && startPath !== "index.html") {
    window.location.href = startPath;
    return;
  }
  AppUI.renderSidebar("home");
  AppUI.registerServiceWorker();

  const lastOrderDate = document.getElementById("last-order-date");
  const lastOrderList = document.getElementById("last-order-list");

  function sampleLastOrder() {
    return {
      id: "sample-last-order",
      date: Store.today(),
      time: "09:20",
      mode: "simple",
      employee: "",
      memo: "오전 준비용 샘플",
      isSample: true,
      items: [
        { name: "돈까스", section: "반조리", target: "카페테리아", quantity: "20", unit: "개" },
        { name: "만두", section: "반조리", target: "카페테리아", quantity: "3", unit: "봉" },
        { name: "양파", section: "야채", target: "야채", quantity: "1", unit: "kg" },
        { name: "감자", section: "야채", target: "야채", quantity: "2", unit: "박스" },
        { name: "대파", section: "야채", target: "야채", quantity: "4", unit: "단" },
        { name: "김치", section: "반찬", target: "카페테리아", quantity: "5", unit: "kg" },
        { name: "단무지", section: "반찬", target: "카페테리아", quantity: "2", unit: "팩" },
        { name: "식용유", section: "소스", target: "카페테리아", quantity: "1", unit: "통" },
        { name: "간장", section: "소스", target: "카페테리아", quantity: "2", unit: "병" },
        { name: "계란", section: "냉장", target: "카페테리아", quantity: "1", unit: "판" },
        { name: "밀가루", section: "식재료", target: "그로서리", quantity: "3", unit: "kg" },
        { name: "우유", section: "냉장", target: "카페테리아", quantity: "2", unit: "L" },
        { name: "치즈", section: "냉장", target: "카페테리아", quantity: "2", unit: "팩" },
        { name: "냉동만두", section: "냉동", target: "카페테리아", quantity: "4", unit: "봉" },
        { name: "냉동감자", section: "냉동", target: "그로서리", quantity: "3", unit: "봉" },
        { name: "기타요청", section: "기타", target: "그로서리", quantity: "1", unit: "개" }
      ]
    };
  }

  function sectionFor(item) {
    if (item.section) return item.section;
    const matched = Store.getIngredients().find((ingredient) => ingredient.name === item.name);
    return matched ? matched.section : "기타";
  }

  function renderLastOrder() {
    const history = Store.getHistory();
    const latest = history[0]?.id === "sample-last-order" ? sampleLastOrder() : history[0] || sampleLastOrder();
    const simple = latest.mode === "simple";
    const role = Store.getAuth()?.role;
    const department = Store.getAuth()?.department;
    const canSaveReceived = role === "restaurant" || role === "admin";
    const visibleItems = role === "department" && department
      ? latest.items.filter((item) => item.target === department)
      : latest.items;
    const sections = Store.getSections().filter((section) =>
      visibleItems.some((item) => sectionFor(item) === section)
    );
    lastOrderDate.textContent = latest.date || "";

    const groups = visibleItems.reduce((acc, item) => {
      const section = sectionFor(item);
      acc[section] = acc[section] || [];
      acc[section].push(item);
      return acc;
    }, {});
    const orderedItems = sections.flatMap((section) => groups[section].map((item) => ({ ...item, displaySection: section })));

    lastOrderList.innerHTML = `
      <div class="receive-scroll">
        ${sections.map((section) => `
          <section class="receive-section">
            <h3>${I18n.sectionLabel(section)}</h3>
            <div class="receive-list">
              ${groups[section].map((item) => {
                const index = orderedItems.findIndex((candidate) => candidate.name === item.name && candidate.displaySection === section);
                return `
                  <label class="receive-row">
                    <input type="checkbox" data-receive-index="${index}" ${item.received ? "checked" : ""} ${canSaveReceived ? "" : "disabled"} />
                    <span class="receive-row-main">
                      <strong>${item.name}</strong>
                      ${simple ? "" : `<span>${[item.quantity, item.unit].filter(Boolean).join(" ")} · ${I18n.targetLabel(item.target || "")}</span>`}
                    </span>
                  </label>
                `;
              }).join("")}
            </div>
          </section>
        `).join("")}
      </div>
      ${canSaveReceived ? `<button id="save-received" class="button" type="button">${I18n.t("saveReceived")}</button>` : ""}
      <p id="received-status" class="status"></p>
    `;
    document.getElementById("save-received")?.addEventListener("click", () => {
      const checkedKeys = new Set(
        Array.from(lastOrderList.querySelectorAll("[data-receive-index]:checked")).map((input) => {
          const item = orderedItems[Number(input.dataset.receiveIndex)];
          return `${item.displaySection}|${item.name}`;
        })
      );
      const updated = {
        ...latest,
        isSample: false,
        items: latest.items.map((item) =>
          ({ ...item, received: checkedKeys.has(`${sectionFor(item)}|${item.name}`) })
        )
      };
      Store.saveHistoryEntry(updated);
      document.getElementById("received-status").textContent = I18n.t("receivedSaved");
      setTimeout(renderLastOrder, 600);
    });
    I18n.applyI18n();
  }

  renderLastOrder();
  I18n.applyI18n();
})();
