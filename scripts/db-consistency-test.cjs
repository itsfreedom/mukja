const { JSDOM } = require("jsdom");
const fs = require("node:fs/promises");
const path = require("node:path");

const cwd = process.cwd();
const site = "https://mukjamtl.netlify.app";
const apiHeaders = {
  "Content-Type": "application/json",
  "X-Mukja-Member-Id": "db-consistency-test",
  "X-Mukja-Role": "admin",
  "X-Mukja-Department": ""
};
const sessions = {
  admin: { role: "admin", department: "", label: "관리자" },
  restaurant: { role: "restaurant", department: "", label: "레스토랑" },
  cafeteria: { role: "department", department: "카페테리아", label: "카페테리아" },
  vegetable: { role: "department", department: "야채", label: "야채" },
  grocery: { role: "department", department: "매장", label: "매장" }
};
const local = (file) => fs.readFile(path.join(cwd, file), "utf8");
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function req(pathname, options = {}) {
  const response = await fetch(`${site}/api${pathname}`, {
    ...options,
    headers: { ...apiHeaders, ...(options.headers || {}) }
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!response.ok || data.ok === false) {
    throw new Error(`${options.method || "GET"} ${pathname} ${response.status} ${data.error || text}`);
  }
  return data;
}

async function waitUntil(fn, timeout = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (fn()) return true;
    await wait(100);
  }
  return false;
}

function today() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(new Date());
}

function currentHistoryDate() {
  const date = new Date(`${today()}T00:00:00`);
  const day = date.getDay();
  const daysSinceTuesday = (day + 5) % 7;
  const start = new Date(date);
  start.setDate(date.getDate() - daysSinceTuesday);
  const end = new Date(start);
  end.setDate(start.getDate() + 5);
  const visibleDate = date > end ? end : date;
  return [
    visibleDate.getFullYear(),
    String(visibleDate.getMonth() + 1).padStart(2, "0"),
    String(visibleDate.getDate()).padStart(2, "0")
  ].join("-");
}

function nowTime() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  return formatter.format(new Date()).replace(/^24:/, "00:");
}

function testEntry(id, suffix = "", date = today(), time = "23:59") {
  return {
    id,
    date,
    time,
    mode: "simple",
    employee: "관리자",
    target: "",
    items: [
      { id: `consistency-cafe-${suffix}`, name: "테스트 닭강정", nameKo: "테스트 닭강정", nameEn: "Test Gangjeong", category: "반조리", target: "카페테리아", quantity: "", unit: "", received: false, restaurantReceived: false },
      { id: `consistency-veg-${suffix}`, name: "테스트 두부", nameKo: "테스트 두부", nameEn: "Test Tofu", category: "두부", target: "야채", quantity: "", unit: "", received: false, restaurantReceived: false },
      { id: `consistency-grocery-${suffix}`, name: "테스트 다시다", nameKo: "테스트 다시다", nameEn: "Test Powder", category: "분말", target: "매장", quantity: "", unit: "", received: false, restaurantReceived: false }
    ],
    memos: [
      { id: `consistency-memo-${suffix}`, role: "admin", department: "", authorLabel: "관리자", text: `DB 일관성 테스트 ${suffix}`, createdAt: new Date().toISOString() }
    ],
    memo: `[관리자] DB 일관성 테스트 ${suffix}`,
    message: ""
  };
}

async function runPage(userName, file, query = "") {
  const scripts = {
    "index.html": "app.js",
    "history.html": "history.js"
  };
  const html = await local(file);
  const dom = new JSDOM(html, { url: `${site}/${file}${query}`, runScripts: "outside-only", pretendToBeVisual: true });
  const { window } = dom;
  const errors = [];
  window.console = { ...console, error: (...args) => errors.push(args.join(" ")) };
  window.alert = () => {};
  window.confirm = () => true;
  window.URL.createObjectURL = () => "blob:test";
  window.URL.revokeObjectURL = () => {};
  window.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} });
  window.fetch = async (url, options = {}) => fetch(String(url).startsWith("/api") ? `${site}${url}` : String(url), options);
  Object.defineProperty(window.navigator, "serviceWorker", { configurable: true, value: { getRegistrations: async () => [], register: async () => ({ update: async () => {} }) } });
  window.localStorage.setItem("restaurant_lang", "ko");
  window.localStorage.setItem("restaurant_auth", JSON.stringify({ ...sessions[userName], signedInAt: new Date().toISOString() }));
  for (const script of ["storage.js", "i18n.js", scripts[file]]) {
    window.eval(`${await local(script)}\n//# sourceURL=${script}`);
  }
  await waitUntil(() => {
    if (file === "index.html") return (window.document.querySelector("#home-request-list")?.textContent || "").trim();
    if (file === "history.html" && query) return (window.document.querySelector("#history-detail")?.textContent || "").trim();
    return (window.document.querySelector("#history-list")?.textContent || "").trim();
  });
  return {
    text: window.document.body.textContent.replace(/\s+/g, " ").trim(),
    errors
  };
}

