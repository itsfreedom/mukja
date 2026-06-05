const { Pool } = require("pg");

let pool;
let schemaReady;

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify(body)
  };
}

function dbUrl() {
  return process.env.NETLIFY_DATABASE_URL ||
    process.env.NETLIFY_DATABASE_URL_UNPOOLED ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL ||
    "";
}

function getPool() {
  const connectionString = dbUrl();
  if (!connectionString) return null;
  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false }
    });
  }
  return pool;
}

async function ensureSchema(client) {
  if (schemaReady) return schemaReady;
  schemaReady = client.query(`
    create extension if not exists pgcrypto;

    create table if not exists access_identities (
      id text primary key,
      role text not null default 'anonymous',
      department text,
      display_name text,
      first_seen_at timestamptz not null default now(),
      last_seen_at timestamptz not null default now(),
      last_ip text,
      last_user_agent text
    );

    create table if not exists access_logs (
      id uuid primary key default gen_random_uuid(),
      identity_id text references access_identities(id) on delete set null,
      role text,
      department text,
      path text,
      method text,
      ip_address text,
      user_agent text,
      created_at timestamptz not null default now()
    );

    create table if not exists access_accounts (
      password text primary key,
      role text not null,
      department text,
      label text,
      enabled boolean not null default true,
      changed_by_identity_id text references access_identities(id) on delete set null,
      changed_ip text,
      changed_user_agent text,
      updated_at timestamptz not null default now()
    );

    create table if not exists app_settings (
      setting_key text primary key,
      setting_value jsonb not null,
      changed_by_identity_id text references access_identities(id) on delete set null,
      changed_ip text,
      changed_user_agent text,
      updated_at timestamptz not null default now()
    );

    create table if not exists orders (
      id text primary key,
      order_date text not null,
      order_time text not null,
      mode text not null default 'simple',
      employee text,
      target text,
      memo text,
      message text,
      created_by_identity_id text references access_identities(id) on delete set null,
      created_ip text,
      created_user_agent text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists order_items (
      id text primary key,
      order_id text not null references orders(id) on delete cascade,
      item_index integer not null default 0,
      name text not null,
      name_en text,
      section text,
      target text,
      quantity text,
      unit text,
      received boolean not null default false,
      received_by_identity_id text references access_identities(id) on delete set null,
      received_ip text,
      received_user_agent text,
      received_at timestamptz
    );

    create table if not exists order_memos (
      id text primary key,
      order_id text not null references orders(id) on delete cascade,
      memo_index integer not null default 0,
      role text,
      department text,
      author_label text,
      memo_text text not null,
      created_by_identity_id text references access_identities(id) on delete set null,
      created_ip text,
      created_user_agent text,
      created_at timestamptz not null default now()
    );

    create table if not exists receipt_confirmations (
      id uuid primary key default gen_random_uuid(),
      order_item_id text not null references order_items(id) on delete cascade,
      received boolean not null default true,
      confirmed_by_identity_id text references access_identities(id) on delete set null,
      confirmed_ip text,
      confirmed_user_agent text,
      confirmed_at timestamptz not null default now(),
      memo text
    );

    create table if not exists department_confirmations (
      id uuid primary key default gen_random_uuid(),
      order_item_id text references order_items(id) on delete cascade,
      department text not null,
      confirmed boolean not null default false,
      confirmed_by_identity_id text references access_identities(id) on delete set null,
      confirmed_ip text,
      confirmed_user_agent text,
      confirmed_at timestamptz,
      memo text
    );

    create table if not exists recipes (
      id text primary key,
      name text not null,
      section text,
      description text,
      ingredients text,
      ingredient_items jsonb not null default '[]'::jsonb,
      seasonings text,
      seasoning_items jsonb not null default '[]'::jsonb,
      steps text,
      step_items jsonb not null default '[]'::jsonb,
      notes text,
      image_url text,
      enabled boolean not null default true,
      updated_at text,
      changed_by_identity_id text references access_identities(id) on delete set null,
      changed_ip text,
      changed_user_agent text,
      synced_at timestamptz not null default now()
    );

    create table if not exists ingredients (
      id text primary key,
      name_ko text not null,
      name_en text,
      section text,
      unit text,
      target text,
      enabled boolean not null default true,
      sort_order integer not null default 0,
      changed_by_identity_id text references access_identities(id) on delete set null,
      changed_ip text,
      changed_user_agent text,
      synced_at timestamptz not null default now()
    );

    create table if not exists menus (
      id text primary key,
      recipe_id text references recipes(id) on delete set null,
      category text,
      name_ko text not null,
      name_en text,
      seasonal boolean not null default false,
      discontinued boolean not null default false,
      price numeric(10, 2),
      currency text not null default 'CAD',
      notes text,
      sort_order integer not null default 0,
      changed_by_identity_id text references access_identities(id) on delete set null,
      changed_ip text,
      changed_user_agent text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    alter table menus add column if not exists category text;
    alter table menus add column if not exists sort_order integer not null default 0;
    alter table order_items add column if not exists name_en text;
    alter table ingredients add column if not exists name_en text;
    alter table ingredients add column if not exists sort_order integer not null default 0;
    alter table recipes add column if not exists ingredient_items jsonb not null default '[]'::jsonb;
    alter table recipes add column if not exists seasonings text;
    alter table recipes add column if not exists seasoning_items jsonb not null default '[]'::jsonb;
    alter table recipes add column if not exists step_items jsonb not null default '[]'::jsonb;

    create index if not exists idx_orders_created_at on orders(created_at desc);
    create index if not exists idx_access_accounts_role on access_accounts(role, department);
    create index if not exists idx_order_items_order_id on order_items(order_id, item_index);
    create index if not exists idx_order_memos_order_id on order_memos(order_id, memo_index);
    create index if not exists idx_receipt_confirmations_item on receipt_confirmations(order_item_id, confirmed_at desc);
    create index if not exists idx_department_confirmations_item on department_confirmations(order_item_id, department, confirmed_at desc);
    create index if not exists idx_recipes_section on recipes(section, enabled);
    create index if not exists idx_ingredients_target on ingredients(target, enabled);
    create index if not exists idx_ingredients_section on ingredients(section, enabled);
    create index if not exists idx_menus_recipe_id on menus(recipe_id);
    create index if not exists idx_menus_category on menus(category, discontinued);
    create index if not exists idx_menus_status on menus(discontinued, seasonal);
  `);
  return schemaReady;
}

