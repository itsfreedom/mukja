(function () {
  const appAssetVersion = "v187";
  const keys = {
    initialized: "restaurant_initialized",
    lang: "restaurant_lang",
    mode: "restaurant_mode",
    memberId: "restaurant_member_id",
    auth: "restaurant_auth"
  };
  const apiState = {
    checked: false,
    available: false,
    error: ""
  };
  const loadedDatasets = new Set();
  const loadingDatasets = new Map();
  const dataState = {
    employees: [],
    sections: [],
    requestCategories: {},
    accessAccounts: {},
    ingredients: [],
    recipes: [],
    menus: [],
    history: [],
    standaloneMemos: []
  };

  const defaultSections = ["반조리", "반찬", "소스", "고기", "해물", "기타"];
  const defaultEmployees = [
    { id: "emp-1", name: "직원1", enabled: true },
    { id: "emp-2", name: "직원2", enabled: true }
  ];
  const defaultTargets = ["카페테리아", "야채", "그로서리"];
  const defaultRequestCategories = {
    "카페테리아": defaultSections,
    "야채": ["신선", "두부"],
    "그로서리": ["분말", "냉장", "냉동", "소스류", "곡류", "면류", "반찬", "포장 박스"]
  };
  const categoryEnglishLabels = {
    "반조리": "Semi-prepared",
    "야채": "Vegetables",
    "반찬": "Side Dishes",
    "소스": "Sauces",
    "식재료": "Ingredients",
    "상온": "Room Temp",
    "냉장": "Refrigerated",
    "냉동": "Frozen",
    "기타": "Other",
    "고기": "Meat",
    "해물": "Seafood",
    "신선": "Fresh",
    "두부": "Tofu",
    "분말": "Powder",
    "소스류": "Sauces",
    "곡류": "Grains",
    "면류": "Noodles",
    "건나물": "Dried Vegetables",
    "포장 박스": "Packaging",
    "식사": "Meals",
    "찌개": "Stews",
    "사이드": "Sides",
    "분식": "Bunsik",
    "덮밥": "Rice Bowls",
    "국": "Soups",
    "면": "Noodles"
  };
  const defaultAccessCodes = {
    c1234: { role: "department", department: "카페테리아", label: "카페테리아", userName: "c1234", name: "카페테리아" },
    v1234: { role: "department", department: "야채", label: "야채", userName: "v1234", name: "야채" },
    g1234: { role: "department", department: "그로서리", label: "그로서리", userName: "g1234", name: "그로서리" },
    m1234: { role: "restaurant", department: "", label: "레스토랑", userName: "m1234", name: "레스토랑" },
    madmin: { role: "admin", department: "", label: "관리자", userName: "madmin", name: "관리자" }
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
    recipe("짜장 소스", "소스", "반조리로 준비해두는 기본 짜장 소스", "양파 | 2kg\n돼지고기 | 1kg\n춘장 | 500g\n식용유 | 300ml\n물 | 3L", "1. 양파와 돼지고기를 볶습니다.\n2. 춘장을 기름에 볶아 향을 냅니다.\n3. 물을 넣고 농도가 잡힐 때까지 끓입니다.", "반조리 카테고리에서 판매 상태와 별도로 관리합니다.", "설탕 | 120g\n간장 | 150ml\n전분물 | 적당량"),
    recipe("닭튀김", "반조리", "미리 튀겨 재가열하기 좋은 닭튀김", "닭다리살 | 2kg\n튀김가루 | 800g\n식용유 | 적당량", "1. 닭다리살에 밑간을 합니다.\n2. 튀김옷을 입혀 1차 튀김합니다.\n3. 주문 전 2차로 바삭하게 튀깁니다.", "1차 튀김 후 충분히 식혀 보관합니다.", "소금 | 20g\n후추 | 8g\n마늘가루 | 20g"),
    recipe("샐러드", "야채", "가벼운 곁들임 메뉴", "양상추, 치즈, 소스, 계란", "1. 야채를 씻고 물기를 제거합니다.\n2. 재료를 먹기 좋게 담습니다.\n3. 소스를 따로 제공합니다.", "소스는 배식 직전에 넣습니다.")
  ];
  const defaultMenuSeeds = [
    { recipeName: "김치볶음밥", category: "식사", nameKo: "김치볶음밥", nameEn: "Kimchi Fried Rice", price: "13.99" },
    { recipeName: "제육볶음", category: "식사", nameKo: "제육볶음", nameEn: "Spicy Pork", price: "15.99" },
    { recipeName: "된장찌개", category: "찌개", nameKo: "된장찌개", nameEn: "Soybean Paste Stew", price: "14.99" },
    { recipeName: "불고기", category: "식사", nameKo: "불고기", nameEn: "Bulgogi", price: "16.99" },
    { recipeName: "짜장 소스", category: "반조리", nameKo: "짜장 소스", nameEn: "Black Bean Sauce", price: "0.00" },
    { recipeName: "닭튀김", category: "반조리", nameKo: "닭튀김", nameEn: "Fried Chicken", price: "0.00" },
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

  function splitLineParts(line) {
    const parts = String(line || "").split("|").map((part) => part.trim());
    return [parts[0] || "", parts.slice(1).join(" | ") || ""];
  }

  function parseRecipeItems(value) {
    if (Array.isArray(value)) {
      return value
        .map((item) => ({
          name: String(item?.name || "").trim(),
          amount: String(item?.amount || item?.quantity || "").trim()
        }))
        .filter((item) => item.name);
    }
    return String(value || "")
      .split(/\n|,/)
      .map((line) => {
        const [name, amount] = splitLineParts(line);
        return { name, amount };
      })
      .filter((item) => item.name);
  }

  function parseRecipeSteps(value) {
    if (Array.isArray(value)) {
      return value
        .map((step) => ({
          text: String(step?.text || step?.description || "").trim(),
          imageUrl: String(step?.imageUrl || step?.image || "").trim()
        }))
        .filter((step) => step.text || step.imageUrl);
    }
    return String(value || "")
      .split(/\n+/)
      .map((line) => {
        const [text, imageUrl] = splitLineParts(line.replace(/^\s*\d+[.)]\s*/, ""));
        return { text, imageUrl };
      })
      .filter((step) => step.text || step.imageUrl);
  }

  function recipeItemsToLines(items) {
    return parseRecipeItems(items).map((item) => [item.name, item.amount].filter(Boolean).join(" | ")).join("\n");
  }

  function recipeStepsToLines(steps) {
    return parseRecipeSteps(steps).map((step) => [step.text, step.imageUrl].filter(Boolean).join(" | ")).join("\n");
  }

  function legacyStepsText(steps) {
    return parseRecipeSteps(steps).map((step, index) => `${index + 1}. ${step.text}`).join("\n");
  }

  function normalizeRecipe(recipe) {
    if (!recipe) return recipe;
    const ingredientItems = parseRecipeItems(recipe.ingredientItems?.length ? recipe.ingredientItems : recipe.ingredients);
    const ingredientItemsEn = parseRecipeItems(recipe.ingredientItemsEn?.length ? recipe.ingredientItemsEn : recipe.ingredientsEn);
    const seasoningItems = parseRecipeItems(recipe.seasoningItems?.length ? recipe.seasoningItems : (recipe.seasonings || ""));
    const stepItems = parseRecipeSteps(recipe.stepItems?.length ? recipe.stepItems : recipe.steps);
    const stepItemsEn = parseRecipeSteps(recipe.stepItemsEn?.length ? recipe.stepItemsEn : recipe.stepsEn);
    return {
      ...recipe,
      nameEn: recipe.nameEn || "",
      section: recipe.section || "기타",
      description: recipe.description || "",
      descriptionEn: recipe.descriptionEn || "",
      ingredients: recipe.ingredients || recipeItemsToLines(ingredientItems),
      ingredientsEn: recipe.ingredientsEn || recipeItemsToLines(ingredientItemsEn),
      seasonings: recipe.seasonings || recipeItemsToLines(seasoningItems),
      steps: recipe.steps || legacyStepsText(stepItems),
      stepsEn: recipe.stepsEn || legacyStepsText(stepItemsEn),
      notes: recipe.notes || "",
      notesEn: recipe.notesEn || "",
      imageUrl: recipe.imageUrl || "",
      ingredientItems,
      ingredientItemsEn,
      seasoningItems,
      stepItems,
      stepItemsEn,
      enabled: recipe.enabled !== false,
      updatedAt: recipe.updatedAt || today()
    };
  }

  function recipe(name, section, description, ingredients, steps, notes, seasonings = "") {
    return normalizeRecipe({
      id: id("recipe"),
      name,
      section,
      description,
      ingredients,
      seasonings,
      steps,
      notes,
      imageUrl: "",
      enabled: true,
      updatedAt: today()
    });
  }

  function buildDefaultMenus(recipes) {
    return defaultMenuSeeds.map((menu, index) => {
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
        notes: "",
        sortOrder: index + 1
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
        notes: index % 9 === 8 ? "테스트용 판매 중단 메뉴" : "",
        sortOrder: base.length + index + 1
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
          memos: [
            {
              id: `memo-test-admin-${week}-${day}`,
              role: "admin",
              department: "",
              authorLabel: "관리자",
              text: `관리자 테스트 메모 ${week + 1}-${day + 1}`,
              createdAt: `${dateForHistory(week, day)}T09:30:00.000Z`
            },
            {
              id: `memo-test-restaurant-${week}-${day}`,
              role: "restaurant",
              department: "",
              authorLabel: "레스토랑",
              text: `레스토랑 테스트 메모 ${week + 1}-${day + 1}`,
              createdAt: `${dateForHistory(week, day)}T09:40:00.000Z`
            },
            ...["카페테리아", "야채", "그로서리"].map((target, index) => ({
              id: `memo-test-dept-${week}-${day}-${index}`,
              role: "department",
              department: target,
              authorLabel: target,
              text: `${target} 테스트 메모 ${week + 1}-${day + 1}`,
              createdAt: `${dateForHistory(week, day)}T${String(10 + index).padStart(2, "0")}:00:00.000Z`
            }))
          ],
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
      employees: defaultEmployees,
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
      employees: defaultEmployees,
      ingredients: defaultIngredients.map(normalizeIngredient),
      recipes,
      menus: buildDefaultMenus(recipes),
      history: []
    };
  }

  function normalizeMenu(menu) {
    if (!menu) return menu;
    const seed = defaultMenuSeeds.find((row) => row.nameKo === menu.nameKo || row.recipeName === menu.recipeName);
    const category = menu.category || seed?.category || "";
    return {
      ...menu,
      category,
      categoryEn: menu.categoryEn || menu.category_en || categoryEnglishLabels[category] || "",
      nameKo: menu.nameKo || menu.name || seed?.nameKo || "",
      nameEn: menu.nameEn || seed?.nameEn || "",
      sortOrder: Number.isFinite(Number(menu.sortOrder)) ? Number(menu.sortOrder) : 0
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

  function clearLegacyLocalData() {
    [
      "restaurant_access_codes",
      "restaurant_employees",
      "restaurant_sections",
      "restaurant_ingredients",
      "restaurant_recipes",
      "restaurant_menus",
      "restaurant_history",
      "restaurant_demo_seeded"
    ].forEach((key) => localStorage.removeItem(key));
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
    const session = getJson(keys.auth, null);
    if (!session) return null;
    const normalized = normalizeSession(session);
    if (JSON.stringify(normalized) !== JSON.stringify(session)) setJson(keys.auth, normalized);
    return normalized;
  }

  function normalizeTargetName(value) {
    const text = String(value || "").trim().toLowerCase();
    if (!text) return "";
    if (["카페테리아", "cafeteria", "cafe", "café"].includes(text)) return "카페테리아";
    if (["야채", "vegetable", "vegetables", "veggie", "veggies"].includes(text)) return "야채";
    if (["그로서리", "grocery", "groceries"].includes(text)) return "그로서리";
    return String(value || "").trim();
  }

  function normalizeSession(session) {
    if (!session || typeof session !== "object") return null;
    const department = normalizeTargetName(session.department || session.label);
    if (session.role === "department") {
      return {
        ...session,
        department,
        label: normalizeTargetName(session.label || department) || department
      };
    }
    return session;
  }

  function accessAccounts() {
    const source = Object.keys(dataState.accessAccounts).length ? dataState.accessAccounts : defaultAccessCodes;
    return Object.fromEntries(Object.entries(source).map(([password, account]) => [
      password,
      {
        ...account,
        userName: account.userName || account.user_name || password,
        name: account.name || account.label || account.department || account.role,
        label: account.label || account.name || account.department || account.role
      }
    ]));
  }

  function setAccessAccounts(accounts) {
    const next = accounts || defaultAccessCodes;
    dataState.accessAccounts = next;
    return syncQuietly(() => apiRequest("/access-accounts", {
      method: "PUT",
      body: JSON.stringify({ accessAccounts: next })
    }));
  }

  function authenticate(password) {
    const account = accessAccounts()[String(password || "").trim()];
    if (!account) return null;
    const session = normalizeSession({
      ...account,
      signedInAt: new Date().toISOString()
    });
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
    return "index.html";
  }

  async function apiRequest(path, options = {}) {
    const session = auth();
    const headerValue = (value) => encodeURIComponent(String(value || ""));
    const response = await fetch(`/api${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-Mukja-Member-Id": memberId(),
        "X-Mukja-Role": session?.role || "anonymous",
        "X-Mukja-Department": headerValue(session?.department),
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
    apiState.error = "";
    return data;
  }

  function syncQuietly(task) {
    return task().catch((error) => {
      apiState.checked = true;
      apiState.available = false;
      apiState.error = error?.message || "API unavailable";
      return { ok: false, error: apiState.error };
    });
  }

  async function checkDbHealth() {
    try {
      const data = await apiRequest("/health");
      return { ok: true, db: !!data.db, error: "" };
    } catch (error) {
      apiState.checked = true;
      apiState.available = false;
      apiState.error = error?.message || "API unavailable";
      return { ok: false, db: false, error: apiState.error };
    }
  }

  async function hydrateHistoryFromApi() {
    try {
      const data = await apiRequest("/history");
      const remoteHistory = Array.isArray(data.history) ? data.history : [];
      dataState.history = remoteHistory;
      return remoteHistory;
    } catch (error) {
      apiState.checked = true;
      apiState.available = false;
      apiState.error = error?.message || "API unavailable";
      return dataState.history;
    }
  }

  async function hydrateAccessAccountsFromApi() {
    try {
      const data = await apiRequest("/access-accounts");
      const remoteAccounts = data.accessAccounts && typeof data.accessAccounts === "object" ? data.accessAccounts : {};
      if (Object.keys(remoteAccounts).length) {
        dataState.accessAccounts = remoteAccounts;
      } else {
        dataState.accessAccounts = defaultAccessCodes;
        await apiRequest("/access-accounts", {
          method: "PUT",
          body: JSON.stringify({ accessAccounts: defaultAccessCodes })
        });
      }
    } catch {
      apiState.checked = true;
      apiState.available = false;
      dataState.accessAccounts = defaultAccessCodes;
    }
  }

  async function hydrateSettingsFromApi() {
    try {
      const data = await apiRequest("/settings");
      const settings = data.settings && typeof data.settings === "object" ? data.settings : {};
      dataState.sections = Array.isArray(settings.sections) && settings.sections.length ? settings.sections : defaultSections.slice();
      dataState.employees = Array.isArray(settings.employees) && settings.employees.length ? settings.employees : defaultEmployees.slice();
      dataState.requestCategories = settings.requestCategories && typeof settings.requestCategories === "object"
        ? { ...defaultRequestCategories, ...settings.requestCategories, "카페테리아": dataState.sections }
        : { ...defaultRequestCategories, "카페테리아": dataState.sections };
      dataState.standaloneMemos = Array.isArray(settings.standaloneMemos) ? settings.standaloneMemos : [];
      if (!Array.isArray(settings.sections) || !Array.isArray(settings.employees) || !settings.requestCategories || !Array.isArray(settings.standaloneMemos)) {
        await apiRequest("/settings", {
          method: "PUT",
          body: JSON.stringify({
            settings: {
              sections: dataState.sections,
              employees: dataState.employees,
              requestCategories: dataState.requestCategories,
              standaloneMemos: dataState.standaloneMemos
            }
          })
        });
      }
    } catch {
      apiState.checked = true;
      apiState.available = false;
    }
  }

  function syncSettings() {
    return syncQuietly(() => apiRequest("/settings", {
      method: "PUT",
      body: JSON.stringify({
        settings: {
          sections: dataState.sections,
          employees: dataState.employees,
          requestCategories: dataState.requestCategories,
          standaloneMemos: dataState.standaloneMemos
        }
      })
    }));
  }

  async function hydrateRecipesFromApi() {
    try {
      const data = await apiRequest("/recipes");
      const remoteRecipes = Array.isArray(data.recipes) ? data.recipes : [];
      if (remoteRecipes.length) {
        dataState.recipes = remoteRecipes.map(normalizeRecipe);
      } else {
        dataState.recipes = defaultRecipes.map(normalizeRecipe);
        await apiRequest("/recipes", {
          method: "PUT",
          body: JSON.stringify({ recipes: dataState.recipes })
        });
      }
    } catch {
      apiState.checked = true;
      apiState.available = false;
    }
  }

  async function hydrateMenusFromApi() {
    try {
      const data = await apiRequest("/menus");
      const remoteMenus = Array.isArray(data.menus) ? data.menus.map(normalizeMenu) : [];
      if (remoteMenus.length) {
        dataState.menus = remoteMenus;
      } else {
        const sourceRecipes = dataState.recipes.length ? dataState.recipes : defaultRecipes;
        dataState.menus = buildDefaultMenus(sourceRecipes).map(normalizeMenu);
        await apiRequest("/menus", {
          method: "PUT",
          body: JSON.stringify({ menus: dataState.menus })
        });
      }
    } catch {
      apiState.checked = true;
      apiState.available = false;
    }
  }

  async function hydrateIngredientsFromApi() {
    try {
      const data = await apiRequest("/ingredients");
      const remoteIngredients = Array.isArray(data.ingredients) ? data.ingredients.map(normalizeIngredient) : [];
      if (remoteIngredients.length) {
        dataState.ingredients = remoteIngredients;
      } else {
        dataState.ingredients = defaultIngredients.map(normalizeIngredient);
        await apiRequest("/ingredients", {
          method: "PUT",
          body: JSON.stringify({ ingredients: dataState.ingredients })
        });
      }
    } catch {
      apiState.checked = true;
      apiState.available = false;
    }
  }

  const datasetOrder = ["access", "settings", "ingredients", "history", "recipes", "menus"];
  const datasetLoaders = {
    access: hydrateAccessAccountsFromApi,
    settings: hydrateSettingsFromApi,
    ingredients: hydrateIngredientsFromApi,
    history: hydrateHistoryFromApi,
    recipes: hydrateRecipesFromApi,
    menus: hydrateMenusFromApi
  };

  function requestedDatasets(options) {
    const selected = Array.isArray(options)
      ? options
      : Array.isArray(options?.datasets)
        ? options.datasets
        : datasetOrder.filter((name) => name !== "access");
    return selected.includes("all")
      ? datasetOrder.filter((name) => name !== "access")
      : selected.filter((name) => datasetLoaders[name] && name !== "access");
  }

  async function loadDataset(name) {
    if (!datasetLoaders[name]) return;
    if (loadedDatasets.has(name)) return;
    if (!loadingDatasets.has(name)) {
      loadingDatasets.set(name, datasetLoaders[name]()
        .then(() => loadedDatasets.add(name))
        .finally(() => loadingDatasets.delete(name)));
    }
    await loadingDatasets.get(name);
  }

  async function loadDatasets(names) {
    await Promise.all(names
      .filter((name) => datasetLoaders[name])
      .map((name) => loadDataset(name)));
  }

  async function ensureData(datasets = []) {
    const selected = requestedDatasets({ datasets });
    const wanted = new Set([...selected, ...(Array.isArray(datasets) ? datasets : [])]);
    if (wanted.has("all")) {
      await loadDatasets(datasetOrder);
      return;
    }
    if (wanted.has("access")) await loadDataset("access");

    await loadDatasets(["settings", "recipes", "history"].filter((name) => wanted.has(name)));
    await loadDatasets(["ingredients", "menus"].filter((name) => wanted.has(name)));

    for (const name of datasetOrder) {
      if (!wanted.has(name)) continue;
      if (loadedDatasets.has(name)) continue;
      await loadDataset(name);
    }
  }

  function normalizeTarget(item) {
    if (!item) return item;
    const category = item.category || item.section || "";
    if (item.target === "마트") return { ...item, target: category === "야채" ? "야채" : "그로서리" };
    if (item.enabled === false && item.target && !defaultTargets.includes(item.target)) return item;
    if (!defaultTargets.includes(item.target)) return { ...item, target: category === "야채" ? "야채" : "그로서리" };
    return item;
  }

  function normalizeSection(item) {
    if (!item) return item;
    const category = item.category || item.section || "";
    if (["item-oil", "item-soy-sauce"].includes(item.id)) return { ...item, target: "카페테리아", category: "소스" };
    if (item.target !== "카페테리아") return item;
    if (category === "식재료") return { ...item, category: "냉장" };
    const cafeteriaSections = [...(dataState.sections.length ? dataState.sections : defaultSections), "기타"];
    if (!cafeteriaSections.includes(category)) return { ...item, category: "냉장" };
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
      nameEn: normalized.nameEn || normalized.name_en || seed?.nameEn || "",
      category: normalized.category || normalized.section || seed?.category || seed?.section || "",
      categoryEn: normalized.categoryEn || normalized.category_en || categoryEnglishLabels[normalized.category || normalized.section] || "",
      sortOrder: Number.isFinite(Number(normalized.sortOrder ?? normalized.sort_order))
        ? Number(normalized.sortOrder ?? normalized.sort_order)
        : 0
    };
  }

  async function init(options) {
    if (!localStorage.getItem(keys.lang)) localStorage.setItem(keys.lang, "ko");
    if (!localStorage.getItem(keys.mode)) localStorage.setItem(keys.mode, "simple");
    loadedDatasets.clear();
    loadingDatasets.clear();
    dataState.employees = defaultEmployees.slice();
    dataState.sections = defaultSections.slice();
    dataState.requestCategories = { ...defaultRequestCategories, "카페테리아": dataState.sections };
    dataState.accessAccounts = defaultAccessCodes;
    dataState.ingredients = defaultIngredients.map(normalizeIngredient);
    dataState.recipes = defaultRecipes.map(normalizeRecipe);
    dataState.menus = buildDefaultMenus(dataState.recipes).map(normalizeMenu);
    dataState.history = [];
    dataState.standaloneMemos = [];
    const pageDatasets = auth() ? requestedDatasets(options) : [];
    await Promise.all([
      ensureData(["access"]),
      pageDatasets.length ? ensureData(pageDatasets) : Promise.resolve()
    ]);
    clearLegacyLocalData();
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
    const header = ["id", "name", "nameEn", "section", "description", "descriptionEn", "ingredients", "ingredientsEn", "seasonings", "steps", "stepsEn", "stepItems", "stepItemsEn", "notes", "notesEn", "imageUrl", "enabled", "updatedAt"];
    const lines = [header.map(csvEscape).join(",")];
    rows.forEach((recipe) => {
      lines.push([
        recipe.id,
        recipe.name,
        recipe.nameEn,
        recipe.section,
        recipe.description,
        recipe.descriptionEn,
        recipeItemsToLines(recipe.ingredientItems?.length ? recipe.ingredientItems : recipe.ingredients),
        recipeItemsToLines(recipe.ingredientItemsEn?.length ? recipe.ingredientItemsEn : recipe.ingredientsEn),
        recipeItemsToLines(recipe.seasoningItems?.length ? recipe.seasoningItems : recipe.seasonings),
        recipeStepsToLines(recipe.stepItems?.length ? recipe.stepItems : recipe.steps),
        recipeStepsToLines(recipe.stepItemsEn?.length ? recipe.stepItemsEn : recipe.stepsEn),
        JSON.stringify(recipe.stepItems || []),
        JSON.stringify(recipe.stepItemsEn || []),
        recipe.notes,
        recipe.notesEn,
        recipe.imageUrl,
        recipe.enabled ? "true" : "false",
        recipe.updatedAt
      ].map(csvEscape).join(","));
    });
    return `\ufeff${lines.join("\n")}`;
  }

  function menusToCsv(rows) {
    const header = ["id", "recipeId", "category", "categoryEn", "nameKo", "nameEn", "seasonal", "discontinued", "price", "currency", "notes", "sortOrder"];
    const lines = [header.map(csvEscape).join(",")];
    rows.forEach((menu) => {
      lines.push([
        menu.id,
        menu.recipeId,
        menu.category,
        menu.categoryEn,
        menu.nameKo,
        menu.nameEn,
        menu.seasonal ? "true" : "false",
        menu.discontinued ? "true" : "false",
        menu.price,
        menu.currency || "CAD",
        menu.notes,
        menu.sortOrder
      ].map(csvEscape).join(","));
    });
    return `\ufeff${lines.join("\n")}`;
  }

  function ingredientsToCsv(rows) {
    const header = ["id", "nameKo", "nameEn", "target", "category", "categoryEn", "unit", "enabled", "sortOrder"];
    const lines = [header.map(csvEscape).join(",")];
    rows.forEach((item) => {
      lines.push([
        item.id,
        item.nameKo || item.name,
        item.nameEn || "",
        item.target || "",
        item.category || item.section || "",
        item.categoryEn || item.category_en || categoryEnglishLabels[item.category || item.section] || "",
        item.unit || "",
        item.enabled === false ? "false" : "true",
        item.sortOrder ?? ""
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
        category: field(row, map, ["카테고리", "category", "분류", "section"]),
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
      return [normalizeRecipe({
        id: field(row, map, ["id"]) || id("recipe"),
        name,
        nameEn: field(row, map, ["nameEn", "영문 레시피명", "englishName"]),
        section: field(row, map, ["section", "섹션", "Section"]) || "기타",
        description: field(row, map, ["description", "설명", "Description"]),
        descriptionEn: field(row, map, ["descriptionEn", "영문 설명", "English Description"]),
        ingredients: field(row, map, ["ingredients", "재료", "Ingredients"]),
        ingredientsEn: field(row, map, ["ingredientsEn", "영문 재료", "English Ingredients"]),
        seasonings: field(row, map, ["seasonings", "양념", "Seasonings"]),
        steps: field(row, map, ["steps", "조리 순서", "Steps"]),
        stepsEn: field(row, map, ["stepsEn", "영문 조리 순서", "English Steps"]),
        stepItems: (() => {
          try { return JSON.parse(field(row, map, ["stepItems", "step_items", "Step Items"]) || "[]"); }
          catch (_) { return []; }
        })(),
        stepItemsEn: (() => {
          try { return JSON.parse(field(row, map, ["stepItemsEn", "step_items_en", "English Step Items"]) || "[]"); }
          catch (_) { return []; }
        })(),
        notes: field(row, map, ["notes", "메모", "Notes"]),
        notesEn: field(row, map, ["notesEn", "영문 메모", "English Notes"]),
        imageUrl: field(row, map, ["imageUrl", "이미지 URL"]),
        enabled: field(row, map, ["enabled", "사용"]) !== "false",
        updatedAt: field(row, map, ["updatedAt", "수정일"]) || today()
      })];
    });
  }

  function menusFromCsv(text) {
    const rows = parseCsv(text);
    if (rows.length < 2) return [];
    const map = headerMap(rows[0]);
    return rows.slice(1).flatMap((row) => {
      const nameKo = field(row, map, ["nameKo", "메뉴명", "한글 메뉴명", "name", "Name"]);
      if (!nameKo) return [];
      return [normalizeMenu({
        id: field(row, map, ["id"]) || id("menu"),
        recipeId: field(row, map, ["recipeId", "recipe_id", "레시피ID"]),
        category: field(row, map, ["category", "카테고리"]),
        categoryEn: field(row, map, ["categoryEn", "category_en", "영문 카테고리", "English Category"]),
        nameKo,
        nameEn: field(row, map, ["nameEn", "영문 메뉴명", "englishName"]),
        seasonal: ["true", "Y", "1", "계절"].includes(field(row, map, ["seasonal", "계절메뉴"])),
        discontinued: ["true", "Y", "1", "판매중지"].includes(field(row, map, ["discontinued", "판매중지"])),
        price: field(row, map, ["price", "가격"]),
        currency: field(row, map, ["currency", "통화"]) || "CAD",
        notes: field(row, map, ["notes", "메모"]),
        sortOrder: field(row, map, ["sortOrder", "sort_order", "순서"])
      })];
    });
  }

  function ingredientsFromCsv(text) {
    const rows = parseCsv(text);
    if (rows.length < 2) return [];
    const map = headerMap(rows[0]);
    return rows.slice(1).flatMap((row, index) => {
      const nameKo = field(row, map, ["nameKo", "품목명", "재료명", "name", "Name"]);
      if (!nameKo) return [];
      return [normalizeIngredient({
        id: field(row, map, ["id"]) || id("item"),
        name: nameKo,
        nameKo,
        nameEn: field(row, map, ["nameEn", "영문명", "englishName"]),
        target: normalizeTargetName(field(row, map, ["target", "부서", "주문부서"])) || "카페테리아",
        category: field(row, map, ["category", "카테고리", "분류", "section"]) || "기타",
        categoryEn: field(row, map, ["categoryEn", "category_en", "영문 카테고리", "English Category"]),
        unit: field(row, map, ["unit", "주문 단위", "단위"]),
        enabled: field(row, map, ["enabled", "사용"]) !== "false",
        sortOrder: field(row, map, ["sortOrder", "sort_order", "순서"]) || index
      })];
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
      employees: dataState.employees.slice(),
      sections: dataState.sections.slice(),
      accessAccounts: accessAccounts(),
      ingredients: dataState.ingredients.map(normalizeIngredient),
      recipes: dataState.recipes.map(normalizeRecipe),
      menus: dataState.menus.map(normalizeMenu),
      history: dataState.history.slice(),
      standaloneMemos: dataState.standaloneMemos.slice()
    };
  }

  function importSettings(data) {
    if (!data || typeof data !== "object" || !Array.isArray(data.sections) || !Array.isArray(data.ingredients)) {
      throw new Error("Invalid settings");
    }
    localStorage.setItem(keys.mode, data.mode || "simple");
    localStorage.setItem(keys.lang, data.lang || "ko");
    dataState.employees = data.employees || [];
    dataState.sections = data.sections || defaultSections.slice();
    applyDataBundle({
      accessAccounts: data.accessAccounts || defaultAccessCodes,
      sections: dataState.sections,
      ingredients: data.ingredients || [],
      recipes: (data.recipes || []).map(normalizeRecipe),
      menus: data.menus || [],
      history: data.history || [],
      standaloneMemos: data.standaloneMemos || []
    });
  }

  function applyDataBundle(data) {
    localStorage.setItem(keys.mode, "simple");
    dataState.sections = data.sections || defaultSections.slice();
    dataState.employees = data.employees || defaultEmployees.slice();
    dataState.accessAccounts = data.accessAccounts || defaultAccessCodes;
    dataState.ingredients = (data.ingredients || []).map(normalizeIngredient);
    dataState.recipes = (data.recipes || []).map(normalizeRecipe);
    dataState.menus = (data.menus || []).map(normalizeMenu);
    dataState.history = data.history || [];
    dataState.standaloneMemos = Array.isArray(data.standaloneMemos) ? data.standaloneMemos : [];
    syncQuietly(() => apiRequest("/seed-data", {
      method: "PUT",
      body: JSON.stringify(data)
    }));
  }

  function seedTestData() {
    const data = testData();
    applyDataBundle(data);
    return data;
  }

  function resetDemoData() {
    const data = defaultData();
    applyDataBundle(data);
    return data;
  }

  function setHistory(history) {
    dataState.history = Array.isArray(history) ? history : [];
  }

  function saveHistoryEntry(entry) {
    const history = dataState.history;
    setHistory([entry, ...history.filter((row) => row.id !== entry.id)]);
    return syncQuietly(() => apiRequest("/history", {
      method: "POST",
      body: JSON.stringify({ entry })
    }));
  }

  function standaloneMemoKey(memo) {
    return [
      memo?.role || "",
      normalizeTargetName(memo?.department || ""),
      normalizeTargetName(memo?.authorLabel || "")
    ].join("|");
  }

  function saveStandaloneMemo(memo) {
    const text = String(memo?.text || "").trim();
    if (!text) return Promise.resolve({ ok: false, error: "empty memo" });
    const key = standaloneMemoKey(memo);
    const existing = dataState.standaloneMemos.find((row) => standaloneMemoKey(row) === key);
    const nextMemo = {
      ...memo,
      id: existing?.id || memo.id || id("memo"),
      text,
      createdAt: existing?.createdAt || memo.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    dataState.standaloneMemos = [
      nextMemo,
      ...dataState.standaloneMemos.filter((row) => standaloneMemoKey(row) !== key)
    ];
    return syncSettings();
  }

  function setStandaloneMemos(memos) {
    dataState.standaloneMemos = Array.isArray(memos) ? memos : [];
    return syncSettings();
  }

  function replaceHistory(history) {
    setHistory(history);
    return syncQuietly(() => apiRequest("/history", {
      method: "PUT",
      body: JSON.stringify({ history })
    }));
  }

  function deleteHistory(idValue) {
    setHistory(dataState.history.filter((entry) => entry.id !== idValue));
    return syncQuietly(() => apiRequest(`/history/${encodeURIComponent(idValue)}`, { method: "DELETE" }));
  }

  function clearHistory() {
    setHistory([]);
    return syncQuietly(() => apiRequest("/history", { method: "DELETE" }));
  }

  function setRecipes(recipes) {
    dataState.recipes = Array.isArray(recipes) ? recipes.map(normalizeRecipe) : [];
    return syncQuietly(() => apiRequest("/recipes", {
      method: "PUT",
      body: JSON.stringify({ recipes: dataState.recipes })
    }));
  }

  function saveRecipe(recipe) {
    const normalized = normalizeRecipe(recipe);
    const recipes = dataState.recipes;
    const next = recipes.some((row) => row.id === normalized.id)
      ? recipes.map((row) => row.id === normalized.id ? normalized : row)
      : [...recipes, normalized];
    dataState.recipes = next;
    return syncQuietly(() => apiRequest("/recipes", {
      method: "POST",
      body: JSON.stringify({ recipe: normalized })
    }));
  }

  function deleteRecipe(idValue) {
    dataState.recipes = dataState.recipes.filter((recipe) => recipe.id !== idValue);
    dataState.menus = dataState.menus.map((menu) =>
      menu.recipeId === idValue ? { ...menu, recipeId: "" } : menu
    );
    return syncQuietly(() => apiRequest(`/recipes/${encodeURIComponent(idValue)}`, { method: "DELETE" }));
  }

  function isEmptyRecipe(recipe) {
    if (!recipe) return false;
    return !recipe.description &&
      !recipe.ingredients &&
      !recipe.seasonings &&
      !recipe.steps &&
      !recipe.notes &&
      !(recipe.ingredientItems || []).length &&
      !(recipe.seasoningItems || []).length &&
      !(recipe.stepItems || []).length;
  }

  function setMenus(menus) {
    const normalized = (menus || []).map(normalizeMenu);
    dataState.menus = normalized;
    return syncQuietly(() => apiRequest("/menus", {
      method: "PUT",
      body: JSON.stringify({ menus: normalized })
    }));
  }

  function setIngredients(ingredients) {
    const normalized = (ingredients || []).map((item, index) => ({
      ...normalizeIngredient(item),
      sortOrder: index
    }));
    dataState.ingredients = normalized;
    return syncQuietly(() => apiRequest("/ingredients", {
      method: "PUT",
      body: JSON.stringify({ ingredients: normalized })
    }));
  }

  function saveMenu(menu) {
    const normalizedMenu = normalizeMenu(menu);
    const menus = dataState.menus;
    const next = menus.some((row) => row.id === normalizedMenu.id)
      ? menus.map((row) => row.id === normalizedMenu.id ? normalizedMenu : row)
      : [...menus, normalizedMenu];
    dataState.menus = next;
    return syncQuietly(() => apiRequest("/menus", {
      method: "POST",
      body: JSON.stringify({ menu: normalizedMenu })
    }));
  }

  function saveMenuWithRecipe(recipe, menu) {
    const normalizedRecipe = normalizeRecipe(recipe);
    const normalizedMenu = normalizeMenu(menu);
    dataState.recipes = dataState.recipes.some((row) => row.id === normalizedRecipe.id)
      ? dataState.recipes.map((row) => row.id === normalizedRecipe.id ? normalizedRecipe : row)
      : [...dataState.recipes, normalizedRecipe];
    dataState.menus = dataState.menus.some((row) => row.id === normalizedMenu.id)
      ? dataState.menus.map((row) => row.id === normalizedMenu.id ? normalizedMenu : row)
      : [...dataState.menus, normalizedMenu];
    return syncQuietly(async () => {
      await apiRequest("/recipes", {
        method: "POST",
        body: JSON.stringify({ recipe: normalizedRecipe })
      });
      await apiRequest("/menus", {
        method: "POST",
        body: JSON.stringify({ menu: normalizedMenu })
      });
    });
  }

  function discontinueMenu(idValue) {
    const menus = dataState.menus.map((menu) =>
      menu.id === idValue ? { ...menu, discontinued: true } : menu
    );
    setMenus(menus);
  }

  function deleteMenu(idValue) {
    const menu = dataState.menus.find((row) => row.id === idValue);
    dataState.menus = dataState.menus.filter((row) => row.id !== idValue);
    if (menu?.recipeId && !dataState.menus.some((row) => row.recipeId === menu.recipeId)) {
      const recipe = dataState.recipes.find((row) => row.id === menu.recipeId);
      if (isEmptyRecipe(recipe)) dataState.recipes = dataState.recipes.filter((row) => row.id !== menu.recipeId);
    }
    return syncQuietly(() => apiRequest(`/menus/${encodeURIComponent(idValue)}`, { method: "DELETE" }));
  }

  function menuCategories() {
    return Array.from(new Set(dataState.menus.map((menu) => menu.category).filter(Boolean)));
  }

  window.Store = {
    keys,
    init,
    ensureData,
    id,
    today,
    nowTime,
    getMode: () => localStorage.getItem(keys.mode) || "simple",
    setMode: (mode) => localStorage.setItem(keys.mode, mode),
    getEmployees: () => dataState.employees.slice(),
    setEmployees: (v) => {
      dataState.employees = Array.isArray(v) ? v : [];
      syncSettings();
    },
    getSections: () => dataState.sections.length ? dataState.sections.slice() : defaultSections.slice(),
    setSections: (v) => {
      dataState.sections = Array.isArray(v) ? v : defaultSections.slice();
      dataState.requestCategories = { ...dataState.requestCategories, "카페테리아": dataState.sections };
      syncSettings();
    },
    getRequestCategories: (target) => {
      const categories = dataState.requestCategories?.[target] || defaultRequestCategories[target] || [];
      return categories.slice();
    },
    setRequestCategories: (target, categories) => {
      dataState.requestCategories = {
        ...dataState.requestCategories,
        [target]: Array.isArray(categories) ? categories : (defaultRequestCategories[target] || [])
      };
      if (target === "카페테리아") dataState.sections = dataState.requestCategories[target].filter((category) => category !== "기타");
      return syncSettings();
    },
    getTargets: () => defaultTargets.slice(),
    normalizeTargetName,
    getAllowedTargets: allowedTargets,
    getIngredients: () => dataState.ingredients.slice(),
    setIngredients,
    getRecipes: () => dataState.recipes.slice(),
    setRecipes,
    saveRecipe,
    deleteRecipe,
    getMenus: () => dataState.menus.slice(),
    setMenus,
    saveMenu,
    saveMenuWithRecipe,
    discontinueMenu,
    deleteMenu,
    getMenuCategories: menuCategories,
    getHistory: () => dataState.history.slice(),
    getStandaloneMemos: () => dataState.standaloneMemos.slice(),
    saveStandaloneMemo,
    setStandaloneMemos,
    refreshHistory: hydrateHistoryFromApi,
    setHistory,
    addHistory: saveHistoryEntry,
    saveHistoryEntry,
    replaceHistory,
    deleteHistory,
    clearHistory,
    dbStatus: () => ({ ...apiState }),
    checkDbHealth,
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
    menusToCsv,
    menusFromCsv,
    ingredientsToCsv,
    ingredientsFromCsv,
    normalizeRecipe,
    parseRecipeItems,
    parseRecipeSteps,
    recipeItemsToLines,
    recipeStepsToLines,
    downloadText,
    exportSettings,
    importSettings
  };

  window.AppUI = {
    renderSidebar(active) {
      const sidebar = document.querySelector("[data-layout-sidebar]");
      if (!sidebar || !window.I18n) return;
      const session = auth();
      const roleBadgeLabel = (() => {
        if (!session) return "";
        if (session.role === "admin") return "A";
        if (session.role === "restaurant") return "R";
        if (session.department === "야채") return "V";
        if (session.department === "그로서리") return "G";
        return "C";
      })();
      const roleBadgeClass = roleBadgeLabel === "A" ? " is-admin" : "";
      const isRestricted = (key) => {
        if (key === "order") return !["restaurant", "admin"].includes(session?.role);
        if (key === "menus") return !["restaurant", "admin"].includes(session?.role);
        if (key === "admin") return session?.role !== "admin";
        return false;
      };
      const nav = [
        ["home", "index.html", '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>'],
        ["history", "history.html", '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>'],
        ["order", "order.html", '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="6" r="3"/><path d="M5 9v12"/><path d="m15 9-3-3 3-3"/><path d="M12 6h5a2 2 0 0 1 2 2v3"/><path d="M19 15v6"/><path d="M22 18h-6"/></svg>'],
        ["menus", "menu.html", '<svg viewBox="0 0 24 24" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 8h10"/><path d="M7 12h10"/><path d="M7 16h10"/></svg>'],
        ["admin", "admin.html", '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.051 12.616a1 1 0 0 1 1.909.024l.737 1.452a1 1 0 0 0 .737.535l1.634.256a1 1 0 0 1 .588 1.806l-1.172 1.168a1 1 0 0 0-.282.866l.259 1.613a1 1 0 0 1-1.541 1.134l-1.465-.75a1 1 0 0 0-.912 0l-1.465.75a1 1 0 0 1-1.539-1.133l.258-1.613a1 1 0 0 0-.282-.866l-1.156-1.153a1 1 0 0 1 .572-1.822l1.633-.256a1 1 0 0 0 .737-.535z"/><path d="M8 15H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/></svg>']
      ];
      const sidebarStateKey = "restaurant_sidebar_collapsed";
      localStorage.setItem(sidebarStateKey, "1");
      const sidebarCollapsed = true;
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
                ${roleBadgeLabel ? `
                  <svg class="sidebar-role-badge${roleBadgeClass}" viewBox="0 0 28 28" aria-hidden="true">
                    <circle cx="14" cy="14" r="13" />
                    <text x="14" y="14" dominant-baseline="central" text-anchor="middle">${roleBadgeLabel}</text>
                  </svg>
                ` : ""}
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
      `;
      const sidebarToggle = sidebar.querySelector("[data-sidebar-toggle]");
      if (sidebarToggle) {
        sidebarToggle.addEventListener("click", () => {
          const collapsed = document.body.classList.toggle("sidebar-collapsed");
          localStorage.setItem(sidebarStateKey, "1");
          sidebarToggle.setAttribute("aria-expanded", String(!collapsed));
          sidebarToggle.setAttribute("aria-label", collapsed ? "메뉴 열기" : "메뉴 닫기");
        });
      }
      sidebar.querySelectorAll(".nav-link:not(.is-restricted)").forEach((link) => {
        link.addEventListener("click", () => {
          localStorage.setItem(sidebarStateKey, "1");
        });
      });
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
            localStorage.setItem("restaurant_sidebar_collapsed", "1");
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
        const cleanupKey = `mukja_sw_cleanup_${appAssetVersion}`;
        if (sessionStorage.getItem(cleanupKey)) return;
        const clearCaches = () => {
          if (!window.caches) return Promise.resolve();
          return caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))));
        };
        const cleanup = () => {
          sessionStorage.setItem(cleanupKey, "1");
          navigator.serviceWorker.getRegistrations()
            .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
            .then(clearCaches)
            .catch(() => {});
        };
        if ("requestIdleCallback" in window) {
          window.requestIdleCallback(cleanup, { timeout: 3000 });
        } else {
          window.setTimeout(cleanup, 1200);
        }
      }
    }
  };
})();
