const { execFileSync } = require("node:child_process");

const defaultSiteId = "d77f9d7e-bce9-48e6-9f9e-8219cbc991ac";
const args = new Set(process.argv.slice(2));
const execute = args.has("--execute");
const keepArg = process.argv.find((arg) => arg.startsWith("--keep="));
const siteArg = process.argv.find((arg) => arg.startsWith("--site-id="));
const keep = Number.parseInt(keepArg?.split("=")[1] || "2", 10);
const siteId = siteArg?.split("=")[1] || process.env.NETLIFY_SITE_ID || defaultSiteId;

if (!Number.isFinite(keep) || keep < 1) {
  throw new Error("--keep must be a positive number");
}

function api(method, data) {
  const output = execFileSync("npx", ["netlify", "api", method, "--data", JSON.stringify(data)], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  return output.trim() ? JSON.parse(output) : null;
}

function listDeploys() {
  const perPage = 100;
  let page = 1;
  const deploys = [];
  while (true) {
    const rows = api("listSiteDeploys", { site_id: siteId, per_page: perPage, page });
    if (!Array.isArray(rows) || !rows.length) break;
    deploys.push(...rows);
    if (rows.length < perPage) break;
    page += 1;
  }
  return deploys.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

const deploys = listDeploys();
const kept = deploys.slice(0, keep);
const targets = deploys.slice(keep).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
const summary = {
  mode: execute ? "execute" : "dry-run",
  siteId,
  total: deploys.length,
  keep,
  kept: kept.map((deploy) => ({
    id: deploy.id,
    created_at: deploy.created_at,
    state: deploy.state,
    context: deploy.context,
    deploy_ssl_url: deploy.deploy_ssl_url
  })),
  deleteCount: targets.length
};

if (!execute) {
  console.log(JSON.stringify({
    ...summary,
    deletePreview: targets.map((deploy) => ({
      id: deploy.id,
      created_at: deploy.created_at,
      state: deploy.state,
      context: deploy.context
    }))
  }, null, 2));
  process.exit(0);
}

const deleted = [];
const failed = [];
for (const [index, deploy] of targets.entries()) {
  try {
    api("deleteSiteDeploy", { site_id: siteId, deploy_id: deploy.id });
    deleted.push(deploy.id);
  } catch (error) {
    failed.push({ id: deploy.id, message: error.stderr?.toString?.() || error.message });
  }
  if ((index + 1) % 25 === 0 || index + 1 === targets.length) {
    console.log(`progress ${index + 1}/${targets.length} deleted=${deleted.length} failed=${failed.length}`);
  }
}

console.log(JSON.stringify({
  ...summary,
  deleted: deleted.length,
  failed
}, null, 2));

process.exit(failed.length ? 1 : 0);
