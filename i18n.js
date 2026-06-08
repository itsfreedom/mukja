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
      cancel: "취소",
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
      grocery: "매장",
      vegetableGrocery: "야채 / 매장",
      memo: "메모",
      addMemo: "메모 추가",
      noMemo: "표시할 메모가 없습니다.",
      memoNone: "메모 없음",
      memoPlaceholder: "특이사항을 적어주세요.",
      createMessage: "요청 메시지 만들기",
      departmentMessages: "부서별 요청 메시지",
      requestTotalSummary: "총 {count}개의 품목을 요청합니다.",
      saveAndCreateMessage: "저장 및 요청 메시지 만들기",
      addOrder: "주문 추가",
      copyMessage: "문구 복사",
      openKakao: "카톡 열기",
      copyAndOpenKakao: "문자 복사 / 카톡 열기",
      copyCafeteriaMessage: "메시지 복사 (카페테리아)",
      copyGroceryMessage: "메시지 복사 (야채 / 매장)",
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
      copiedOpeningKakao: "문구를 복사했습니다. 카톡을 엽니다.",
      saved: "주문내역에 저장했습니다.",
      memoSaved: "메모를 저장했습니다.",
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
      duplicateDepartmentName: "이미 있는 부서명입니다.",
      departmentName: "부서명",
      departmentNameRequired: "부서명을 입력하세요.",
      departmentRequired: "사용 중인 부서가 하나 이상 필요합니다.",
      departmentInUse: "이 부서를 사용하는 데이터가 있어 삭제할 수 없습니다.",
      confirmDeleteDepartment: "{name} 부서를 삭제할까요?",
      adminNote: "이 비밀번호는 실수 방지용이며 실제 보안 기능이 아닙니다.",
      employeeManagement: "직원 관리",
      passwordManagement: "비밀번호 관리",
      departmentManagement: "부서 관리",
      dataManagement: "CSV 데이터 관리",
      csvManagement: "데이터 백업",
      dataBackup: "데이터 백업",
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
      ,
      readonlyMemoTitle: "타부서에서 작성한 메모",
      readOnly: "수정 불가",
      itemName: "품목명",
      categoryName: "카테고리명",
      department: "부서",
      orderUnit: "주문 단위",
      selectedItemCount: "선택된 {count}개 품목",
      categoryAdd: "카테고리 추가",
      collapseCategory: "접기",
      expandCategory: "펼치기",
      saveDone: "저장했습니다.",
      resetDone: "초기화했습니다.",
      categoryRequired: "카테고리명을 입력하세요.",
      categoryDuplicate: "이미 있는 카테고리입니다.",
      duplicateCategoryName: "{department} 부서에 이미 같은 카테고리명({name})이 있습니다.",
      defaultCategoryProtected: "기타 카테고리는 삭제하거나 이름을 바꿀 수 없습니다.",
      duplicateIngredientName: "{department} 부서에 이미 같은 품목명({name})이 있습니다.",
      ingredientKoreanNameRequired: "품목 한글명을 입력하세요.",
      ingredientEnglishNameRequired: "품목 영문명을 입력하세요.",
      categoryNotFound: "카테고리를 찾을 수 없습니다.",
      confirmDeleteCategory: "{name} 카테고리를 삭제할까요? 이 카테고리의 품목은 {fallback}로 이동합니다.",
      confirmDeleteItem: "{name} 품목을 삭제할까요?",
      outgoingConfirm: "출고 확인",
      incomingConfirm: "입고 확인",
      detailHistory: "상세 내역",
      updatedNotice: "수정되었습니다.",
      ingredientName: "재료명",
      amount: "수량",
      photoUrl: "사진 URL",
      photo: "사진",
      choosePhoto: "사진 선택",
      changePhoto: "사진 변경",
      removePhoto: "사진 삭제",
      addIngredient: "재료 추가",
      addStep: "조리 순서 추가",
      editRecipe: "레시피 수정",
      autoGeneratedRecipeNote: "레시피는 메뉴 생성 시 자동 생성됩니다.",
      confirmDeleteRecipe: "{name} 레시피를 삭제할까요?",
      confirmDeleteIngredient: "재료를 삭제할까요?",
      confirmDeleteStep: "조리 순서를 삭제할까요?",
      koreanMenuName: "한글 메뉴명",
      englishMenuName: "영문 메뉴명",
      activeSale: "판매",
      inactiveSale: "판매 중지",
      addMenu: "메뉴 추가",
      editMenu: "메뉴 수정",
      duplicateMenuName: "이미 같은 메뉴명({name})이 있습니다.",
      menuKoreanNameRequired: "메뉴 한글명을 입력하세요.",
      menuEnglishNameRequired: "메뉴 영문명을 입력하세요.",
      confirmSaveMenu: "메뉴 정보를 저장할까요?",
      confirmDiscontinueMenu: "메뉴를 판매 중지 상태로 저장할까요?",
      moveOrder: "순서 이동",
      top: "맨위",
      previous: "이전",
      next: "다음",
      bottom: "맨아래",
      move: "이동",
      orderMode: "주문 모드",
      editMode: "수정 모드",
      viewMode: "보기 모드",
      request: "요청",
      requestHistoryCsv: "요청 내역",
      ingredientListCsv: "재료 목록",
      exportCsv: "CSV 내보내기",
      importCsv: "CSV 가져오기"
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
      cancel: "Cancel",
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
      grocery: "Store",
      vegetableGrocery: "Vegetables / Store",
      memo: "Memo",
      addMemo: "Add Memo",
      noMemo: "No memos to show.",
      memoNone: "No memo",
      memoPlaceholder: "Add notes if needed.",
      createMessage: "Create Request Message",
      departmentMessages: "Department Request Messages",
      requestTotalSummary: "Requesting {count} items in total.",
      saveAndCreateMessage: "Save and Create Message",
      addOrder: "Add Order",
      copyMessage: "Copy Message",
      openKakao: "Open KakaoTalk",
      copyAndOpenKakao: "Copy Text / Open KakaoTalk",
      copyCafeteriaMessage: "Copy Message (Cafeteria)",
      copyGroceryMessage: "Copy Message (Vegetables / Store)",
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
      copiedOpeningKakao: "Message copied. Opening KakaoTalk.",
      saved: "Saved to request history.",
      memoSaved: "Memo saved.",
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
      duplicateDepartmentName: "This department already exists.",
      departmentName: "Department Name",
      departmentNameRequired: "Enter a department name.",
      departmentRequired: "At least one enabled department is required.",
      departmentInUse: "This department is used by existing data and cannot be deleted.",
      confirmDeleteDepartment: "Delete {name}?",
      adminNote: "This password only prevents accidental edits. It is not real security.",
      employeeManagement: "Employee Management",
      passwordManagement: "Password Management",
      departmentManagement: "Department Management",
      dataManagement: "CSV Data Management",
      csvManagement: "Data Backup",
      dataBackup: "Data Backup",
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
      emptyMessage: "Create a message first.",
      readonlyMemoTitle: "Memos From Other Teams",
      readOnly: "Read-only",
      itemName: "Item Name",
      categoryName: "Category Name",
      department: "Department",
      orderUnit: "Order Unit",
      selectedItemCount: "{count} selected items",
      categoryAdd: "Add Category",
      collapseCategory: "Collapse",
      expandCategory: "Expand",
      saveDone: "Saved.",
      resetDone: "Reset.",
      categoryRequired: "Enter a category name.",
      categoryDuplicate: "This category already exists.",
      duplicateCategoryName: "{department} already has a category named {name}.",
      defaultCategoryProtected: "The Other category cannot be deleted or renamed.",
      duplicateIngredientName: "{department} already has an item named {name}.",
      ingredientKoreanNameRequired: "Enter the item Korean name.",
      ingredientEnglishNameRequired: "Enter the item English name.",
      categoryNotFound: "Category not found.",
      confirmDeleteCategory: "Delete the {name} category? Items in this category will move to {fallback}.",
      confirmDeleteItem: "Delete {name}?",
      outgoingConfirm: "Outgoing",
      incomingConfirm: "Received",
      detailHistory: "Details",
      updatedNotice: "Updated.",
      ingredientName: "Ingredient",
      amount: "Amount",
      photoUrl: "Photo URL",
      photo: "Photo",
      choosePhoto: "Choose Photo",
      changePhoto: "Change Photo",
      removePhoto: "Remove Photo",
      addIngredient: "Add Ingredient",
      addStep: "Add Step",
      editRecipe: "Edit Recipe",
      autoGeneratedRecipeNote: "Recipes are created automatically when menus are created.",
      confirmDeleteRecipe: "Delete {name} recipe?",
      confirmDeleteIngredient: "Delete this ingredient?",
      confirmDeleteStep: "Delete this cooking step?",
      koreanMenuName: "Korean Menu Name",
      englishMenuName: "English Menu Name",
      activeSale: "Active",
      inactiveSale: "Discontinued",
      addMenu: "Add Menu",
      editMenu: "Edit Menu",
      duplicateMenuName: "A menu named {name} already exists.",
      menuKoreanNameRequired: "Enter the Korean menu name.",
      menuEnglishNameRequired: "Enter the English menu name.",
      confirmSaveMenu: "Save menu information?",
      confirmDiscontinueMenu: "Save this menu as discontinued?",
      moveOrder: "Move Order",
      top: "Top",
      previous: "Pre",
      next: "Next",
      bottom: "Bottom",
      move: "Move",
      orderMode: "Order Mode",
      editMode: "Edit Mode",
      viewMode: "View Mode",
      request: "Request",
      requestHistoryCsv: "Request History",
      ingredientListCsv: "Ingredient List",
      exportCsv: "Export CSV",
      importCsv: "Import CSV"
    }
  };

  const sectionLabels = {
    ko: { "반조리": "반조리", "야채": "야채", "반찬": "반찬", "소스": "소스", "식재료": "식재료", "상온": "상온", "냉장": "냉장", "냉동": "냉동", "기타": "기타", "고기": "고기", "해물": "해물", "신선": "신선", "두부": "두부", "분말": "분말", "소스류": "소스류", "곡류": "곡류", "면류": "면류", "건나물": "건나물", "포장 박스": "포장 박스", "식사": "식사", "찌개": "찌개", "사이드": "사이드", "분식": "분식", "덮밥": "덮밥", "국": "국", "면": "면" },
    en: { "반조리": "Semi-prepared", "야채": "Vegetables", "반찬": "Side Dishes", "소스": "Sauces", "식재료": "Ingredients", "상온": "Room Temp", "냉장": "Refrigerated", "냉동": "Frozen", "기타": "Other", "고기": "Meat", "해물": "Seafood", "신선": "Fresh", "두부": "Tofu", "분말": "Powder", "소스류": "Sauces", "곡류": "Grains", "면류": "Noodles", "건나물": "Dried Vegetables", "포장 박스": "Packaging", "식사": "Meals", "찌개": "Stews", "사이드": "Sides", "분식": "Bunsik", "덮밥": "Rice Bowls", "국": "Soups", "면": "Noodles" }
  };

  function lang() {
    return localStorage.getItem("restaurant_lang") || "ko";
  }

  function t(key) {
    return (translations[lang()] && translations[lang()][key]) || translations.ko[key] || key;
  }

  function format(key, values = {}) {
    return Object.entries(values).reduce((text, [name, value]) =>
      text.replaceAll(`{${name}}`, value), t(key));
  }

  function targetLabel(target) {
    const normalized = window.Store?.normalizeTargetName?.(target) || target;
    if (lang() === "en") {
      const department = window.Store?.getDepartments?.().find((row) => row.name === normalized || row.name === target);
      if (department?.nameEn) return department.nameEn;
      if (target === "마트" || normalized === "매장") return "Store";
      if (normalized === "먹자") return "Mukja";
      if (normalized === "카페테리아") return "Cafeteria";
      if (normalized === "야채") return "Vegetables";
      return normalized;
    }
    return normalized;
  }

  function sectionLabel(section) {
    return (sectionLabels[lang()] && sectionLabels[lang()][section]) || section;
  }

  function menuCategoryLabel(category, row = {}) {
    if (lang() === "en") return row.categoryEn || sectionLabel(category);
    return category;
  }

  function roleLabel(role) {
    const normalized = window.Store?.normalizeTargetName?.(role) || role;
    if (lang() === "en") {
      const department = window.Store?.getDepartments?.().find((row) => row.name === normalized || row.name === role);
      if (department?.nameEn) return department.nameEn;
    }
    const labels = {
      ko: {
        "카페테리아": "카페테리아",
        "야채": "야채",
        "매장": "매장",
        "먹자": "먹자",
        "레스토랑": "레스토랑",
        "관리자": "관리자"
      },
      en: {
        "카페테리아": "Cafeteria",
        "야채": "Vegetables",
        "매장": "Store",
        "먹자": "Mukja",
        "레스토랑": "Restaurant",
        "관리자": "Admin"
      }
    };
    return labels[lang()]?.[normalized] || normalized;
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

  function recipeName(recipe) {
    if (!recipe) return "";
    return lang() === "en" ? (recipe.nameEn || recipe.name || "") : (recipe.name || recipe.nameEn || "");
  }

  function recipeDescription(recipe) {
    if (!recipe) return "";
    return lang() === "en" ? (recipe.descriptionEn || recipe.description || "") : (recipe.description || recipe.descriptionEn || "");
  }

  function recipeIngredientItems(recipe) {
    if (!recipe) return [];
    return lang() === "en" && recipe.ingredientItemsEn?.length ? recipe.ingredientItemsEn : recipe.ingredientItems || [];
  }

  function recipeStepItems(recipe) {
    if (!recipe) return [];
    return lang() === "en" && recipe.stepItemsEn?.length ? recipe.stepItemsEn : recipe.stepItems || [];
  }

  function recipeNotes(recipe) {
    if (!recipe) return "";
    return lang() === "en" ? (recipe.notesEn || recipe.notes || "") : (recipe.notes || recipe.notesEn || "");
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
    document.body?.classList.add("i18n-ready");
  }

  window.I18n = { translations, lang, t, format, targetLabel, sectionLabel, menuCategoryLabel, roleLabel, itemName, menuName, secondaryMenuName, recipeName, recipeDescription, recipeIngredientItems, recipeStepItems, recipeNotes, applyI18n };
})();