function assertCheck(report, check, ok, detail = "") {
  report.push({ check, ok, detail });
}

(async () => {
  const id = `consistency-${Date.now()}`;
  const report = [];
  try {
    const settings = (await req("/settings")).settings || {};
    assertCheck(report, "settings include cafeteria category", (settings.requestCategories?.["카페테리아"] || []).includes("반조리"));
    assertCheck(report, "settings include vegetable category", (settings.requestCategories?.["야채"] || []).includes("두부"));
    assertCheck(report, "settings include store category", (settings.requestCategories?.["매장"] || settings.requestCategories?.["그로서리"] || []).includes("분말"));
    assertCheck(report, "settings include department DB", (settings.departments || []).some((row) => row.name === "카페테리아" && row.nameEn));
    assertCheck(report, "settings include other category for every department", (settings.departments || [])
      .map((row) => row.name)
      .filter(Boolean)
      .every((name) => (settings.requestCategories?.[name] || []).includes("기타")));

    const requestDate = currentHistoryDate();
    const requestTime = "23:59";

    await req("/history", { method: "POST", body: JSON.stringify({ entry: testEntry(id, "create", requestDate, requestTime) }) });
    const afterCreate = ((await req("/history")).history || []).find((entry) => entry.id === id);
    assertCheck(report, "C history row persisted", Boolean(afterCreate));
    assertCheck(report, "R categories persisted", ["반조리", "두부", "분말"].every((category) => afterCreate?.items?.some((item) => item.category === category)));

    const updated = testEntry(id, "update", requestDate, requestTime);
    updated.items = updated.items.map((item) => item.target === "매장" ? { ...item, received: true, restaurantReceived: true } : item);
    updated.memos.push({ id: "consistency-memo-restaurant", role: "restaurant", department: "", authorLabel: "레스토랑", text: "레스토랑 업데이트 확인", createdAt: new Date().toISOString() });
    await req("/history", { method: "POST", body: JSON.stringify({ entry: updated }) });
    const afterUpdateRows = ((await req("/history")).history || []).filter((entry) => entry.id === id);
    const afterUpdate = afterUpdateRows[0];
    assertCheck(report, "U updates same row once", afterUpdateRows.length === 1, `rows=${afterUpdateRows.length}`);
    assertCheck(report, "U received flags persisted", afterUpdate?.items?.some((item) => item.target === "매장" && item.received && item.restaurantReceived));
    assertCheck(report, "U multiple memos persisted without key collision", afterUpdate?.memos?.length === 2, `memos=${afterUpdate?.memos?.length || 0}`);

    const homeAdmin = await runPage("admin", "index.html");
    assertCheck(report, "admin home shows cafeteria category", homeAdmin.text.includes("반조리") && homeAdmin.text.includes("테스트 닭강정"));
    assertCheck(report, "admin home shows vegetable category", homeAdmin.text.includes("두부") && homeAdmin.text.includes("테스트 두부"));
    assertCheck(report, "admin home shows grocery category", homeAdmin.text.includes("분말") && homeAdmin.text.includes("테스트 다시다"));

    const homeGrocery = await runPage("grocery", "index.html");
    assertCheck(report, "grocery home filters and shows powder category", homeGrocery.text.includes("분말") && homeGrocery.text.includes("테스트 다시다") && !homeGrocery.text.includes("테스트 두부"));

    const historyList = await runPage("admin", "history.html");
    assertCheck(report, "history list shows created request", historyList.text.includes(requestDate) && historyList.text.includes(requestTime));

    const historyDetail = await runPage("admin", "history.html", `?id=${encodeURIComponent(id)}`);
    assertCheck(report, "history detail shows cafeteria category", historyDetail.text.includes("반조리") && historyDetail.text.includes("테스트 닭강정"));
    assertCheck(report, "history detail shows vegetable category", historyDetail.text.includes("두부") && historyDetail.text.includes("테스트 두부"));
    assertCheck(report, "history detail shows grocery category", historyDetail.text.includes("분말") && historyDetail.text.includes("테스트 다시다"));

    await req(`/history/${encodeURIComponent(id)}`, { method: "DELETE" });
    const afterDelete = ((await req("/history")).history || []).some((entry) => entry.id === id);
    assertCheck(report, "D history row removed", !afterDelete);
  } catch (error) {
    report.push({ check: "fatal", ok: false, detail: error.message });
    try { await req(`/history/${encodeURIComponent(id)}`, { method: "DELETE" }); } catch {}
  }

  console.table(report);
  process.exit(report.some((row) => !row.ok) ? 1 : 0);
})();