function requestPath(event) {
  return String(event.path || "")
    .replace(/^\/api/, "")
    .replace(/^\/\.netlify\/functions\/api/, "") || "/";
}

function header(event, name) {
  const headers = event.headers || {};
  return headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()] || "";
}

function decodeHeader(value) {
  try {
    return decodeURIComponent(value || "");
  } catch {
    return value || "";
  }
}

function clientIp(event) {
  const forwarded = header(event, "x-forwarded-for");
  return header(event, "x-nf-client-connection-ip") ||
    header(event, "client-ip") ||
    forwarded.split(",")[0].trim() ||
    "";
}

function clientInfo(event) {
  return {
    memberId: header(event, "x-mukja-member-id") || "anonymous",
    role: header(event, "x-mukja-role") || "anonymous",
    department: decodeHeader(header(event, "x-mukja-department")),
    ip: clientIp(event),
    userAgent: header(event, "user-agent")
  };
}

async function recordAccess(client, event, path) {
  const info = clientInfo(event);
  await client.query(`
    insert into access_identities (id, role, department, display_name, last_ip, last_user_agent)
    values ($1, $2, $3, $4, $5, $6)
    on conflict (id) do update set
      last_seen_at = now(),
      role = excluded.role,
      department = excluded.department,
      display_name = excluded.display_name,
      last_ip = excluded.last_ip,
      last_user_agent = excluded.last_user_agent
  `, [info.memberId, info.role, info.department || "", info.department || info.role, info.ip, info.userAgent]);
  await client.query(`
    insert into access_logs (identity_id, role, department, path, method, ip_address, user_agent)
    values ($1, $2, $3, $4, $5, $6, $7)
  `, [info.memberId, info.role, info.department || "", path, event.httpMethod, info.ip, info.userAgent]);
  return info;
}

