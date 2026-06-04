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
      steps text,
      notes text,
      image_url text,
      enabled boolean not null default true,
      updated_at text,
      changed_by_identity_id text references access_identities(id) on delete set null,
      changed_ip text,
      changed_user_agent text,
      synced_at timestamptz not null default now()
    );

    create table if not exists menus (
      id text primary key,
      recipe_id text references recipes(id) on delete set null,
      name_ko text not null,
      name_en text,
      seasonal boolean not null default false,
      discontinued boolean not null default false,
      price numeric(10, 2),
      currency text not null default 'CAD',
      notes text,
      changed_by_identity_id text references access_identities(id) on delete set null,
      changed_ip text,
      changed_user_agent text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create index if not exists idx_orders_created_at on orders(created_at desc);
    create index if not exists idx_order_items_order_id on order_items(order_id, item_index);
    create index if not exists idx_receipt_confirmations_item on receipt_confirmations(order_item_id, confirmed_at desc);
    create index if not exists idx_department_confirmations_item on department_confirmations(order_item_id, department, confirmed_at desc);
    create index if not exists idx_recipes_section on recipes(section, enabled);
    create index if not exists idx_menus_recipe_id on menus(recipe_id);
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
    department: header(event, "x-mukja-department"),
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

function parseBody(event) {
  if (!event.body) return {};
  const source = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
  return JSON.parse(source || "{}");
}

function itemDbId(orderId, item, index) {
  const base = item.id || `${item.name || "item"}-${index}`;
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
  for (const [index, item] of entry.items.entries()) {
    await client.query(`
      insert into order_items (
        id, order_id, item_index, name, section, target, quantity, unit,
        received, received_by_identity_id, received_ip, received_user_agent, received_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, case when $9 then now() else null end)
    `, [
      itemDbId(id, item, index),
      id,
      index,
      item.name || "",
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
}

async function upsertRecipe(client, recipe, info) {
  if (!recipe?.id || !recipe.name) throw new Error("Invalid recipe");
  await client.query(`
    insert into recipes (
      id, name, section, description, ingredients, steps, notes, image_url, enabled,
      updated_at, changed_by_identity_id, changed_ip, changed_user_agent, synced_at
    )
    values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, now())
    on conflict (id) do update set
      name = excluded.name,
      section = excluded.section,
      description = excluded.description,
      ingredients = excluded.ingredients,
      steps = excluded.steps,
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
    recipe.steps || "",
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
    steps: row.steps || "",
    notes: row.notes || "",
    imageUrl: row.image_url || "",
    enabled: row.enabled,
    updatedAt: row.updated_at || ""
  }));
}

async function upsertMenu(client, menu, info) {
  if (!menu?.id || !menu.nameKo) throw new Error("Invalid menu");
  const price = menu.price === "" || menu.price === undefined || menu.price === null ? null : Number(menu.price);
  await client.query(`
    insert into menus (
      id, recipe_id, name_ko, name_en, seasonal, discontinued, price, currency, notes,
      changed_by_identity_id, changed_ip, changed_user_agent, updated_at
    )
    values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now())
    on conflict (id) do update set
      recipe_id = excluded.recipe_id,
      name_ko = excluded.name_ko,
      name_en = excluded.name_en,
      seasonal = excluded.seasonal,
      discontinued = excluded.discontinued,
      price = excluded.price,
      currency = excluded.currency,
      notes = excluded.notes,
      changed_by_identity_id = excluded.changed_by_identity_id,
      changed_ip = excluded.changed_ip,
      changed_user_agent = excluded.changed_user_agent,
      updated_at = now()
  `, [
    menu.id,
    menu.recipeId || null,
    menu.nameKo,
    menu.nameEn || "",
    Boolean(menu.seasonal),
    Boolean(menu.discontinued),
    Number.isFinite(price) ? price : null,
    menu.currency || "CAD",
    menu.notes || "",
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
    order by menus.discontinued asc, menus.name_ko asc
  `);
  return menus.rows.map((row) => ({
    id: row.id,
    recipeId: row.recipe_id || "",
    recipeName: row.recipe_name || "",
    nameKo: row.name_ko,
    nameEn: row.name_en || "",
    seasonal: row.seasonal,
    discontinued: row.discontinued,
    price: row.price === null ? "" : String(row.price),
    currency: row.currency || "CAD",
    notes: row.notes || ""
  }));
}

async function listHistory(client) {
  const orders = await client.query("select * from orders order by created_at desc, order_date desc, order_time desc");
  if (!orders.rows.length) return [];
  const ids = orders.rows.map((row) => row.id);
  const items = await client.query(`
    select * from order_items
    where order_id = any($1::text[])
    order by order_id, item_index
  `, [ids]);
  const byOrder = items.rows.reduce((acc, item) => {
    acc[item.order_id] = acc[item.order_id] || [];
    acc[item.order_id].push({
      id: item.id,
      name: item.name,
      section: item.section || "",
      target: item.target || "",
      quantity: item.quantity || "",
      unit: item.unit || "",
      received: item.received
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

    if (method === "GET" && path === "/history") {
      return json(200, { ok: true, history: await listHistory(client) });
    }

    if (method === "GET" && path === "/recipes") {
      return json(200, { ok: true, recipes: await listRecipes(client) });
    }

    if (method === "GET" && path === "/menus") {
      return json(200, { ok: true, menus: await listMenus(client) });
    }

    if (method === "POST" && path === "/history") {
      const { entry } = parseBody(event);
      await client.query("begin");
      await upsertOrder(client, entry, info);
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
      await client.query("delete from recipes");
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

    if (method === "PUT" && path === "/menus") {
      const { menus } = parseBody(event);
      if (!Array.isArray(menus)) return json(400, { ok: false, error: "menus must be an array" });
      await client.query("begin");
      await client.query("delete from menus");
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
      await client.query("delete from menus where id = $1", [decodeURIComponent(menuDeleteMatch[1])]);
      return json(200, { ok: true });
    }

    const recipeDeleteMatch = path.match(/^\/recipes\/([^/]+)$/);
    if (method === "DELETE" && recipeDeleteMatch) {
      await client.query("delete from recipes where id = $1", [decodeURIComponent(recipeDeleteMatch[1])]);
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
