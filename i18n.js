(function () {
  const translations = {
    ko: {
      appName: "먹자 골목 관리",
      appSubtitle: "식당 재료 주문과 레시피를 한 곳에서 관리합니다.",
      today: "오늘",
      homeLead: "오늘 필요한 업무를 바로 시작하세요.",
      orderCtaHelp: "재료 체크리스트와 공유 문구 생성",
      recipeCtaHelp: "조리법 검색과 상세 확인",
      adminCtaHelp: "재료, 직원, 주문 리스트, 레시피 관리",
      todayOrders: "오늘 주문",
      activeIngredients: "사용 재료",
      activeRecipes: "사용 레시피",
      lastOrder: "마지막 주문 내역",
      lastRequest: "마지막 요청 내역",
      noLastOrder: "아직 저장된 주문내역이 없습니다.",
      sampleData: "샘플",
      more: "more...",
      saveReceived: "입고 확인 저장",
      receivedSaved: "입고 내역을 저장했습니다.",
      home: "홈",
      order: "요청 하기",
      recipes: "레시피",
      menus: "메뉴",
      menu: "메뉴",
      menuCategory: "카테고리",
      price: "가격",
      activeMenu: "판매중",
      discontinuedMenu: "판매 중단",
      seasonalMenu: "계절 메뉴",
      menuDetail: "메뉴 레시피",
      noMenus: "표시할 메뉴가 없습니다.",
      searchMenus: "메뉴 검색",
      noAccess: "이 기능을 사용할 권한이 없습니다.",
      detail: "상세",
      close: "닫기",
      received: "입고",
      receivedRequests: "받은 요청",
      noDepartmentRequests: "받은 요청이 없습니다.",
      receiptStatus: "입고 현황",
      restaurantReceiptStatus: "전체 부서 입고 확인",
      receivedCount: "입고",
      history: "요청 내역",
      admin: "관리자",
      language: "언어 선택",
      korean: "한국어",
      english: "English",
      createRequest: "주문하기",
      requestList: "요청 하기",
      viewRecipes: "레시피 보기",
      quickLinks: "빠른 메뉴",
      orderTitle: "재료 요청",
      orderSubtitle: "필요한 재료를 선택하고 공유 문구를 만듭니다.",
      requester: "요청자",
      section: "섹션",
      target: "주문 부서",
      all: "전체",
      mart: "마트",
      cafeteria: "카페테리아",
      vegetableTeam: "야채",
      grocery: "그로서리",
      vegetableGrocery: "야채 / 그로서리",
      memo: "메모",
      addMemo: "메모 추가",
      noMemo: "표시할 메모가 없습니다.",
      memoNone: "메모 없음",
      memoPlaceholder: "특이사항을 적어주세요.",
      createMessage: "요청 메시지 만들기",
      saveAndCreateMessage: "저장 및 요청 메시지 만들기",
      addOrder: "주문 추가",
      copyMessage: "문구 복사",
      copyCafeteriaMessage: "메시지 복사 (카페테리아)",
      copyGroceryMessage: "메시지 복사 (야채 / 그로서리)",
      saveHistory: "주문내역 저장",
      downloadTodayCsv: "오늘 CSV 다운로드",
      reset: "초기화",
      confirmResetRequest: "선택한 품목과 메모를 초기화할까요?",
      preview: "요청 메시지 미리보기",
      selectItems: "재료 선택",
      noItems: "표시할 재료가 없습니다.",
      chooseAtLeastOne: "재료를 하나 이상 선택해주세요.",
      chooseItemOrMemo: "품목을 선택하거나 메모를 입력해주세요.",
      copied: "문구를 복사했습니다.",
      saved: "주문내역에 저장했습니다.",
      shareFallback: "공유를 사용할 수 없어 문구를 복사했습니다.",
      date: "날짜",
      time: "시간",
      mode: "모드",
      employee: "직원",
      items: "품목",
      quantity: "수량",
      unit: "단위",
      message: "메시지",
      dateFilter: "날짜 필터",
      downloadDateCsv: "선택 날짜 CSV 다운로드",
      downloadAllCsv: "전체 CSV 다운로드",
      clearAll: "전체 삭제",
      delete: "삭제",
      noHistory: "저장된 주문내역이 없습니다.",
      confirmClear: "모든 주문내역을 삭제할까요?",
      search: "검색",
      searchRecipes: "레시피 검색",
      recipeDetail: "레시피 상세",
      ingredients: "재료",
      seasonings: "양념",
      steps: "조리 순서",
      notes: "메모",
      updatedAt: "수정일",
      noRecipes: "표시할 레시피가 없습니다.",
      login: "로그인",
      logout: "로그아웃",
      accessPassword: "입장 비밀번호",
      enter: "입장",
      currentRole: "현재 권한",
      adminAccessRequired: "관리자 비밀번호가 필요합니다.",
      password: "비밀번호",
      unlockAdmin: "관리자 열기",
      wrongPassword: "비밀번호가 올바르지 않습니다.",
      duplicatePassword: "이미 사용 중인 비밀번호입니다.",
      adminNote: "이 비밀번호는 실수 방지용이며 실제 보안 기능이 아닙니다.",
      employeeManagement: "직원 관리",
      passwordManagement: "비밀번호 관리",
      dataManagement: "CSV 데이터 관리",
      refresh: "새로고침",
      add: "추가",
      save: "저장",
      edit: "수정",
      enabled: "사용",
      disabled: "중지",
      name: "이름",
      englishName: "영문 이름",
      description: "설명",
      imageUrl: "이미지 URL",
      importInvalid: "가져올 JSON 형식이 올바르지 않습니다.",
      importDone: "가져오기가 완료됐습니다.",
      exportDone: "내보내기가 완료됐습니다.",
      csvImportInvalid: "CSV 형식이 올바르지 않습니다.",
      csvImportDone: "CSV를 가져왔습니다.",
      confirmImport: "현재 설정을 가져온 파일로 교체할까요?",
      confirmCsvImport: "현재 데이터를 가져온 CSV로 교체할까요?",
      emptyMessage: "메시지를 먼저 만들어주세요."
    },
    en: {
      appName: "Mokja Alley Management",
      appSubtitle: "Manage ingredient requests and recipes in one place.",
      today: "Today",
      homeLead: "Start today's restaurant work quickly.",
      orderCtaHelp: "Ingredient checklist and share message",
      recipeCtaHelp: "Search and view recipe details",
      adminCtaHelp: "Manage ingredients, staff, order list, and recipes",
      todayOrders: "Today's Orders",
      activeIngredients: "Active Ingredients",
      activeRecipes: "Active Recipes",
      lastOrder: "Last Order",
      lastRequest: "Last Request",
      noLastOrder: "No saved order history yet.",
      sampleData: "Sample",
      more: "more...",
      saveReceived: "Save Received",
      receivedSaved: "Received items saved.",
      home: "Home",
      order: "Request",
      recipes: "Recipes",
      menus: "Menu",
      menu: "Menu",
      menuCategory: "Category",
      price: "Price",
      activeMenu: "Active",
      discontinuedMenu: "Discontinued",
      seasonalMenu: "Seasonal",
      menuDetail: "Menu Recipe",
      noMenus: "No menu items to show.",
      searchMenus: "Search menu",
      noAccess: "You do not have access to this feature.",
      detail: "Detail",
      close: "Close",
      received: "Received",
      receivedRequests: "Received Requests",
      noDepartmentRequests: "No received requests.",
      receiptStatus: "Receipt Status",
      restaurantReceiptStatus: "All department receipt status",
      receivedCount: "received",
      history: "Request History",
      admin: "Admin",
      language: "Language",
      korean: "한국어",
      english: "English",
      createRequest: "Create Request",
      requestList: "Create Request",
      viewRecipes: "View Recipes",
      quickLinks: "Quick Links",
      orderTitle: "Ingredient Request",
      orderSubtitle: "Select ingredients and create a shareable request.",
      requester: "Requester",
      section: "Section",
      target: "Order Team",
      all: "All",
      mart: "Mart",
      cafeteria: "Cafeteria",
      vegetableTeam: "Vegetables",
      grocery: "Grocery",
      vegetableGrocery: "Vegetables / Grocery",
      memo: "Memo",
      addMemo: "Add Memo",
      noMemo: "No memos to show.",
      memoNone: "No memo",
      memoPlaceholder: "Add notes if needed.",
      createMessage: "Create Request Message",
      saveAndCreateMessage: "Save and Create Message",
      addOrder: "Add Order",
      copyMessage: "Copy Message",
      copyCafeteriaMessage: "Copy Message (Cafeteria)",
      copyGroceryMessage: "Copy Message (Vegetables / Grocery)",
      saveHistory: "Save Request History",
      downloadTodayCsv: "Download Today's CSV",
      reset: "Reset",
      confirmResetRequest: "Reset selected items and memo?",
      preview: "Request Message Preview",
      selectItems: "Select Ingredients",
      noItems: "No ingredients to show.",
      chooseAtLeastOne: "Select at least one ingredient.",
      chooseItemOrMemo: "Select an item or add a memo.",
      copied: "Message copied.",
      saved: "Saved to request history.",
      shareFallback: "Share is unavailable, so the message was copied.",
      date: "Date",
      time: "Time",
      mode: "Mode",
      employee: "Employee",
      items: "Items",
      quantity: "Quantity",
      unit: "Unit",
      message: "Message",
      dateFilter: "Date Filter",
      downloadDateCsv: "Download Selected Date CSV",
      downloadAllCsv: "Download All CSV",
      clearAll: "Clear All",
      delete: "Delete",
      noHistory: "No saved request history.",
      confirmClear: "Delete all request history?",
      search: "Search",
      searchRecipes: "Search recipes",
      recipeDetail: "Recipe Detail",
      ingredients: "Ingredients",
      seasonings: "Seasonings",
      steps: "Steps",
      notes: "Notes",
      updatedAt: "Updated",
      noRecipes: "No recipes to show.",
      login: "Login",
      logout: "Logout",
      accessPassword: "Access Password",
      enter: "Enter",
      currentRole: "Current Role",
      adminAccessRequired: "Admin password is required.",
      password: "Password",
      unlockAdmin: "Open Admin",
      wrongPassword: "Password is incorrect.",
      duplicatePassword: "This password is already in use.",
      adminNote: "This password only prevents accidental edits. It is not real security.",
      employeeManagement: "Employee Management",
      passwordManagement: "Password Management",
      dataManagement: "CSV Data Management",
      refresh: "Refresh",
      add: "Add",
      save: "Save",
      edit: "Edit",
      enabled: "Enabled",
      disabled: "Disabled",
      name: "Name",
      englishName: "English Name",
      description: "Description",
      imageUrl: "Image URL",
      importInvalid: "The JSON format is invalid.",
      importDone: "Import completed.",
      exportDone: "Export completed.",
      csvImportInvalid: "The CSV format is invalid.",
      csvImportDone: "CSV imported.",
      confirmImport: "Replace current settings with the imported file?",
      confirmCsvImport: "Replace current data with the imported CSV?",
      emptyMessage: "Create a message first."
    }
  };

  const sectionLabels = {
    ko: { "반조리": "반조리", "야채": "야채", "반찬": "반찬", "소스": "소스", "식재료": "식재료", "상온": "상온", "냉장": "냉장", "냉동": "냉동", "기타": "기타" },
    en: { "반조리": "Semi-prepared", "야채": "Vegetables", "반찬": "Side Dishes", "소스": "Sauces", "식재료": "Ingredients", "상온": "Room Temp", "냉장": "Refrigerated", "냉동": "Frozen", "기타": "Other" }
  };

  function lang() {
    return localStorage.getItem("restaurant_lang") || "ko";
  }

  function t(key) {
    return (translations[lang()] && translations[lang()][key]) || translations.ko[key] || key;
  }

  function targetLabel(target) {
    if (lang() === "en") {
      if (target === "마트" || target === "그로서리") return "Grocery";
      if (target === "카페테리아") return "Cafeteria";
      if (target === "야채") return "Vegetables";
      return target;
    }
    return target;
  }

  function sectionLabel(section) {
    return (sectionLabels[lang()] && sectionLabels[lang()][section]) || section;
  }

  function roleLabel(role) {
    const labels = {
      ko: {
        "카페테리아": "카페테리아",
        "야채": "야채",
        "그로서리": "그로서리",
        "레스토랑": "레스토랑",
        "관리자": "관리자"
      },
      en: {
        "카페테리아": "Cafeteria",
        "야채": "Vegetables",
        "그로서리": "Grocery",
        "레스토랑": "Restaurant",
        "관리자": "Admin"
      }
    };
    return labels[lang()]?.[role] || role;
  }

  function itemName(item) {
    if (!item) return "";
    return lang() === "en" ? (item.nameEn || item.name || item.nameKo || "") : (item.nameKo || item.name || "");
  }

  function menuName(menu) {
    if (!menu) return "";
    return lang() === "en" ? (menu.nameEn || menu.nameKo || "") : (menu.nameKo || menu.nameEn || "");
  }

  function secondaryMenuName(menu) {
    if (!menu) return "";
    return lang() === "en" ? (menu.nameKo || "") : (menu.nameEn || "");
  }

  function applyI18n() {
    document.documentElement.lang = lang();
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    document.querySelectorAll("[data-lang-button]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.langButton === lang());
    });
  }

  window.I18n = { translations, lang, t, targetLabel, sectionLabel, roleLabel, itemName, menuName, secondaryMenuName, applyI18n };
})();