async function upsertAccessAccount(client, password, account, info) {
  if (!password || !account?.role) throw new Error("Invalid access account");
  await client.query(`
    insert into access_accounts (
      password, role, department, label, enabled,
      changed_by_identity_id, changed_ip, changed_user_agent, updated_at
    )
    values ($1, $2, $3, $4, $5, $6, $7, $8, now())
    on conflict (password) do update set
      role = excluded.role,
      department = excluded.department,
      label = excluded.label,
      enabled = excluded.enabled,
      changed_by_identity_id = excluded.changed_by_identity_id,
      changed_ip = excluded.changed_ip,
      changed_user_agent = excluded.changed_user_agent,
      updated_at = now()
  `, [
    password,
    account.role,
    account.department || "",
    account.label || account.department || account.role,
    account.enabled !== false,
    info.memberId,
    info.ip,
    info.userAgent
  ]);
}

async function listAccessAccounts(client) {
  const rows = await client.query("select * from access_accounts where enabled = true order by role asc, department asc, label asc");
  return rows.rows.reduce((accounts, row) => {
    accounts[row.password] = {
      role: row.role,
      department: row.department || "",
      label: row.label || row.department || row.role,
      enabled: row.enabled
    };
    return accounts;
  }, {});
}

async function upsertSetting(client, key, value, info) {
  if (!key) throw new Error("Invalid setting key");
  await client.query(`
    insert into app_settings (
      setting_key, setting_value, changed_by_identity_id, changed_ip, changed_user_agent, updated_at
    )
    values ($1, $2::jsonb, $3, $4, $5, now())
    on conflict (setting_key) do update set
      setting_value = excluded.setting_value,
      changed_by_identity_id = excluded.changed_by_identity_id,
      changed_ip = excluded.changed_ip,
      changed_user_agent = excluded.changed_user_agent,
      updated_at = now()
  `, [key, JSON.stringify(value), info.memberId, info.ip, info.userAgent]);
}

async function listSettings(client) {
  const rows = await client.query("select setting_key, setting_value from app_settings");
  return rows.rows.reduce((settings, row) => {
    settings[row.setting_key] = row.setting_value;
    return settings;
  }, {});
}

async function replaceSeedData(client, data, info) {
  const accessAccounts = data.accessAccounts || {};
  const sections = Array.isArray(data.sections) ? data.sections : [];
  const employees = Array.isArray(data.employees) ? data.employees : [];
  const ingredients = Array.isArray(data.ingredients) ? data.ingredients : [];
  const recipes = Array.isArray(data.recipes) ? data.recipes : [];
  const menus = Array.isArray(data.menus) ? data.menus : [];
  const history = Array.isArray(data.history) ? data.history : [];
  await client.query("delete from orders");
  await client.query("delete from menus");
  await client.query("delete from recipes");
  await client.query("delete from ingredients");
  await client.query("delete from access_accounts");
  await client.query("delete from app_settings");
  for (const [password, account] of Object.entries(accessAccounts)) {
    await upsertAccessAccount(client, password, account, info);
  }
  await upsertSetting(client, "sections", sections, info);
  await upsertSetting(client, "employees", employees, info);
  for (const recipe of recipes) await upsertRecipe(client, recipe, info);
  for (const ingredient of ingredients) await upsertIngredient(client, ingredient, info);
  for (const menu of menus) await upsertMenu(client, menu, info);
  for (const entry of history) await upsertOrder(client, entry, info);
}

function parseBody(event) {
  if (!event.body) return {};
  const source = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
  return JSON.parse(source || "{}");
}

function itemDbId(orderId, item, index) {
  const base = item.id || `${item.name || "item"}-${index}`;
  return `${orderId}-${base}`.replace(/[^a-zA-Z0-9가-힣_.:-]/g, "-").slice(0, 180);
}

function memoDbId(orderId, memo, index) {
  const base = memo.id || `${memo.department || memo.role || "memo"}-${index}`;
  return `${orderId}-${base}`.replace(/[^a-zA-Z0-9가-힣_.:-]/g, "-").slice(0, 180);
}

