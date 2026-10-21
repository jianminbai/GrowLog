import assert from "node:assert/strict";

const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const email = process.env.SMOKE_ADMIN_EMAIL;
const password = process.env.SMOKE_ADMIN_PASSWORD;

if (!email || !password) {
  throw new Error("SMOKE_ADMIN_EMAIL and SMOKE_ADMIN_PASSWORD are required.");
}

const origin = new URL(baseUrl).origin;
const cookies = new Map();
const receivedCookies = [];
let csrfToken = "";
let requestCount = 0;

function rememberCookies(response) {
  const values = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : [];
  for (const value of values) {
    receivedCookies.push(value);
    const [pair] = value.split(";", 1);
    const separator = pair.indexOf("=");
    if (separator > 0) cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
}

function cookieHeader() {
  return [...cookies.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

async function api(path, options = {}) {
  const {
    method = "GET",
    body,
    authenticated = true,
    csrf = !["GET", "HEAD"].includes(method),
    requestOrigin = origin,
    expected = 200
  } = options;
  const headers = { accept: "application/json" };
  if (body !== undefined) headers["content-type"] = "application/json";
  if (authenticated && cookies.size > 0) headers.cookie = cookieHeader();
  if (csrf && csrfToken) {
    headers.origin = requestOrigin;
    headers["x-csrf-token"] = csrfToken;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual"
  });
  requestCount += 1;
  rememberCookies(response);
  const contentType = response.headers.get("content-type") ?? "";
  assert.match(contentType, /^application\/json\b/, `${method} ${path} must return JSON`);
  const payload = await response.json();
  assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(payload)}`);
  assert.match(
    response.headers.get("cache-control") ?? "",
    /(?:^|,)\s*private\b.*\bno-store\b/,
    `${method} ${path} must be private and no-store`
  );
  assert.equal(typeof payload, "object");
  assert.ok(payload !== null);
  assert.equal("data" in payload, expected < 400, `${method} ${path} envelope mismatch`);
  assert.equal("error" in payload, expected >= 400, `${method} ${path} envelope mismatch`);
  return payload;
}

function assertError(payload, code) {
  assert.deepEqual(Object.keys(payload).sort(), ["error"]);
  assert.equal(payload.error.code, code);
  assert.equal(typeof payload.error.message, "string");
  assert.ok(payload.error.message.length > 0);
  assert.ok(payload.error.fields === undefined || typeof payload.error.fields === "object");
}

async function expectPage(path) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { cookie: cookieHeader() },
    redirect: "manual"
  });
  requestCount += 1;
  assert.equal(response.status, 200, `GET ${path} must render`);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/);
}

async function lifecycle({
  createPath,
  listPath,
  listKey,
  itemPath,
  restorePath,
  resultKey,
  createBody,
  updateBody
}) {
  const created = await api(createPath, { method: "POST", body: createBody, expected: 201 });
  const record = created.data[resultKey];
  assert.ok(record.id);

  const active = await api(listPath);
  assert.ok(active.data[listKey].some((item) => item.id === record.id && item.deletedAt === null));

  const updated = await api(itemPath(record.id), { method: "PATCH", body: updateBody });
  assert.equal(updated.data[resultKey].id, record.id);

  const removed = await api(itemPath(record.id), { method: "DELETE" });
  assert.equal(typeof removed.data[resultKey].deletedAt, "string");

  const hidden = await api(listPath);
  assert.ok(!hidden.data[listKey].some((item) => item.id === record.id));
  const deleted = await api(`${listPath}${listPath.includes("?") ? "&" : "?"}includeDeleted=true`);
  assert.ok(deleted.data[listKey].some((item) => item.id === record.id && item.deletedAt !== null));

  const restored = await api(restorePath(record.id), { method: "POST" });
  assert.equal(restored.data[resultKey].deletedAt, null);
  return record.id;
}

const anonymous = await api("/api/children", { authenticated: false, expected: 401 });
assertError(anonymous, "UNAUTHORIZED");

const malformedLogin = await api("/api/auth/login", {
  method: "POST",
  authenticated: false,
  csrf: false,
  body: { email: "invalid", password: "short" },
  expected: 400
});
assertError(malformedLogin, "VALIDATION_ERROR");
assert.ok(malformedLogin.error.fields);

const login = await api("/api/auth/login", {
  method: "POST",
  authenticated: false,
  csrf: false,
  body: { email, password }
});
assert.equal(login.data.authenticated, true);
csrfToken = login.data.csrfToken;
assert.ok(csrfToken);
assert.ok(cookies.has("growlog_session"));
assert.ok(cookies.has("growlog_csrf"));
const sessionCookie = receivedCookies.find((value) => value.startsWith("growlog_session="));
const csrfCookie = receivedCookies.find((value) => value.startsWith("growlog_csrf="));
assert.match(sessionCookie ?? "", /; Secure; HttpOnly; SameSite=Lax;/);
assert.match(csrfCookie ?? "", /; Secure; SameSite=Lax;/);
assert.doesNotMatch(csrfCookie ?? "", /; HttpOnly;/);

const session = await api("/api/auth/session");
assert.equal(session.data.authenticated, true);

const noCsrf = await api("/api/children", {
  method: "POST",
  csrf: false,
  body: { name: "Rejected", birthDate: "2022-05-12", sex: "FEMALE" },
  expected: 403
});
assertError(noCsrf, "FORBIDDEN");

const badOrigin = await api("/api/children", {
  method: "POST",
  requestOrigin: "https://untrusted.example",
  body: { name: "Rejected", birthDate: "2022-05-12", sex: "FEMALE" },
  expected: 403
});
assertError(badOrigin, "FORBIDDEN");

const invalidChild = await api("/api/children", {
  method: "POST",
  body: { name: "", birthDate: "invalid", sex: "FEMALE" },
  expected: 400
});
assertError(invalidChild, "VALIDATION_ERROR");
assert.ok(invalidChild.error.fields);

const childCreated = await api("/api/children", {
  method: "POST",
  body: {
    name: `MVP smoke ${new Date().toISOString()}`,
    birthDate: "2022-05-12",
    sex: "FEMALE",
    birthHeightCm: 49.5,
    birthWeightKg: 3.2
  },
  expected: 201
});
const childId = childCreated.data.child.id;
assert.ok(childId);

const children = await api("/api/children");
assert.ok(children.data.children.some((child) => child.id === childId));
const childUpdated = await api(`/api/children/${childId}`, {
  method: "PATCH",
  body: { notes: "M14 lifecycle verified" }
});
assert.equal(childUpdated.data.child.notes, "M14 lifecycle verified");

const prefix = `/api/children/${childId}`;
await lifecycle({
  createPath: `${prefix}/growth`,
  listPath: `${prefix}/growth`,
  listKey: "measurements",
  itemPath: (id) => `${prefix}/growth/${id}`,
  restorePath: (id) => `${prefix}/growth/${id}/restore`,
  resultKey: "measurement",
  createBody: {
    measuredAt: "2026-10-20T08:00:00.000Z",
    heightCm: 101.2,
    weightKg: 15.6,
    source: "HOME"
  },
  updateBody: { notes: "verified growth update" }
});

await lifecycle({
  createPath: `${prefix}/sleep`,
  listPath: `${prefix}/sleep?asOf=2026-10-20`,
  listKey: "sessions",
  itemPath: (id) => `${prefix}/sleep/${id}`,
  restorePath: (id) => `${prefix}/sleep/${id}/restore`,
  resultKey: "session",
  createBody: {
    kind: "NIGHT",
    startedAt: "2026-10-19T13:00:00.000Z",
    endedAt: "2026-10-19T22:00:00.000Z",
    awakeMinutes: 20,
    source: "HOME"
  },
  updateBody: { wakeCount: 1 }
});

const mealBody = {
  type: "DINNER",
  occurredAt: "2026-10-20T10:30:00.000Z",
  appetite: "good",
  source: "HOME",
  items: [{
    name: "rice",
    offeredAmount: 100,
    consumedAmount: 80,
    amountUnit: "g",
    isNewFood: false
  }]
};
await lifecycle({
  createPath: `${prefix}/nutrition/meals`,
  listPath: `${prefix}/nutrition?date=2026-10-20`,
  listKey: "meals",
  itemPath: (id) => `${prefix}/nutrition/meals/${id}`,
  restorePath: (id) => `${prefix}/nutrition/meals/${id}/restore`,
  resultKey: "meal",
  createBody: mealBody,
  updateBody: { ...mealBody, notes: "verified meal update" }
});

await lifecycle({
  createPath: `${prefix}/nutrition/beverages`,
  listPath: `${prefix}/nutrition?date=2026-10-20`,
  listKey: "beverages",
  itemPath: (id) => `${prefix}/nutrition/beverages/${id}`,
  restorePath: (id) => `${prefix}/nutrition/beverages/${id}/restore`,
  resultKey: "beverage",
  createBody: {
    type: "WATER",
    volumeMl: 180,
    occurredAt: "2026-10-20T09:00:00.000Z",
    source: "HOME"
  },
  updateBody: { volumeMl: 200 }
});

await lifecycle({
  createPath: `${prefix}/activities`,
  listPath: `${prefix}/activities?asOf=2026-10-20`,
  listKey: "activities",
  itemPath: (id) => `${prefix}/activities/${id}`,
  restorePath: (id) => `${prefix}/activities/${id}/restore`,
  resultKey: "activity",
  createBody: {
    activityType: "playground",
    durationMinutes: 45,
    outdoorMinutes: 40,
    intensity: "MODERATE",
    structure: "FREE_PLAY",
    occurredAt: "2026-10-20T07:00:00.000Z",
    source: "HOME"
  },
  updateBody: { notes: "verified activity update" }
});

await lifecycle({
  createPath: `${prefix}/emotions`,
  listPath: `${prefix}/emotions?asOf=2026-10-20`,
  listKey: "emotions",
  itemPath: (id) => `${prefix}/emotions/${id}`,
  restorePath: (id) => `${prefix}/emotions/${id}/restore`,
  resultKey: "emotion",
  createBody: {
    mood: "HAPPY",
    tags: ["play"],
    context: "after outdoor play",
    occurredAt: "2026-10-20T08:00:00.000Z",
    source: "HOME"
  },
  updateBody: { mood: "CALM" }
});

await expectPage("/today");
await expectPage("/history");

const jsonExport = await fetch(`${baseUrl}/api/export/json`, {
  headers: { cookie: cookieHeader(), accept: "application/json" }
});
requestCount += 1;
assert.equal(jsonExport.status, 200);
assert.match(jsonExport.headers.get("content-disposition") ?? "", /^attachment;/);
const exportBody = await jsonExport.json();
assert.equal(exportBody.exportVersion, 1);

const logout = await api("/api/auth/logout", { method: "POST" });
assert.equal(logout.data.authenticated, false);
const revoked = await api("/api/auth/session", { expected: 401 });
assertError(revoked, "UNAUTHORIZED");

console.log(JSON.stringify({
  status: "ok",
  requests: requestCount,
  childId,
  verifiedDomains: ["growth", "sleep", "meal", "beverage", "activity", "emotion"]
}));
