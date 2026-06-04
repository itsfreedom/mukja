(function () {
  const keys = {
    initialized: "restaurant_initialized",
    lang: "restaurant_lang",
    mode: "restaurant_mode",
    employees: "restaurant_employees",
    sections: "restaurant_sections",
    ingredients: "restaurant_ingredients",
    recipes: "restaurant_recipes",
    history: "restaurant_history",
    adminPassword: "restaurant_admin_password",
    adminAuthed: "restaurant_admin_authed"
  };

  const defaultSections = ["반조리", "반찬", "소스", "냉장", "냉동"];
  const defaultEmployees = [
    { id: "emp-1", name: "직원1", enabled: true },
    { id: "emp-2", name: "직원2", enabled: true }
  ];
  const defaultTargets = ["카페테리아", "야채", "그로서리"];
  const defaultIngredients = [
    { id: "item-donkatsu", name: "돈까스", section: "반조리", unit: "개", target: "카페테리아", enabled: true },
    { id: "item-mandu", name: "만두", section: "반조리", unit: "봉", target: "카페테리아", enabled: true },
    { id: "item-onion", name: "양파", section: "야채", unit: "kg", target: "야채", enabled: true },
    { id: "item-potato", name: "감자", section: "야채", unit: "박스", target: "야채", enabled: true },
    { id: "item-green-onion", name: "대파", section: "야채", unit: "단", target: "야채", enabled: true },
    { id: "item-kimchi", name: "김치", section: "반찬", unit: "kg", target: "카페테리아", enabled: true },
    { id: "item-danmuji", name: "단무지", section: "반찬", unit: "팩", target: "카페테리아", enabled: true },
    { id: "item-oil", name: "식용유", section: "소스", unit: "통", target: "카페테리아", enabled: true },
    { id: "item-soy-sauce", name: "간장", section: "소스", unit: "병", target: "카페테리아", enabled: true },
    { id: "item-eggs", name: "계란", section: "냉장", unit: "판", target: "카페테리아", enabled: true },
    { id: "item-flour", name: "밀가루", section: "식재료", unit: "kg", target: "그로서리", enabled: true },
    { id: "item-milk", name: "우유", section: "냉장", unit: "L", target: "카페테리아", enabled: true },
    { id: "item-cheese", name: "치즈", section: "냉장", unit: "팩", target: "카페테리아", enabled: true },
    { id: "item-frozen-mandu", name: "냉동만두", section: "냉동", unit: "봉", target: "카페테리아", enabled: true },
    { id: "item-frozen-potato", name: "냉동감자", section: "냉동", unit: "봉", target: "그로서리", enabled: true },
    { id: "item-other", name: "기타요청", section: "기타", unit: "개", target: "그로서리", enabled: true }
  ];
  const defaultRecipes = [
    recipe("김치볶음밥", "식재료", "남은 밥과 김치를 빠르게 볶는 점심 메뉴", "밥, 김치, 계란, 대파, 간장", "1. 대파를 볶아 향을 냅니다.\n2. 김치와 밥을 넣고 볶습니다.\n3. 간장으로 간을 맞추고 계란을 올립니다.", "김치 물기를 살짝 짜면 볶음이 깔끔합니다."),
    recipe("제육볶음", "반조리", "매콤한 돼지고기 볶음", "돼지고기, 양파, 대파, 고추장, 간장", "1. 양념을 섞어 고기를 재웁니다.\n2. 채소와 함께 센 불에 볶습니다.\n3. 마지막에 대파를 넣습니다.", "배식 전 한 번 더 데우면 윤기가 살아납니다."),
    recipe("된장찌개", "식재료", "기본 국물 메뉴", "된장, 감자, 양파, 두부, 대파", "1. 육수를 끓입니다.\n2. 된장을 풀고 감자와 양파를 넣습니다.\n3. 두부와 대파를 넣고 마무리합니다.", "간은 마지막에 조절합니다."),
    recipe("불고기", "반조리", "달콤짭짤한 고기 메뉴", "소고기, 양파, 간장, 설탕, 대파", "1. 고기를 양념에 재웁니다.\n2. 양파와 함께 볶습니다.\n3. 국물이 졸아들면 마무리합니다.", "너무 오래 볶으면 질겨질 수 있습니다."),
    recipe("샐러드", "야채", "가벼운 곁들임 메뉴", "양상추, 치즈, 소스, 계란", "1. 야채를 씻고 물기를 제거합니다.\n2. 재료를 먹기 좋게 담습니다.\n3. 소스를 따로 제공합니다.", "소스는 배식 직전에 넣습니다.")
  ];

  function recipe(name, section, description, ingredients, steps, notes) {
    return { id: id("recipe"), name, section, description, ingredients, steps, notes, imageUrl: "", enabled: true, updatedAt: today() };
  }

  function id(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function nowTime() {
    return new Date().toTimeString().slice(0, 5);
  }

  function getJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function setJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function normalizeTarget(item) {
    if (!item) return item;
    if (item.target === "마트") return { ...item, target: item.section === "야채" ? "야채" : "그로서리" };
    if (!defaultTargets.includes(item.target)) return { ...item, target: item.section === "야채" ? "야채" : "그로서리" };
    return item;
  }

  function normalizeSection(item) {
    if (!item) return item;
    if (["item-oil", "item-soy-sauce"].includes(item.id)) return { ...item, target: "카페테리아", section: "소스" };
    if (item.target !== "카페테리아") return item;
    if (item.section === "식재료") return { ...item, section: "냉장" };
    if (!defaultSections.includes(item.section)) return { ...item, section: "냉장" };
    return item;
  }

  function normalizeIngredient(item) {
    return normalizeSection(normalizeTarget(item));
  }

  function shouldResetSections(sections) {
    const oldSections = ["반조리", "야채", "반찬", "소스", "식재료", "냉장", "냉동", "기타"];
    return !Array.isArray(sections) || sections.length === 0 || oldSections.every((section) => sections.includes(section));
  }

  async function init() {
    if (!localStorage.getItem(keys.lang)) localStorage.setItem(keys.lang, "ko");
    if (!localStorage.getItem(keys.mode)) localStorage.setItem(keys.mode, "simple");
    if (!localStorage.getItem(keys.sections) || shouldResetSections(getJson(keys.sections, []))) setJson(keys.sections, defaultSections);
    if (!localStorage.getItem(keys.employees)) setJson(keys.employees, defaultEmployees);
    if (!localStorage.getItem(keys.recipes)) setJson(keys.recipes, defaultRecipes);
    if (!localStorage.getItem(keys.history)) setJson(keys.history, []);
    if (!localStorage.getItem(keys.ingredients)) {
      try {
        const response = await fetch("data/items.json", { cache: "no-store" });
        setJson(keys.ingredients, (await response.json()).map(normalizeIngredient));
      } catch {
        setJson(keys.ingredients, defaultIngredients);
      }
    } else {
      setJson(keys.ingredients, getJson(keys.ingredients, []).map(normalizeIngredient));
    }
    localStorage.setItem(keys.initialized, "true");
  }

  function csvEscape(value) {
    const text = String(value || "");
    return `"${text.replace(/"/g, '""')}"`;
  }

  function parseCsv(text) {
    const source = String(text || "").replace(/^\ufeff/, "");
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;
    for (let i = 0; i < source.length; i += 1) {
      const char = source[i];
      const next = source[i + 1];
      if (quoted) {
        if (char === '"' && next === '"') {
          cell += '"';
          i += 1;
        } else if (char === '"') {
          quoted = false;
        } else {
          cell += char;
        }
      } else if (char === '"') {
        quoted = true;
      } else if (char === ",") {
        row.push(cell);
        cell = "";
      } else if (char === "\n") {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
      } else if (char !== "\r") {
        cell += char;
      }
    }
    if (cell || row.length) {
      row.push(cell);
      rows.push(row);
    }
    return rows.filter((items) => items.some((item) => item.trim()));
  }

  function historyToCsv(rows) {
    const header = ["날짜", "시간", "모드", "요청자", "주문부서", "품목", "수량", "단위", "입고여부", "메모"];
    const lines = [header.map(csvEscape).join(",")];
    rows.forEach((entry) => {
      entry.items.forEach((item) => {
        lines.push([
          entry.date,
          entry.time,
          entry.mode,
          entry.employee || "",
          item.target || entry.target || "",
          item.name,
          item.quantity || "",
          item.unit || "",
          item.received ? "Y" : "",
          entry.memo || ""
        ].map(csvEscape).join(","));
      });
    });
    return `\ufeff${lines.join("\n")}`;
  }

  function recipesToCsv(rows) {
    const header = ["id", "name", "section", "description", "ingredients", "steps", "notes", "imageUrl", "enabled", "updatedAt"];
    const lines = [header.map(csvEscape).join(",")];
    rows.forEach((recipe) => {
      lines.push([
        recipe.id,
        recipe.name,
        recipe.section,
        recipe.description,
        recipe.ingredients,
        recipe.steps,
        recipe.notes,
        recipe.imageUrl,
        recipe.enabled ? "true" : "false",
        recipe.updatedAt
      ].map(csvEscape).join(","));
    });
    return `\ufeff${lines.join("\n")}`;
  }

  function headerMap(header) {
    return header.reduce((acc, name, index) => {
      acc[String(name || "").trim()] = index;
      return acc;
    }, {});
  }

  function field(row, map, names) {
    const key = names.find((name) => map[name] !== undefined);
    return key ? row[map[key]] || "" : "";
  }

  function historyFromCsv(text) {
    const rows = parseCsv(text);
    if (rows.length < 2) return [];
    const map = headerMap(rows[0]);
    const grouped = new Map();
    rows.slice(1).forEach((row) => {
      const date = field(row, map, ["날짜", "date", "Date"]);
      const time = field(row, map, ["시간", "time", "Time"]);
      const mode = field(row, map, ["모드", "mode", "Mode"]) || "simple";
      const employee = field(row, map, ["요청자", "requester", "employee", "Requester"]);
      const memo = field(row, map, ["메모", "memo", "Memo"]);
      const target = field(row, map, ["주문부서", "준비부서", "target", "Target"]);
      const name = field(row, map, ["품목", "item", "name", "Item"]);
      if (!date || !name) return;
      const key = [date, time, mode, employee, memo].join("|");
      if (!grouped.has(key)) {
        grouped.set(key, {
          id: id("history"),
          date,
          time: time || nowTime(),
          mode,
          employee,
          target: "",
          items: [],
          memo,
          message: ""
        });
      }
      grouped.get(key).items.push({
        id: id("csv-item"),
        name,
        target,
        quantity: field(row, map, ["수량", "quantity", "Quantity"]),
        unit: field(row, map, ["단위", "unit", "Unit"]),
        received: ["Y", "true", "1", "입고"].includes(field(row, map, ["입고여부", "received", "Received"])),
        section: "",
        enabled: true
      });
    });
    return Array.from(grouped.values());
  }

  function recipesFromCsv(text) {
    const rows = parseCsv(text);
    if (rows.length < 2) return [];
    const map = headerMap(rows[0]);
    return rows.slice(1).flatMap((row) => {
      const name = field(row, map, ["name", "이름", "Name"]);
      if (!name) return [];
      return [{
        id: field(row, map, ["id"]) || id("recipe"),
        name,
        section: field(row, map, ["section", "섹션", "Section"]) || "기타",
        description: field(row, map, ["description", "설명", "Description"]),
        ingredients: field(row, map, ["ingredients", "재료", "Ingredients"]),
        steps: field(row, map, ["steps", "조리 순서", "Steps"]),
        notes: field(row, map, ["notes", "메모", "Notes"]),
        imageUrl: field(row, map, ["imageUrl", "이미지 URL"]),
        enabled: field(row, map, ["enabled", "사용"]) !== "false",
        updatedAt: field(row, map, ["updatedAt", "수정일"]) || today()
      }];
    });
  }

  function downloadText(filename, text, type) {
    const blob = new Blob([text], { type: type || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportSettings() {
    return {
      mode: localStorage.getItem(keys.mode) || "simple",
      lang: localStorage.getItem(keys.lang) || "ko",
      employees: getJson(keys.employees, []),
      sections: getJson(keys.sections, []),
      ingredients: getJson(keys.ingredients, []),
      recipes: getJson(keys.recipes, []),
      history: getJson(keys.history, []),
      adminPassword: localStorage.getItem(keys.adminPassword) || ""
    };
  }

  function importSettings(data) {
    if (!data || typeof data !== "object" || !Array.isArray(data.sections) || !Array.isArray(data.ingredients)) {
      throw new Error("Invalid settings");
    }
    localStorage.setItem(keys.mode, data.mode || "simple");
    localStorage.setItem(keys.lang, data.lang || "ko");
    setJson(keys.employees, data.employees || []);
    setJson(keys.sections, data.sections || []);
    setJson(keys.ingredients, data.ingredients || []);
    setJson(keys.recipes, data.recipes || []);
    setJson(keys.history, data.history || []);
    if (data.adminPassword !== undefined) localStorage.setItem(keys.adminPassword, data.adminPassword);
  }

  window.Store = {
    keys,
    init,
    id,
    today,
    nowTime,
    getMode: () => localStorage.getItem(keys.mode) || "simple",
    setMode: (mode) => localStorage.setItem(keys.mode, mode),
    getEmployees: () => getJson(keys.employees, []),
    setEmployees: (v) => setJson(keys.employees, v),
    getSections: () => getJson(keys.sections, defaultSections),
    setSections: (v) => setJson(keys.sections, v),
    getTargets: () => defaultTargets.slice(),
    getIngredients: () => getJson(keys.ingredients, []),
    setIngredients: (v) => setJson(keys.ingredients, v),
    getRecipes: () => getJson(keys.recipes, []),
    setRecipes: (v) => setJson(keys.recipes, v),
    getHistory: () => getJson(keys.history, []),
    setHistory: (v) => setJson(keys.history, v),
    addHistory: (entry) => setJson(keys.history, [entry, ...getJson(keys.history, [])]),
    historyToCsv,
    historyFromCsv,
    recipesToCsv,
    recipesFromCsv,
    downloadText,
    exportSettings,
    importSettings
  };

  window.AppUI = {
    renderSidebar(active) {
      const sidebar = document.querySelector("[data-layout-sidebar]");
      if (!sidebar || !window.I18n) return;
      const nav = [
        ["home", "index.html", "⌂"],
        ["order", "order.html", "□"],
        ["recipes", "recipes.html", "☰"],
        ["history", "history.html", "◷"],
        ["admin", "admin.html", "⚙"]
      ];
      sidebar.innerHTML = `
        <div class="brand">
          <div class="brand-copy">
            <div class="brand-main-row">
              <img class="brand-mark" src="assets/mokja-logo.jpg" alt="" />
              <div class="brand-title">${I18n.t("appName")}</div>
              <button class="lang-toggle" data-lang-toggle type="button" aria-label="${I18n.t("language")}">${I18n.lang() === "ko" ? "🇺🇸" : "🇰🇷"}</button>
            </div>
          </div>
        </div>
        <nav class="nav">
          ${nav.map(([key, href, icon]) => `
            <a class="nav-link ${active === key ? "is-active" : ""}" href="${href}">
              <span class="nav-icon">${icon}</span><span>${I18n.t(key)}</span>
            </a>
          `).join("")}
        </nav>
        <div class="sidebar-footer">Static PWA · localStorage only<br />GitHub + Netlify ready</div>
      `;
      let clock = document.querySelector("[data-layout-clock]");
      if (!clock) {
        clock = document.createElement("div");
        clock.className = "layout-clock";
        clock.setAttribute("data-layout-clock", "");
        sidebar.insertAdjacentElement("afterend", clock);
      }
      const renderClock = () => {
        if (!clock) return;
        const locale = I18n.lang() === "en" ? "en-CA" : "ko-KR";
        const weekday = I18n.lang() === "en" ? "long" : "long";
        clock.textContent = new Intl.DateTimeFormat(locale, {
          year: "numeric",
          month: "long",
          day: "numeric",
          weekday,
          hour: "2-digit",
          minute: "2-digit"
        }).format(new Date());
      };
      renderClock();
      clearInterval(window.__restaurantClockTimer);
      window.__restaurantClockTimer = setInterval(renderClock, 30000);
      const langToggle = sidebar.querySelector("[data-lang-toggle]");
      if (langToggle) {
        langToggle.classList.toggle("is-en", I18n.lang() === "en");
        langToggle.addEventListener("click", () => {
          localStorage.setItem(keys.lang, I18n.lang() === "ko" ? "en" : "ko");
          window.location.reload();
        });
      }
      I18n.applyI18n();
    },
    registerServiceWorker() {
      if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
        navigator.serviceWorker.register("service-worker.js").catch(() => {});
      }
    }
  };
})();