async function upsertOrder(client, entry, info) {
  const id = entry.id;
  if (!id || !Array.isArray(entry.items)) throw new Error("Invalid order entry");
  await client.query(`
    insert into orders (
      id, order_date, order_time, mode, employee, target, memo, message,
      created_by_identity_id, created_ip, created_user_agent, updated_at
    )
    values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
    on conflict (id) do update set
      order_date = excluded.order_date,
      order_time = excluded.order_time,
      mode = excluded.mode,
      employee = excluded.employee,
      target = excluded.target,
      memo = excluded.memo,
      message = excluded.message,
      updated_at = now()
  `, [
    id,
    entry.date || new Date().toISOString().slice(0, 10),
    entry.time || "",
    entry.mode || "simple",
    entry.employee || "",
    entry.target || "",
    entry.memo || "",
    entry.message || "",
    info.memberId,
    info.ip,
    info.userAgent
  ]);
  await client.query("delete from order_items where order_id = $1", [id]);
  await client.query("delete from order_memos where order_id = $1", [id]);
  for (const [index, item] of entry.items.entries()) {
    await client.query(`
      insert into order_items (
        id, order_id, item_index, name, name_en, section, target, quantity, unit,
        received, received_by_identity_id, received_ip, received_user_agent, received_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, case when $10 then now() else null end)
    `, [
      itemDbId(id, item, index),
      id,
      index,
      item.nameKo || item.name || "",
      item.nameEn || "",
      item.section || "",
      item.target || "",
      item.quantity || "",
      item.unit || "",
      Boolean(item.received),
      item.received ? info.memberId : null,
      item.received ? info.ip : null,
      item.received ? info.userAgent : null
    ]);
    if (item.received) {
      await client.query(`
        insert into receipt_confirmations (
          order_item_id, received, confirmed_by_identity_id, confirmed_ip, confirmed_user_agent
        )
        values ($1, true, $2, $3, $4)
      `, [itemDbId(id, item, index), info.memberId, info.ip, info.userAgent]);
    }
  }
  const memos = Array.isArray(entry.memos) ? entry.memos : [];
  for (const [index, memo] of memos.entries()) {
    if (!memo.text) continue;
    await client.query(`
      insert into order_memos (
        id, order_id, memo_index, role, department, author_label, memo_text,
        created_by_identity_id, created_ip, created_user_agent, created_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, coalesce($11::timestamptz, now()))
    `, [
      memoDbId(id, memo, index),
      id,
      index,
      memo.role || "",
      memo.department || "",
      memo.authorLabel || "",
      memo.text || "",
      memo.identityId || info.memberId,
      memo.ip || info.ip,
      memo.userAgent || info.userAgent,
      memo.createdAt || null
    ]);
  }
}

async function upsertRecipe(client, recipe, info) {
  if (!recipe?.id || !recipe.name) throw new Error("Invalid recipe");
  const ingredientItems = Array.isArray(recipe.ingredientItems) ? recipe.ingredientItems : [];
  const seasoningItems = Array.isArray(recipe.seasoningItems) ? recipe.seasoningItems : [];
  const stepItems = Array.isArray(recipe.stepItems) ? recipe.stepItems : [];
  await client.query(`
    insert into recipes (
      id, name, section, description, ingredients, ingredient_items, seasonings, seasoning_items, steps, step_items, notes, image_url, enabled,
      updated_at, changed_by_identity_id, changed_ip, changed_user_agent, synced_at
    )
    values ($1, $2, $3, $4, $5, $6::jsonb, $7, $8::jsonb, $9, $10::jsonb, $11, $12, $13, $14, $15, $16, $17, now())
    on conflict (id) do update set
      name = excluded.name,
      section = excluded.section,
      description = excluded.description,
      ingredients = excluded.ingredients,
      ingredient_items = excluded.ingredient_items,
      seasonings = excluded.seasonings,
      seasoning_items = excluded.seasoning_items,
      steps = excluded.steps,
      step_items = excluded.step_items,
      notes = excluded.notes,
      image_url = excluded.image_url,
      enabled = excluded.enabled,
      updated_at = excluded.updated_at,
      changed_by_identity_id = excluded.changed_by_identity_id,
      changed_ip = excluded.changed_ip,
      changed_user_agent = excluded.changed_user_agent,
      synced_at = now()
  `, [
    recipe.id,
    recipe.name,
    recipe.section || "",
    recipe.description || "",
    recipe.ingredients || "",
    JSON.stringify(ingredientItems),
    recipe.seasonings || "",
    JSON.stringify(seasoningItems),
    recipe.steps || "",
    JSON.stringify(stepItems),
    recipe.notes || "",
    recipe.imageUrl || "",
    recipe.enabled !== false,
    recipe.updatedAt || "",
    info.memberId,
    info.ip,
    info.userAgent
  ]);
}

