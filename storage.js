(function () {
  const keys = {
    initialized: "restaurant_initialized",
    lang: "restaurant_lang",
    mode: "restaurant_mode",
    employees: "restaurant_employees",
    sections: "restaurant_sections",
    ingredients: "restaurant_ingredients",
    recipes: "restaurant_recipes",
    menus: "restaurant_menus",
    history: "restaurant_history",
    demoSeeded: "restaurant_demo_seeded",
    memberId: "restaurant_member_id",
    auth: "restaurant_auth"
  };
  const apiState = {
    checked: false,
    available: false
  };
  const demoSeedVersion = "home-20";

  const defaultSections = ["반조리", "반찬", "소스", "냉장", "냉동"];
  const defaultEmployees = [
    { id: "emp-1", name: "직원1", enabled: true },
    { id: "emp-2", name: "직원2", enabled: true }
  ];
  const defaultTargets = ["카페테리아", "야채", "그로서리"];
  const defaultAccessCodes = {
    c1234: { role: "department", department: "카페테리아", label: "카페테리아" },
    v1234: { role: "department", department: "야채", label: "야채" },
    g1234: { role: "department", department: "그로서리", label: "그로서리" },
    m1234: { role: "restaurant", department: "", label: "레스토랑" },
    madmin: { role: "admin", department: "", label: "관리자" }
  };
  const defaultIngredients = [
    { id: "item-donkatsu", name: "돈까스", nameKo: "돈까스", nameEn: "Pork Cutlet", section: "반조리", unit: "개", target: "카페테리아", enabled: true },
    { id: "item-mandu", name: "만두", nameKo: "만두", nameEn: "Dumplings", section: "반조리", unit: "봉", target: "카페테리아", enabled: true },
    { id: "item-onion", name: "양파", nameKo: "양파", nameEn: "Onion", section: "야채", unit: "kg", target: "야채", enabled: true },
    { id: "item-potato", name: "감자", nameKo: "감자", nameEn: "Potato", section: "야채", unit: "박스", target: "야채", enabled: true },
    { id: "item-green-onion", name: "대파", nameKo: "대파", nameEn: "Green Onion", section: "야채", unit: "단", target: "야채", enabled: true },
    { id: "item-kimchi", name: "김치", nameKo: "김치", nameEn: "Kimchi", section: "반찬", unit: "kg", target: "카페테리아", enabled: true },
    { id: "item-danmuji", name: "단무지", nameKo: "단무지", nameEn: "Pickled Radish", section: "반찬", unit: "팩", target: "카페테리아", enabled: true },
    { id: "item-oil", name: "식용유", nameKo: "식용유", nameEn: "Cooking Oil", section: "소스", unit: "통", target: "카페테리아", enabled: true },
    { id: "item-soy-sauce", name: "간장", nameKo: "간장", nameEn: "Soy Sauce", section: "소스", unit: "병", target: "카페테리아", enabled: true },
    { id: "item-eggs", name: "계란", nameKo: "계란", nameEn: "Eggs", section: "냉장", unit: "판", target: "카페테리아", enabled: true },
    { id: "item-flour", name: "밀가루", nameKo: "밀가루", nameEn: "Flour", section: "식재료", unit: "kg", target: "그로서리", enabled: true },
    { id: "item-milk", name: "우유", nameKo: "우유", nameEn: "Milk", section: "냉장", unit: "L", target: "카페테리아", enabled: true },
    { id: "item-cheese", name: "치즈", nameKo: "치즈", nameEn: "Cheese", section: "냉장", unit: "팩", target: "카페테리아", enabled: true },
    { id: "item-frozen-mandu", name: "냉동만두", nameKo: "냉동만두", nameEn: "Frozen Dumplings", section: "냉동", unit: "봉", target: "카페테리아", enabled: true },
    { id: "item-frozen-potato", name: "냉동감자", nameKo: "냉동감자", nameEn: "Frozen Potatoes", section: "냉동", unit: "봉", target: "그로서리", enabled: true },
    { id: "item-other", name: "기타요청", nameKo: "기타요청", nameEn: "Other Request", section: "기타", unit: "개", target: "그로서리", enabled: true }
  ];
  const defaultRecipes = [
    recipe("김치볶음밥", "식재료", "남은 밥과 김치를 빠르게 볶는 점심 메뉴", "밥, 김치, 계란, 대파, 간장", "1. 대파를 볶아 향을 냅니다.\n2. 김치와 밥을 넣고 볶습니다.\n3. 간장으로 간을 맞추고 계란을 올립니다.", "김치 물기를 살짝 짜면 볶음이 깔끔합니다."),
    recipe("제육볶음", "반조리", "매콤한 돼지고기 볶음", "돼지고기, 양파, 대파, 고추장, 간장", "1. 양념을 섞어 고기를 재웁니다.\n2. 채소와 함께 센 불에 볶습니다.\n3. 마지막에 대파를 넣습니다.", "배식 전 한 번 더 데우면 윤기가 살아납니다."),
    recipe("된장찌개", "식재료", "기본 국물 메뉴", "된장, 감자, 양파, 두부, 대파", "1. 육수를 끓입니다.\n2. 된장을 풀고 감자와 양파를 넣습니다.\n3. 두부와 대파를 넣고 마무리합니다.", "간은 마지막에 조절합니다."),
    recipe("불고기", "반조리", "달콤짭짤한 고기 메뉴", "소고기, 양파, 간장, 설탕, 대파", "1. 고기를 양념에 재웁니다.\n2. 양파와 함께 볶습니다.\n3. 국물이 졸아들면 마무리합니다.", "너무 오래 볶으면 질겨질 수 있습니다."),
    recipe("샐러드", "야채", "가벼운 곁들임 메뉴", "양상추, 치즈, 소스, 계란", "1. 야채를 씻고 물기를 제거합니다.\n2. 재료를 먹기 좋게 담습니다.\n3. 소스를 따로 제공합니다.", "소스는 배식 직전에 넣습니다.")
  ];
  const defaultMenuSeeds = [
    { recipeName: "김치볶음밥", category: "식사", nameKo: "김치볶음밥", nameEn: "Kimchi Fried Rice", price: "13.99" },
    { recipeName: "제육볶음", category: "식사", nameKo: "제육볶음", nameEn: "Spicy Pork", price: "15.99" },
    { recipeName: "된장찌개", category: "찌개", nameKo: "된장찌개", nameEn: "Soybean Paste Stew", price: "14.99" },
    { recipeName: "불고기", category: "식사", nameKo: "불고기", nameEn: "Bulgogi", price: "16.99" },
    { recipeName: "샐러드", category: "사이드", nameKo: "샐러드", nameEn: "Salad", price: "8.99", seasonal: true }
  ];
  const testIngredientSeeds = [
    ["item-test-chicken", "닭다리살", "Chicken Thigh", "반조리", "kg", "카페테리아"],
    ["item-test-pork-belly", "삼겹살", "Pork Belly", "반조리", "kg", "카페테리아"],
    ["item-test-fishcake", "어묵", "Fish Cake", "냉장", "팩", "카페테리아"],
    ["item-test-tofu", "두부", "Tofu", "냉장", "모", "카페테리아"],
    ["item-test-rice-cake", "떡볶이떡", "Rice Cakes", "냉장", "봉", "카페테리아"],
    ["item-test-seaweed", "김", "Roasted Seaweed", "반찬", "박스", "카페테리아"],
    ["item-test-pickled-cucumber", "오이피클", "Pickled Cucumber", "반찬", "통", "카페테리아"],
    ["item-test-gochujang", "고추장", "Gochujang", "소스", "통", "카페테리아"],
    ["item-test-doenjang", "된장", "Doenjang", "소스", "통", "카페테리아"],
    ["item-test-sesame-oil", "참기름", "Sesame Oil", "소스", "병", "카페테리아"],
    ["item-test-frozen-corn", "냉동옥수수", "Frozen Corn", "냉동", "봉", "카페테리아"],
    ["item-test-frozen-shrimp", "냉동새우", "Frozen Shrimp", "냉동", "봉", "카페테리아"],
    ["item-test-carrot", "당근", "Carrot", "야채", "kg", "야채"],
    ["item-test-cabbage", "양배추", "Cabbage", "야채", "박스", "야채"],
    ["item-test-lettuce", "상추", "Lettuce", "야채", "박스", "야채"],
    ["item-test-cucumber", "오이", "Cucumber", "야채", "kg", "야채"],
    ["item-test-garlic", "마늘", "Garlic", "야채", "kg", "야채"],
    ["item-test-mushroom", "버섯", "Mushroom", "야채", "팩", "야채"],
    ["item-test-spinach", "시금치", "Spinach", "야채", "단", "야채"],
    ["item-test-pepper", "고추", "Chili Pepper", "야채", "팩", "야채"],
    ["item-test-rice", "쌀", "Rice", "식재료", "포", "그로서리"],
    ["item-test-sugar", "설탕", "Sugar", "식재료", "kg", "그로서리"],
    ["item-test-salt", "소금", "Salt", "식재료", "kg", "그로서리"],
    ["item-test-breadcrumbs", "빵가루", "Breadcrumbs", "식재료", "봉", "그로서리"],
    ["item-test-noodles", "라면사리", "Ramen Noodles", "식재료", "박스", "그로서리"],
    ["item-test-curry", "카레가루", "Curry Powder", "식재료", "봉", "그로서리"],
    ["item-test-plastic-cup", "일회용컵", "Disposable Cups", "기타", "박스", "그로서리"],
    ["item-test-napkin", "냅킨", "Napkins", "기타", "박스", "그로서리"]
  ];
  const testRecipeSeeds = [
    ["recipe-test-tteokbokki", "떡볶이", "반조리", "매콤달콤한 분식 메뉴", "떡볶이떡, 어묵, 고추장, 설탕, 대파", "1. 양념장을 끓입니다.\n2. 떡과 어묵을 넣습니다.\n3. 농도가 잡히면 대파를 넣습니다.", "소스는 너무 졸이지 않습니다."],
    ["recipe-test-chicken-mayo", "치킨마요덮밥", "반조리", "남은 치킨을 활용한 덮밥", "닭다리살, 계란, 밥, 간장, 마요네즈", "1. 닭고기를 데웁니다.\n2. 계란을 스크램블합니다.\n3. 밥 위에 재료와 소스를 올립니다.", "소스는 별도 보관합니다."],
    ["recipe-test-fishcake-soup", "어묵국", "냉장", "간단한 국물 메뉴", "어묵, 대파, 간장, 무", "1. 육수를 끓입니다.\n2. 어묵을 넣습니다.\n3. 간장으로 간합니다.", "오래 끓이면 어묵이 불 수 있습니다."],
    ["recipe-test-tofu-kimchi", "두부김치", "반찬", "두부와 볶은 김치 반찬", "두부, 김치, 참기름, 대파", "1. 두부를 데웁니다.\n2. 김치를 볶습니다.\n3. 함께 담습니다.", "두부는 물기를 제거합니다."],
    ["recipe-test-curry-rice", "카레라이스", "식재료", "대량 조리에 편한 카레 메뉴", "카레가루, 감자, 당근, 양파, 밥", "1. 채소를 볶습니다.\n2. 물을 넣고 끓입니다.\n3. 카레가루를 풀어 마무리합니다.", "농도는 배식 전 조절합니다."],
    ["recipe-test-bibim-noodle", "비빔면", "식재료", "차갑게 먹는 면 메뉴", "라면사리, 고추장, 오이, 계란, 참기름", "1. 면을 삶아 식힙니다.\n2. 양념과 버무립니다.\n3. 고명을 올립니다.", "면은 충분히 헹굽니다."],
    ["recipe-test-shrimp-fried-rice", "새우볶음밥", "냉동", "냉동새우를 넣은 볶음밥", "냉동새우, 밥, 계란, 대파, 간장", "1. 새우를 볶습니다.\n2. 밥과 계란을 넣습니다.\n3. 간장으로 간합니다.", "새우 해동 상태를 확인합니다."],
    ["recipe-test-pork-belly-bowl", "삼겹살덮밥", "반조리", "달콤한 소스의 고기 덮밥", "삼겹살, 양파, 간장, 설탕, 밥", "1. 고기를 굽습니다.\n2. 양파와 소스를 넣습니다.\n3. 밥 위에 올립니다.", "기름은 일부 제거합니다."],
    ["recipe-test-spinach-side", "시금치무침", "반찬", "기본 나물 반찬", "시금치, 소금, 참기름, 마늘", "1. 시금치를 데칩니다.\n2. 물기를 짭니다.\n3. 양념과 버무립니다.", "간은 약하게 시작합니다."],
    ["recipe-test-cabbage-salad", "양배추샐러드", "야채", "돈까스와 잘 맞는 샐러드", "양배추, 오이피클, 소스", "1. 양배추를 채 썹니다.\n2. 물기를 제거합니다.\n3. 소스를 따로 제공합니다.", "아침에 미리 썰지 않습니다."]
  ];
  const testMenuSeeds = [
    ["떡볶이", "분식", "떡볶이", "Tteokbokki", "11.99"],
    ["치킨마요덮밥", "덮밥", "치킨마요덮밥", "Chicken Mayo Bowl", "14.99"],
    ["어묵국", "국", "어묵국", "Fish Cake Soup", "9.99"],
    ["두부김치", "사이드", "두부김치", "Tofu Kimchi", "10.99"],
    ["카레라이스", "식사", "카레라이스", "Curry Rice", "13.99"],
    ["비빔면", "면", "비빔면", "Spicy Mixed Noodles", "12.99"],
    ["새우볶음밥", "식사", "새우볶음밥", "Shrimp Fried Rice", "15.99"],
    ["삼겹살덮밥", "덮밥", "삼겹살덮밥", "Pork Belly Bowl", "16.99"],
    ["시금치무침", "반찬", "시금치무침", "Seasoned Spinach", "5.99"],
    ["양배추샐러드", "사이드", "양배추샐러드", "Cabbage Salad", "6.99"],
    ["김치볶음밥", "식사", "김치볶음밥 세트", "Kimchi Fried Rice Set", "17.99"],
    ["제육볶음", "식사", "제육 도시락", "Spicy Pork Lunch Box", "18.99"]
  ];

  function recipe(name, section, description, ingredients, steps, notes) {
    return { id: id("recipe"), name, section, description, ingredients, steps, notes, imageUrl: "", enabled: true, updatedAt: today() };
  }

  function buildDefaultMenus(recipes) {
    return defaultMenuSeeds.map((menu) => {
      const recipeRow = recipes.find((recipe) => recipe.name === menu.recipeName);
      return {
        id: `menu-${menu.nameEn.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
        recipeId: recipeRow?.id || "",
        recipeName: recipeRow?.name || menu.recipeName,
        category: menu.category,
        nameKo: menu.nameKo,
        nameEn: menu.nameEn,
        seasonal: Boolean(menu.seasonal),
        discontinued: false,
        price: menu.price,
        currency: "CAD",
        notes: ""
      };
    });
  }

  function testIngredients() {
    const extra = testIngredientSeeds.map(([itemId, nameKo, nameEn, section, unit, target]) => ({
      id: itemId,
      name: nameKo,
      nameKo,
      nameEn,
      section,
      unit,
      target,
      enabled: true
    }));
    return [...defaultIngredients, ...extra].map(normalizeIngredient);
  }

  function testRecipes() {
    const extra = testRecipeSeeds.map(([recipeId, name, section, description, ingredients, steps, notes], index) => ({
      id: recipeId,
      name,
      section,
      description,
      ingredients,
      steps,
      notes,
      imageUrl: "",
      enabled: index % 7 !== 6,
      updatedAt: today()
    }));
    return [...defaultRecipes, ...extra];
  }

  function testMenus(recipes) {
    const base = buildDefaultMenus(recipes);
    const extra = testMenuSeeds.map(([recipeName, category, nameKo, nameEn, price], index) => {
      const recipeRow = recipes.find((row) => row.name === recipeName);
      return {
        id: `menu-test-${nameEn.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
        recipeId: recipeRow?.id || "",
        recipeName,
        category,
        nameKo,
        nameEn,
        seasonal: index % 5 === 0,
        discontinued: index % 9 === 8,
        price,
        currency: "CAD",
        notes: index % 9 === 8 ? "테스트용 판매 중단 메뉴" : ""
      };
    });
    return [...base, ...extra].map(normalizeMenu);
  }

  function dateForHistory(weekOffset, dayOffset) {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const daysSinceTuesday = (todayDate.getDay() + 5) % 7;
    const date = new Date(todayDate);
    date.setDate(todayDate.getDate() - daysSinceTuesday - weekOffset * 7 + dayOffset);
    return date.toISOString().slice(0, 10);
  }

  function testHistory(ingredients) {
    const notes = ["오전 입고 필요", "재고 부족 확인", "수량 여유 있게 요청", "대체 가능 품목 있음", "마감 전 확인 필요", "테스트 주문"];
    const rows = [];
    for (let week = 0; week < 10; week += 1) {
      for (let day = 0; day < 6; day += 1) {
        const itemCount = week === 0 && day === 5 ? 20 : 6 + ((week + day) % 5);
        const items = Array.from({ length: itemCount }, (_, index) => {
          const source = ingredients[(week * 11 + day * 5 + index * 3) % ingredients.length];
          return {
            id: `${source.id}-fake-${week}-${day}-${index}`,
            name: source.nameKo || source.name,
            nameKo: source.nameKo || source.name,
            nameEn: source.nameEn || "",
            section: source.section,
            target: source.target,
            quantity: String(1 + ((week + day + index) % 8)),
            unit: source.unit,
            received: (week + day + index) % 3 === 0,
            enabled: true
          };
        });
        const targets = Array.from(new Set(items.map((item) => item.target)));
        rows.push({
          id: `history-test-${week}-${day}`,
          date: dateForHistory(week, day),
          time: `${String(9 + ((week + day) % 7)).padStart(2, "0")}:${day % 2 ? "30" : "05"}`,
          mode: "simple",
          employee: "테스트",
          target: "",
          memo: notes[(week + day) % notes.length],
          message: targets.map((target) => `[${target}] ${items.filter((item) => item.target === target).map((item) => item.nameKo).join(", ")}`).join("\n"),
          memos: targets.map((target, index) => ({
            id: `memo-test-${week}-${day}-${index}`,
            role: index % 2 ? "department" : "restaurant",
            department: index % 2 ? target : "",
            authorLabel: index % 2 ? target : "레스토랑",
            text: `${target} 테스트 메모 ${week + 1}-${day + 1}`,
            createdAt: `${dateForHistory(week, day)}T${String(10 + index).padStart(2, "0")}:00:00.000Z`
          })),
          items
        });
      }
    }
    return rows.sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
  }

  function testData() {
    const recipes = testRecipes();
    const ingredients = testIngredients();
    return {
      accessAccounts: defaultAccessCodes,
      sections: defaultSections,
      ingredients,
      recipes,
      menus: testMenus(recipes),
      history: testHistory(ingredients)
    };
  }

  function defaultData() {
    const recipes = defaultRecipes;
    return {
      accessAccounts: defaultAccessCodes,
      sections: defaultSections,
      ingredients: defaultIngredients.map(normalizeIngredient),
      recipes,
      menus: buildDefaultMenus(recipes),
      history: []
    };
  }

  function normalizeMenu(menu) {
    if (!menu) return menu;
    const seed = defaultMenuSeeds.find((row) => row.nameKo === menu.nameKo || row.recipeName === menu.recipeName);
    return {
      ...menu,
      nameKo: menu.nameKo || menu.name || seed?.nameKo || "",
      nameEn: menu.nameEn || seed?.nameEn || ""
    };
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

  function memberId() {
    let value = localStorage.getItem(keys.memberId);
    if (!value) {
      value = `member-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      localStorage.setItem(keys.memberId, value);
    }
    return value;
  }

  function auth() {
    return getJson(keys.auth, null);
  }

  function accessAccounts() {
    return getJson("restaurant_access_codes", defaultAccessCodes);
  }

  function setAccessAccounts(accounts) {
    const next = accounts || defaultAccessCodes;
    setJson("restaurant_access_codes", next);
    syncQuietly(() => apiRequest("/access-accounts", {
      method: "PUT",
      body: JSON.stringify({ accessAccounts: next })
    }));
  }

  function authenticate(password) {
    const account = accessAccounts()[String(password || "").trim()];
    if (!account) return null;
    const session = {
      ...account,
      signedInAt: new Date().toISOString()
    };
    setJson(keys.auth, session);
    return session;
  }

  function logoutAuth() {
    localStorage.removeItem(keys.auth);
  }

  function canAdmin() {
    return auth()?.role === "admin";
  }

  function allowedTargets() {
    const session = auth();
    if (session?.role === "department" && session.department) return [session.department];
    return defaultTargets.slice();
  }

  function startPath(session = auth()) {
    if (session?.role === "admin") return "admin.html";
    return "index.html";
  }

  async function apiRequest(path, options = {}) {
    const session = auth();
    const response = await fetch(`/api${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-Mukja-Member-Id": memberId(),
        "X-Mukja-Role": session?.role || "anonymous",
        "X-Mukja-Department": session?.department || "",
        ...(options.headers || {})
      },
      cache: "no-store"
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
      throw new Error(data.error || `API ${response.status}`);
    }
    apiState.checked = true;
    apiState.available = true;
    return data;
  }

  function syncQuietly(task) {
    task().catch(() => {
      apiState.checked = true;
      apiState.available = false;
    });
  }

  async function hydrateHistoryFromApi() {
    const localHistory = getJson(keys.history, []);
    try {
      const data = await apiRequest("/history");
      const remoteHistory = Array.isArray(data.history) ? data.history : [];
      if (remoteHistory.length) {
        setJson(keys.history, remoteHistory);
      } else if (localHistory.length) {
        await apiRequest("/history", {
          method: "PUT",
          body: JSON.stringify({ history: localHistory })
        });
      }
    } catch {
      apiState.checked = true;
      apiState.available = false;
    }
  }

  async function hydrateAccessAccountsFromApi() {
    const localAccounts = accessAccounts();
    try {
      const data = await apiRequest("/access-accounts");
      const remoteAccounts = data.accessAccounts && typeof data.accessAccounts === "object" ? data.accessAccounts : {};
      if (Object.keys(remoteAccounts).length) {
        setJson("restaurant_access_codes", remoteAccounts);
      } else if (Object.keys(localAccounts).length) {
        await apiRequest("/access-accounts", {
          method: "PUT",
          body: JSON.stringify({ accessAccounts: localAccounts })
        });
      }
    } catch {
      apiState.checked = true;
      apiState.available = false;
    }
  }

  async function hydrateRecipesFromApi() {
    const localRecipes = getJson(keys.recipes, []);
    try {
      const data = await apiRequest("/recipes");
      const remoteRecipes = Array.isArray(data.recipes) ? data.recipes : [];
      if (remoteRecipes.length) {
        setJson(keys.recipes, remoteRecipes);
      } else if (localRecipes.length) {
        await apiRequest("/recipes", {
          method: "PUT",
          body: JSON.stringify({ recipes: localRecipes })
        });
      }
    } catch {
      apiState.checked = true;
      apiState.available = false;
    }
  }

  async function hydrateMenusFromApi() {
    const localMenus = getJson(keys.menus, []);
    try {
      const data = await apiRequest("/menus");
      const remoteMenus = Array.isArray(data.menus) ? data.menus.map(normalizeMenu) : [];
      if (remoteMenus.length) {
        setJson(keys.menus, remoteMenus);
      } else if (localMenus.length) {
        await apiRequest("/menus", {
          method: "PUT",
          body: JSON.stringify({ menus: localMenus.map(normalizeMenu) })
        });
      }
    } catch {
      apiState.checked = true;
      apiState.available = false;
    }
  }

  async function hydrateIngredientsFromApi() {
    const localIngredients = getJson(keys.ingredients, []);
    try {
      const data = await apiRequest("/ingredients");
      const remoteIngredients = Array.isArray(data.ingredients) ? data.ingredients.map(normalizeIngredient) : [];
      if (remoteIngredients.length) {
        setJson(keys.ingredients, remoteIngredients);
      } else if (localIngredients.length) {
        await apiRequest("/ingredients", {
          method: "PUT",
          body: JSON.stringify({ ingredients: localIngredients.map(normalizeIngredient) })
        });
      }
    } catch {
      apiState.checked = true;
      apiState.available = false;
    }
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
    const normalized = normalizeSection(normalizeTarget(item));
    const seed = defaultIngredients.find((row) => row.id === normalized.id || row.name === normalized.name || row.nameKo === normalized.nameKo);
    const nameKo = normalized.nameKo || normalized.name || seed?.nameKo || seed?.name || "";
    return {
      ...normalized,
      name: nameKo,
      nameKo,
      nameEn: normalized.nameEn || normalized.name_en || seed?.nameEn || ""
    };
  }

  function shouldResetSections(sections) {
    const oldSections = ["반조리", "야채", "반찬", "소스", "식재료", "냉장", "냉동", "기타"];
    return !Array.isArray(sections) || sections.length === 0 || oldSections.every((section) => sections.includes(section));
  }

  function seedLocalTestDataOnce() {
    const marker = localStorage.getItem(keys.demoSeeded);
    if (marker === demoSeedVersion || marker === "reset") return;
    const history = getJson(keys.history, []);
    const menus = getJson(keys.menus, []);
    if (history.length && !["auto", "manual"].includes(marker || "")) return;
    if (menus.length > defaultMenuSeeds.length && !["auto", "manual"].includes(marker || "")) return;
    const data = testData();
    setJson(keys.sections, data.sections);
    setJson("restaurant_access_codes", data.accessAccounts);
    setJson(keys.ingredients, data.ingredients);
    setJson(keys.recipes, data.recipes);
    setJson(keys.menus, data.menus);
    setJson(keys.history, data.history);
    localStorage.setItem(keys.demoSeeded, demoSeedVersion);
  }

  async function init() {
    if (!localStorage.getItem(keys.lang)) localStorage.setItem(keys.lang, "ko");
    if (!localStorage.getItem(keys.mode)) localStorage.setItem(keys.mode, "simple");
    if (!localStorage.getItem("restaurant_access_codes")) setJson("restaurant_access_codes", defaultAccessCodes);
    if (!localStorage.getItem(keys.sections) || shouldResetSections(getJson(keys.sections, []))) setJson(keys.sections, defaultSections);
    if (!localStorage.getItem(keys.employees)) setJson(keys.employees, defaultEmployees);
    if (!localStorage.getItem(keys.recipes)) setJson(keys.recipes, defaultRecipes);
    if (!localStorage.getItem(keys.menus)) setJson(keys.menus, buildDefaultMenus(getJson(keys.recipes, defaultRecipes)));
    else setJson(keys.menus, getJson(keys.menus, []).map(normalizeMenu));
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
    seedLocalTestDataOnce();
    await hydrateAccessAccountsFromApi();
    await hydrateIngredientsFromApi();
    await hydrateHistoryFromApi();
    await hydrateRecipesFromApi();
    await hydrateMenusFromApi();
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
    const header = ["날짜", "시간", "모드", "요청자", "주문부서", "품목", "품목영문", "수량", "단위", "입고여부", "메모"];
    const lines = [header.map(csvEscape).join(",")];
    rows.forEach((entry) => {
      entry.items.forEach((item) => {
        lines.push([
          entry.date,
          entry.time,
          entry.mode,
          entry.employee || "",
          item.target || entry.target || "",
          item.nameKo || item.name,
          item.nameEn || "",
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
      const nameEn = field(row, map, ["품목영문", "영문품목", "itemEn", "nameEn", "English Item"]);
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
        nameKo: name,
        nameEn,
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
      accessAccounts: accessAccounts(),
      ingredients: getJson(keys.ingredients, []),
      recipes: getJson(keys.recipes, []),
      menus: getJson(keys.menus, []),
      history: getJson(keys.history, [])
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
    setAccessAccounts(data.accessAccounts || defaultAccessCodes);
    setIngredients(data.ingredients || []);
    setJson(keys.recipes, data.recipes || []);
    setJson(keys.menus, data.menus || []);
    setJson(keys.history, data.history || []);
  }

  function applyDataBundle(data, marker) {
    localStorage.setItem(keys.mode, "simple");
    setJson(keys.sections, data.sections || defaultSections);
    setJson("restaurant_access_codes", data.accessAccounts || defaultAccessCodes);
    setJson(keys.ingredients, (data.ingredients || []).map(normalizeIngredient));
    setJson(keys.recipes, data.recipes || []);
    setJson(keys.menus, (data.menus || []).map(normalizeMenu));
    setJson(keys.history, data.history || []);
    if (marker) localStorage.setItem(keys.demoSeeded, marker);
    syncQuietly(() => apiRequest("/seed-data", {
      method: "PUT",
      body: JSON.stringify(data)
    }));
  }

  function seedTestData() {
    const data = testData();
    applyDataBundle(data, "manual");
    return data;
  }

  function resetDemoData() {
    const data = defaultData();
    applyDataBundle(data, "reset");
    return data;
  }

  function setHistory(history) {
    setJson(keys.history, history);
  }

  function saveHistoryEntry(entry) {
    const history = getJson(keys.history, []);
    setHistory([entry, ...history.filter((row) => row.id !== entry.id)]);
    syncQuietly(() => apiRequest("/history", {
      method: "POST",
      body: JSON.stringify({ entry })
    }));
  }

  function replaceHistory(history) {
    setHistory(history);
    syncQuietly(() => apiRequest("/history", {
      method: "PUT",
      body: JSON.stringify({ history })
    }));
  }

  function deleteHistory(idValue) {
    setHistory(getJson(keys.history, []).filter((entry) => entry.id !== idValue));
    syncQuietly(() => apiRequest(`/history/${encodeURIComponent(idValue)}`, { method: "DELETE" }));
  }

  function clearHistory() {
    setHistory([]);
    syncQuietly(() => apiRequest("/history", { method: "DELETE" }));
  }

  function setRecipes(recipes) {
    setJson(keys.recipes, recipes);
    syncQuietly(() => apiRequest("/recipes", {
      method: "PUT",
      body: JSON.stringify({ recipes })
    }));
  }

  function saveRecipe(recipe) {
    const recipes = getJson(keys.recipes, []);
    const next = recipes.some((row) => row.id === recipe.id)
      ? recipes.map((row) => row.id === recipe.id ? recipe : row)
      : [...recipes, recipe];
    setJson(keys.recipes, next);
    syncQuietly(() => apiRequest("/recipes", {
      method: "POST",
      body: JSON.stringify({ recipe })
    }));
  }

  function deleteRecipe(idValue) {
    const recipes = getJson(keys.recipes, []).map((recipe) =>
      recipe.id === idValue ? { ...recipe, enabled: false, updatedAt: today() } : recipe
    );
    setRecipes(recipes);
  }

  function setMenus(menus) {
    const normalized = menus.map(normalizeMenu);
    setJson(keys.menus, normalized);
    syncQuietly(() => apiRequest("/menus", {
      method: "PUT",
      body: JSON.stringify({ menus: normalized })
    }));
  }

  function setIngredients(ingredients) {
    const normalized = ingredients.map(normalizeIngredient);
    setJson(keys.ingredients, normalized);
    syncQuietly(() => apiRequest("/ingredients", {
      method: "PUT",
      body: JSON.stringify({ ingredients: normalized })
    }));
  }

  function saveMenu(menu) {
    const normalizedMenu = normalizeMenu(menu);
    const menus = getJson(keys.menus, []);
    const next = menus.some((row) => row.id === normalizedMenu.id)
      ? menus.map((row) => row.id === normalizedMenu.id ? normalizedMenu : row)
      : [...menus, normalizedMenu];
    setJson(keys.menus, next);
    syncQuietly(() => apiRequest("/menus", {
      method: "POST",
      body: JSON.stringify({ menu: normalizedMenu })
    }));
  }

  function discontinueMenu(idValue) {
    const menus = getJson(keys.menus, []).map((menu) =>
      menu.id === idValue ? { ...menu, discontinued: true } : menu
    );
    setMenus(menus);
  }

  function menuCategories() {
    return Array.from(new Set(getJson(keys.menus, []).map((menu) => menu.category).filter(Boolean)));
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
    getAllowedTargets: allowedTargets,
    getIngredients: () => getJson(keys.ingredients, []).map(normalizeIngredient),
    setIngredients,
    getRecipes: () => getJson(keys.recipes, []),
    setRecipes,
    saveRecipe,
    deleteRecipe,
    getMenus: () => getJson(keys.menus, []).map(normalizeMenu),
    setMenus,
    saveMenu,
    discontinueMenu,
    getMenuCategories: menuCategories,
    getHistory: () => getJson(keys.history, []),
    setHistory,
    addHistory: saveHistoryEntry,
    saveHistoryEntry,
    replaceHistory,
    deleteHistory,
    clearHistory,
    dbStatus: () => ({ ...apiState }),
    getAuth: auth,
    getAccessAccounts: accessAccounts,
    setAccessAccounts,
    authenticate,
    logoutAuth,
    canAdmin,
    startPath,
    seedTestData,
    resetDemoData,
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
      const session = auth();
      const isRestricted = (key) => {
        if (key === "order") return !["restaurant", "admin"].includes(session?.role);
        if (key === "menus") return !["restaurant", "admin"].includes(session?.role);
        if (key === "admin") return session?.role !== "admin";
        return false;
      };
      const nav = [
        ["home", "index.html", "⌂"],
        ["history", "history.html", "↺"],
        ["order", "order.html", "🛒"],
        ["menus", "menu.html", "🍚"],
        ["admin", "admin.html", "⚙"]
      ];
      const sidebarStateKey = "restaurant_sidebar_collapsed";
      const savedSidebarState = localStorage.getItem(sidebarStateKey);
      const sidebarCollapsed = savedSidebarState
        ? savedSidebarState === "1"
        : window.matchMedia("(max-width: 900px)").matches;
      document.body.classList.toggle("sidebar-collapsed", sidebarCollapsed);
      const toggleLabel = sidebarCollapsed ? "메뉴 열기" : "메뉴 닫기";
      sidebar.innerHTML = `
        <button class="sidebar-toggle" data-sidebar-toggle type="button" aria-label="${toggleLabel}" aria-expanded="${!sidebarCollapsed}">
          <svg class="sidebar-toggle-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <div class="brand">
          <div class="brand-copy">
            <div class="brand-main-row">
              <img class="brand-mark" src="assets/mokja-logo.jpg" alt="" />
              <div class="brand-title">${I18n.t("appName")}</div>
            </div>
            <div class="brand-sub-row">
              <div class="brand-role">${session ? I18n.roleLabel(session.label) : ""}</div>
              <div class="brand-tools">
                <button class="lang-toggle" data-lang-toggle type="button" aria-label="${I18n.t("language")}">${I18n.lang() === "ko" ? "🇺🇸" : "🇰🇷"}</button>
                ${session ? `<button class="header-logout" type="button" data-auth-logout aria-label="${I18n.t("logout")}">⎋</button>` : ""}
              </div>
            </div>
          </div>
        </div>
        <nav class="nav">
          ${nav.map(([key, href, icon]) => `
            <a class="nav-link ${active === key ? "is-active" : ""} ${isRestricted(key) ? "is-restricted" : ""}" href="${isRestricted(key) ? "#" : href}" ${isRestricted(key) ? 'aria-disabled="true"' : ""}>
              <span class="nav-icon">${icon}</span><span>${I18n.t(key)}</span>
            </a>
          `).join("")}
        </nav>
        <div class="sidebar-footer">Static PWA · DB sync ready<br />GitHub + Netlify ready</div>
      `;
      const sidebarToggle = sidebar.querySelector("[data-sidebar-toggle]");
      if (sidebarToggle) {
        sidebarToggle.addEventListener("click", () => {
          const collapsed = document.body.classList.toggle("sidebar-collapsed");
          localStorage.setItem(sidebarStateKey, collapsed ? "1" : "0");
          sidebarToggle.setAttribute("aria-expanded", String(!collapsed));
          sidebarToggle.setAttribute("aria-label", collapsed ? "메뉴 열기" : "메뉴 닫기");
        });
      }
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
      const logout = sidebar.querySelector("[data-auth-logout]");
      if (logout) {
        logout.addEventListener("click", () => {
          logoutAuth();
          window.location.reload();
        });
      }
      if (!session) {
        document.body.classList.add("auth-locked");
        let gate = document.querySelector("[data-auth-gate]");
        if (!gate) {
          gate = document.createElement("div");
          gate.className = "auth-gate";
          gate.setAttribute("data-auth-gate", "");
          document.body.appendChild(gate);
        }
        gate.innerHTML = `
          <form class="auth-card" data-auth-form>
            <img class="auth-logo" src="assets/mokja-logo.jpg" alt="" />
            <h1>${I18n.t("appName")}</h1>
            <label class="field">
              <span>${I18n.t("accessPassword")}</span>
              <input name="password" type="password" autocomplete="current-password" inputmode="text" />
            </label>
            <button class="button" type="submit">${I18n.t("enter")}</button>
            <p class="status" data-auth-status></p>
          </form>
        `;
        gate.querySelector("[data-auth-form]").addEventListener("submit", (event) => {
          event.preventDefault();
          const input = gate.querySelector("input[name='password']");
          const session = authenticate(input.value);
          if (session) {
            window.location.href = startPath(session);
            return;
          }
          gate.querySelector("[data-auth-status]").textContent = I18n.t("wrongPassword");
          input.select();
        });
        setTimeout(() => gate.querySelector("input")?.focus(), 80);
      } else {
        document.body.classList.remove("auth-locked");
        document.querySelector("[data-auth-gate]")?.remove();
      }
      I18n.applyI18n();
    },
    registerServiceWorker() {
      if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
        navigator.serviceWorker.register("service-worker.js", { updateViaCache: "none" })
          .then((registration) => registration.update())
          .catch(() => {});
      }
    }
  };
})();
