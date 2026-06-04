const { JSDOM } = require('jsdom');
const fs = require('node:fs/promises');
const path = require('node:path');

const cwd = process.cwd();
const site = 'https://mukjamtl.netlify.app';
const users = {
  admin: { role: 'admin', department: '', label: '관리자' },
  restaurant: { role: 'restaurant', department: '', label: '레스토랑' },
  cafeteria: { role: 'department', department: '카페테리아', label: '카페테리아' },
  vegetable: { role: 'department', department: '야채', label: '야채' },
  grocery: { role: 'department', department: '그로서리', label: '그로서리' }
};
const pages = [
  { file: 'index.html', script: 'app.js' },
  { file: 'history.html', script: 'history.js' },
  { file: 'order.html', script: 'order.js' },
  { file: 'menu.html', script: 'menu.js' },
  { file: 'recipes.html', script: 'recipes.js' },
  { file: 'admin.html', script: 'admin.js' }
];
const sharedScripts = ['storage.js', 'i18n.js'];
const local = (file) => fs.readFile(path.join(cwd, file), 'utf8');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitUntil(fn, timeout = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (fn()) return true;
    await wait(100);
  }
  return false;
}

async function runPage(userName, session, page) {
  const html = await local(page.file);
  const dom = new JSDOM(html, { url: `${site}/${page.file}`, runScripts: 'outside-only', pretendToBeVisual: true });
  const { window } = dom;
  const errors = [];
  window.console = { ...console, error: (...args) => errors.push(args.join(' ')) };
  window.alert = () => {};
  window.confirm = () => true;
  window.URL.createObjectURL = () => 'blob:test';
  window.URL.revokeObjectURL = () => {};
  window.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} });
  window.fetch = async (url, options = {}) => fetch(String(url).startsWith('/api') ? `${site}${url}` : String(url), options);
  Object.defineProperty(window.navigator, 'serviceWorker', { configurable: true, value: { getRegistrations: async () => [], register: async () => ({ update: async () => {} }) } });
  window.localStorage.setItem('restaurant_lang', 'ko');
  window.localStorage.setItem('restaurant_auth', JSON.stringify({ ...session, signedInAt: new Date().toISOString() }));
  for (const script of [...sharedScripts, page.script]) window.eval(`${await local(script)}\n//# sourceURL=${script}`);
  await waitUntil(() => {
    if (page.file === 'index.html') return (window.document.querySelector('#home-request-list')?.textContent || '').trim();
    if (page.file === 'history.html') return (window.document.querySelector('#history-list')?.textContent || '').trim();
    if (page.file === 'order.html') return (window.document.querySelector('#items-list')?.textContent || '').trim();
    if (page.file === 'menu.html') return (window.document.querySelector('#menu-list')?.textContent || '').trim();
    if (page.file === 'recipes.html') return (window.document.querySelector('#recipe-list')?.textContent || '').trim();
    if (page.file === 'admin.html') return window.document.querySelector('[data-layout-sidebar]')?.textContent?.trim() || window.document.querySelector('#access-list')?.textContent?.trim();
    return true;
  });
  const result = { user: userName, page: page.file, errors };
  if (page.file === 'index.html') {
    const homeText = window.document.querySelector('#home-request-list')?.textContent?.replace(/\s+/g, ' ').trim() || '';
    result.subtitle = window.document.querySelector('[data-home-subtitle]')?.textContent || '';
    result.sample = homeText.slice(0, 180);
    result.pass = !/저장된 주문내역이 없습니다/.test(homeText) && homeText.length > 0;
  } else if (page.file === 'history.html') {
    const text = window.document.querySelector('#history-list')?.textContent?.replace(/\s+/g, ' ').trim() || '';
    result.sample = text.slice(0, 180);
    result.pass = !/저장된 주문내역이 없습니다/.test(text) && text.length > 0;
  } else if (page.file === 'order.html') {
    const text = window.document.querySelector('#items-list')?.textContent?.replace(/\s+/g, ' ').trim() || '';
    result.checked = window.document.querySelectorAll('#items-list input[type="checkbox"]:checked').length;
    result.sample = text.slice(0, 180);
    result.pass = ['admin','restaurant'].includes(userName) ? text.length > 0 && !/권한/.test(text) : /권한/.test(text);
  } else if (page.file === 'menu.html') {
    const text = window.document.querySelector('#menu-list')?.textContent?.replace(/\s+/g, ' ').trim() || '';
    result.sample = text.slice(0, 180);
    result.pass = ['admin','restaurant'].includes(userName) ? text.length > 0 && !/권한/.test(text) : /권한/.test(text);
  } else if (page.file === 'recipes.html') {
    const text = window.document.querySelector('#recipe-list')?.textContent?.replace(/\s+/g, ' ').trim() || '';
    result.sample = text.slice(0, 180);
    result.pass = text.length > 0 && !/레시피가 없습니다/.test(text);
  } else if (page.file === 'admin.html') {
    result.adminHidden = window.document.querySelector('#admin-panel')?.classList.contains('hidden');
    result.pass = userName === 'admin' ? result.adminHidden === false : result.adminHidden === true;
  }
  return result;
}

(async () => {
  const results = [];
  for (const [userName, session] of Object.entries(users)) {
    for (const page of pages) {
      try { results.push(await runPage(userName, session, page)); }
      catch (error) { results.push({ user: userName, page: page.file, pass: false, fatal: error.message }); }
    }
  }
  console.log(JSON.stringify(results, null, 2));
  process.exit(results.some((row) => !row.pass) ? 1 : 0);
})();