async function listRecipes(client) {
  const recipes = await client.query("select * from recipes order by name asc");
  return recipes.rows.map((row) => ({
    id: row.id,
    name: row.name,
    section: row.section || "",
    description: row.description || "",
    ingredients: row.ingredients || "",
    ingredientItems: Array.isArray(row.ingredient_items) ? row.ingredient_items : [],
    seasonings: row.seasonings || "",
    seasoningItems: Array.isArray(row.seasoning_items) ? row.seasoning_items : [],
    steps: row.steps || "",
    stepItems: Array.isArray(row.step_items) ? row.step_items : [],
    notes: row.notes || "",
    imageUrl: row.image_url || "",
    enabled: row.enabled,
    updatedAt: row.updated_at || ""
  }));
}

async function upsertIngredient(client, ingredient, info) {
  if (!ingredient?.id || !(ingredient.nameKo || ingredient.name)) throw new Error("Invalid ingredient");
  const nameKo = ingredient.nameKo || ingredient.name || "";
  await client.query(`
    insert into ingredients (
      id, name_ko, name_en, section, unit, target, enabled, sort_order,
      changed_by_identity_id, changed_ip, changed_user_agent, synced_at
    )
    values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
    on conflict (id) do update set
      name_ko = excluded.name_ko,
      name_en = excluded.name_en,
      section = excluded.section,
      unit = excluded.unit,
      target = excluded.target,
      enabled = excluded.enabled,
      sort_order = excluded.sort_order,
      changed_by_identity_id = excluded.changed_by_identity_id,
      changed_ip = excluded.changed_ip,
      changed_user_agent = excluded.changed_user_agent,
      synced_at = now()
  `, [
    ingredient.id,
    nameKo,
    ingredient.nameEn || "",
    ingredient.section || "",
    ingredient.unit || "",
    ingredient.target || "",
    ingredient.enabled !== false,
    Number.isFinite(Number(ingredient.sortOrder ?? ingredient.sort_order)) ? Number(ingredient.sortOrder ?? ingredient.sort_order) : 0,
    info.memberId,
    info.ip,
    info.userAgent
  ]);
}

async function listIngredients(client) {
  const ingredients = await client.query("select * from ingredients order by sort_order asc, target asc, section asc, name_ko asc");
  return ingredients.rows.map((row) => ({
    id: row.id,
    name: row.name_ko,
    nameKo: row.name_ko,
    nameEn: row.name_en || "",
    section: row.section || "",
    unit: row.unit || "",
    target: row.target || "",
    enabled: row.enabled,
    sortOrder: row.sort_order || 0
  }));
}

async function upsertMenu(client, menu, info) {
  if (!menu?.id || !menu.nameKo) throw new Error("Invalid menu");
  const price = menu.price === "" || menu.price === undefined || menu.price === null ? null : Number(menu.price);
  await client.query(`
    insert into menus (
      id, recipe_id, category, name_ko, name_en, seasonal, discontinued, price, currency, notes, sort_order,
      changed_by_identity_id, changed_ip, changed_user_agent, updated_at
    )
    values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, now())
    on conflict (id) do update set
      recipe_id = excluded.recipe_id,
      category = excluded.category,
      name_ko = excluded.name_ko,
      name_en = excluded.name_en,
      seasonal = excluded.seasonal,
      discontinued = excluded.discontinued,
      price = excluded.price,
      currency = excluded.currency,
      notes = excluded.notes,
      sort_order = excluded.sort_order,
      changed_by_identity_id = excluded.changed_by_identity_id,
      changed_ip = excluded.changed_ip,
      changed_user_agent = excluded.changed_user_agent,
      updated_at = now()
  `, [
    menu.id,
    menu.recipeId || null,
    menu.category || "",
    menu.nameKo,
    menu.nameEn || "",
    Boolean(menu.seasonal),
    Boolean(menu.discontinued),
    Number.isFinite(price) ? price : null,
    menu.currency || "CAD",
    menu.notes || "",
    Number(menu.sortOrder) || 0,
    info.memberId,
    info.ip,
    info.userAgent
  ]);
}

async function listMenus(client) {
  const menus = await client.query(`
    select
      menus.*,
      recipes.name as recipe_name
    from menus
    left join recipes on recipes.id = menus.recipe_id
    order by menus.category asc, menus.sort_order asc, menus.name_ko asc
  `);
  return menus.rows.map((row) => ({
    id: row.id,
    recipeId: row.recipe_id || "",
    recipeName: row.recipe_name || "",
    category: row.category || "",
    nameKo: row.name_ko,
    nameEn: row.name_en || "",
    seasonal: row.seasonal,
    discontinued: row.discontinued,
    price: row.price === null ? "" : String(row.price),
    currency: row.currency || "CAD",
    notes: row.notes || "",
    sortOrder: row.sort_order || 0
  }));
}

async function listHistory(client) {
  const orders = await client.query("select * from orders order by created_at desc, order_date desc, order_time desc");
  if (!orders.rows.length) return [];
  const ids = orders.rows.map((row) => row.id);
  const [items, memos] = await Promise.all([
    client.query(`
    select * from order_items
    where order_id = any($1::text[])
    order by order_id, item_index
    `, [ids]),
    client.query(`
    select * from order_memos
    where order_id = any($1::text[])
    order by order_id, memo_index
    `, [ids])
  ]);
  const byOrder = items.rows.reduce((acc, item) => {
    acc[item.order_id] = acc[item.order_id] || [];
    acc[item.order_id].push({
      id: item.id,
      name: item.name,
      nameKo: item.name,
      nameEn: item.name_en || "",
      section: item.section || "",
      target: item.target || "",
      quantity: item.quantity || "",
      unit: item.unit || "",
      received: item.received
    });
    return acc;
  }, {});
  const memosByOrder = memos.rows.reduce((acc, memo) => {
    acc[memo.order_id] = acc[memo.order_id] || [];
    acc[memo.order_id].push({
      id: memo.id,
      role: memo.role || "",
      department: memo.department || "",
      authorLabel: memo.author_label || "",
      text: memo.memo_text || "",
      createdAt: memo.created_at
    });
    return acc;
  }, {});
  return orders.rows.map((row) => ({
    id: row.id,
    date: row.order_date,
    time: row.order_time,
    mode: row.mode,
    employee: row.employee || "",
    target: row.target || "",
    memo: row.memo || "",
    message: row.message || "",
    memos: memosByOrder[row.id] || [],
    items: byOrder[row.id] || []
  }));
}

exports.handler = async (event) => {
  const method = event.httpMethod || "GET";
  const path = requestPath(event);
  const db = getPool();
  if (!db) return json(503, { ok: false, error: "DATABASE_URL is not configured" });

  const client = await db.connect();
  try {
    await ensureSchema(client);
    const info = await recordAccess(client, event, path);

    if (method === "GET" && path === "/health") {
      return json(200, { ok: true, db: true });
    }

    if (method === "GET" && path === "/access-accounts") {
      return json(200, { ok: true, accessAccounts: await listAccessAccounts(client) });
    }

    if (method === "GET" && path === "/settings") {
      return json(200, { ok: true, settings: await listSettings(client) });
    }

    if (method === "GET" && path === "/history") {
      return json(200, { ok: true, history: await listHistory(client) });
    }

    if (method === "GET" && path === "/recipes") {
      return json(200, { ok: true, recipes: await listRecipes(client) });
    }

    if (method === "GET" && path === "/menus") {
      return json(200, { ok: true, menus: await listMenus(client) });
    }

    if (method === "GET" && path === "/ingredients") {
      return json(200, { ok: true, ingredients: await listIngredients(client) });
    }

    if (method === "POST" && path === "/history") {
      const { entry } = parseBody(event);
      await client.query("begin");
      await upsertOrder(client, entry, info);
      await client.query("commit");
      return json(200, { ok: true });
    }

    if (method === "PUT" && path === "/access-accounts") {
      const { accessAccounts } = parseBody(event);
      if (!accessAccounts || typeof accessAccounts !== "object" || Array.isArray(accessAccounts)) {
        return json(400, { ok: false, error: "accessAccounts must be an object" });
      }
      await client.query("begin");
      await client.query("delete from access_accounts");
      for (const [password, account] of Object.entries(accessAccounts)) {
        await upsertAccessAccount(client, password, account, info);
      }
      await client.query("commit");
      return json(200, { ok: true });
    }

    if (method === "PUT" && path === "/settings") {
      const { settings } = parseBody(event);
      if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
        return json(400, { ok: false, error: "settings must be an object" });
      }
      await client.query("begin");
      for (const [key, value] of Object.entries(settings)) {
        await upsertSetting(client, key, value, info);
      }
      await client.query("commit");
      return json(200, { ok: true });
    }

    if (method === "PUT" && path === "/seed-data") {
      const data = parseBody(event);
      await client.query("begin");
      await replaceSeedData(client, data, info);
      await client.query("commit");
      return json(200, { ok: true });
    }

    if (method === "PUT" && path === "/history") {
      const { history } = parseBody(event);
      if (!Array.isArray(history)) return json(400, { ok: false, error: "history must be an array" });
      await client.query("begin");
      await client.query("delete from orders");
      for (const entry of history) await upsertOrder(client, entry, info);
      await client.query("commit");
      return json(200, { ok: true });
    }

    if (method === "PUT" && path === "/recipes") {
      const { recipes } = parseBody(event);
      if (!Array.isArray(recipes)) return json(400, { ok: false, error: "recipes must be an array" });
      await client.query("begin");
      for (const recipe of recipes) await upsertRecipe(client, recipe, info);
      await client.query("commit");
      return json(200, { ok: true });
    }

    if (method === "POST" && path === "/recipes") {
      const { recipe } = parseBody(event);
      await client.query("begin");
      await upsertRecipe(client, recipe, info);
      await client.query("commit");
      return json(200, { ok: true });
    }

    if (method === "PUT" && path === "/ingredients") {
      const { ingredients } = parseBody(event);
      if (!Array.isArray(ingredients)) return json(400, { ok: false, error: "ingredients must be an array" });
      await client.query("begin");
      await client.query("delete from ingredients");
      for (const ingredient of ingredients) await upsertIngredient(client, ingredient, info);
      await client.query("commit");
      return json(200, { ok: true });
    }

    if (method === "POST" && path === "/ingredients") {
      const { ingredient } = parseBody(event);
      await client.query("begin");
      await upsertIngredient(client, ingredient, info);
      await client.query("commit");
      return json(200, { ok: true });
    }

    if (method === "PUT" && path === "/menus") {
      const { menus } = parseBody(event);
      if (!Array.isArray(menus)) return json(400, { ok: false, error: "menus must be an array" });
      await client.query("begin");
      for (const menu of menus) await upsertMenu(client, menu, info);
      await client.query("commit");
      return json(200, { ok: true });
    }

    if (method === "POST" && path === "/menus") {
      const { menu } = parseBody(event);
      await client.query("begin");
      await upsertMenu(client, menu, info);
      await client.query("commit");
      return json(200, { ok: true });
    }

    const menuDeleteMatch = path.match(/^\/menus\/([^/]+)$/);
    if (method === "DELETE" && menuDeleteMatch) {
      const menuId = decodeURIComponent(menuDeleteMatch[1]);
      await client.query("begin");
      const menu = await client.query("select recipe_id from menus where id = $1", [menuId]);
      const recipeId = menu.rows[0]?.recipe_id || "";
      await client.query("delete from menus where id = $1", [menuId]);
      if (recipeId) {
        await client.query(`
          delete from recipes
          where id = $1
            and not exists (select 1 from menus where recipe_id = $1)
            and coalesce(description, '') = ''
            and coalesce(ingredients, '') = ''
            and coalesce(seasonings, '') = ''
            and coalesce(steps, '') = ''
            and coalesce(notes, '') = ''
            and jsonb_array_length(coalesce(ingredient_items, '[]'::jsonb)) = 0
            and jsonb_array_length(coalesce(seasoning_items, '[]'::jsonb)) = 0
            and jsonb_array_length(coalesce(step_items, '[]'::jsonb)) = 0
        `, [recipeId]);
      }
      await client.query("commit");
      return json(200, { ok: true });
    }

    const recipeDeleteMatch = path.match(/^\/recipes\/([^/]+)$/);
    if (method === "DELETE" && recipeDeleteMatch) {
      await client.query("begin");
      await client.query("delete from recipes where id = $1", [decodeURIComponent(recipeDeleteMatch[1])]);
      await client.query("commit");
      return json(200, { ok: true });
    }

    const deleteMatch = path.match(/^\/history\/([^/]+)$/);
    if (method === "DELETE" && deleteMatch) {
      await client.query("delete from orders where id = $1", [decodeURIComponent(deleteMatch[1])]);
      return json(200, { ok: true });
    }

    if (method === "DELETE" && path === "/history") {
      await client.query("delete from orders");
      return json(200, { ok: true });
    }

    return json(404, { ok: false, error: "Not found" });
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {}
    return json(500, { ok: false, error: error.message });
  } finally {
    client.release();
  }
};
