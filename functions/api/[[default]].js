const REMARK_FIELDS = new Set(["productRemark", "salesRemark", "operationRemark", "roomingRemark"]);
const REMARK_STORE_KEY = "theme_group_remarks";
const DEFAULT_DASHBOARD_URL = "https://test-gds.songtsam.com/product-journey/api/travelGroup/listTravelGroupDashboard";

const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: jsonHeaders,
  });
}

async function readJsonBody(request) {
  const text = await request.text();
  if (!text) return {};
  return JSON.parse(text);
}

function getDashboardUrl(env = {}) {
  return env.SONGTSAM_THEME_GROUP_DASHBOARD_URL || globalThis.SONGTSAM_THEME_GROUP_DASHBOARD_URL || DEFAULT_DASHBOARD_URL;
}

function getKV(env = {}) {
  return env.theme_group_kv || env.THEME_GROUP_KV || env.my_kv || globalThis.theme_group_kv || globalThis.THEME_GROUP_KV || globalThis.my_kv;
}

function createEmptyRemarkStore() {
  return {
    remarks: {},
    logs: [],
  };
}

async function readRemarkStore(env) {
  const kv = getKV(env);
  if (!kv) {
    throw new Error("EdgeOne KV 未绑定：请绑定 KV 命名空间，变量名使用 theme_group_kv、THEME_GROUP_KV 或 my_kv。");
  }

  const value = await kv.get(REMARK_STORE_KEY, { type: "json" }).catch(async () => {
    const text = await kv.get(REMARK_STORE_KEY);
    return text ? JSON.parse(text) : null;
  });

  if (!value || typeof value !== "object") return createEmptyRemarkStore();
  return {
    remarks: value.remarks && typeof value.remarks === "object" ? value.remarks : {},
    logs: Array.isArray(value.logs) ? value.logs : [],
  };
}

async function writeRemarkStore(env, store) {
  const kv = getKV(env);
  if (!kv) {
    throw new Error("EdgeOne KV 未绑定：请绑定 KV 命名空间，变量名使用 theme_group_kv、THEME_GROUP_KV 或 my_kv。");
  }
  await kv.put(REMARK_STORE_KEY, JSON.stringify(store));
}

function getRemarkKey(objectType, objectId, fieldName) {
  return `${objectType}:${objectId}:${fieldName}`;
}

function findLatestLogTime(logs, objectId) {
  return logs
    .filter((log) => log.objectId === objectId)
    .map((log) => Date.parse(log.changedAt))
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0];
}

function applySavedRemarks(products, store) {
  return products.map((product) => {
    const productRemark = store.remarks[getRemarkKey("product", product.id, "productRemark")] ?? product.productRemark;

    return {
      ...product,
      productRemark,
      departures: product.departures.map((departure) => {
        const latestLogTime = findLatestLogTime(store.logs, departure.id);
        return {
          ...departure,
          salesRemark: store.remarks[getRemarkKey("order", departure.id, "salesRemark")] ?? departure.salesRemark,
          operationRemark: store.remarks[getRemarkKey("departure", departure.id, "operationRemark")] ?? departure.operationRemark,
          roomingRemark: store.remarks[getRemarkKey("departure", departure.id, "roomingRemark")] ?? departure.roomingRemark,
          updatedAt: latestLogTime ? new Date(latestLogTime).toISOString() : departure.updatedAt,
        };
      }),
    };
  });
}

function formatDateOnly(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function firstValue(row, keys, fallback = "") {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
}

function numberValue(row, keys, fallback = 0) {
  const value = firstValue(row, keys, fallback);
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function uniqueStrings(items) {
  return Array.from(new Set(items.map((item) => String(item || "").trim()).filter(Boolean)));
}

function parseJsonValue(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function formatPriceAmount(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return "";
  return `￥${new Intl.NumberFormat("zh-CN").format(numeric)}`;
}

function formatChildType(value) {
  const key = String(value || "").toUpperCase();
  const labels = {
    BABY: "幼童",
    BIGCHILDREN: "大童",
    BIG_CHILDREN: "大童",
    CHILDREN: "中童",
    CHILD: "中童",
    ADULT: "成人",
  };
  return labels[key] || String(value || "");
}

function formatFamilySpec(adultCount, childCount, childType) {
  return [adultCount ? `${adultCount}成人` : "", childCount && childType ? `${childCount}${childType}` : ""].filter(Boolean).join("");
}

function collectFamilyPriceItems(row) {
  const value = firstValue(row, ["familyPriceJson"], null);
  const parsed = parseJsonValue(value);
  const candidates = Array.isArray(parsed)
    ? parsed.map((item) => ["", item])
    : Array.isArray(parsed?.list)
      ? parsed.list.map((item) => ["", item])
      : Array.isArray(parsed?.items)
        ? parsed.items.map((item) => ["", item])
        : Array.isArray(parsed?.prices)
          ? parsed.prices.map((item) => ["", item])
          : parsed && typeof parsed === "object"
            ? Object.entries(parsed)
            : [];

  return candidates
    .map(([entrySpec, item]) => {
      if (item === null || item === undefined || typeof item !== "object") {
        const amount = formatPriceAmount(item);
        return entrySpec && amount ? `${entrySpec}：${amount}` : amount;
      }

      const spec = firstValue(item, ["specsDesc", "specDesc", "specName", "name", "title", "label"], "");
      const adult = numberValue(item, ["adult", "adultNum"], 0);
      const children = numberValue(item, ["children", "childrenNum", "child"], 0);
      const rowAdult = numberValue(row, ["adult"], 0);
      const rowChildren = numberValue(row, ["children"], 0);
      const childType = formatChildType(firstValue(item, ["child_type", "childType", "childrenType"], ""));
      const fallbackSpec = formatFamilySpec(adult || rowAdult, children || rowChildren, childType);
      const amount = formatPriceAmount(firstValue(item, ["price", "adultPrice", "familyPrice", "amount", "salePrice"], 0));
      const label = spec || fallbackSpec || entrySpec;
      return label && amount ? `${label}：${amount}` : amount;
    })
    .filter(Boolean);
}

function formatDashboardPrice(row) {
  const priceModel = String(firstValue(row, ["priceModel"], ""));
  const familyItems = collectFamilyPriceItems(row);
  if (/family|家庭/i.test(priceModel) && familyItems.length) {
    return familyItems.join("；");
  }

  return formatPriceAmount(firstValue(row, ["adultPrice"], 0));
}

function normalizeDepartureStatus(row) {
  const text = String(firstValue(row, ["staDesc"], ""));
  const code = String(firstValue(row, ["sta"], ""));
  if (/取消|作废|关闭/.test(text) || ["cancelled", "canceled", "cancel"].includes(code.toLowerCase())) return "cancelled";
  if (code === "I" || text === "已开团" || text === "上架") return "opened";
  return "unknown";
}

function normalizeOrderStatus(row) {
  const text = String(firstValue(row, ["teamStaDesc"], ""));
  const code = String(firstValue(row, ["teamSta"], "")).toLowerCase();
  if (/取消|作废/.test(text) || ["cancelled", "canceled", "cancel"].includes(code)) return "cancelled";
  if (/成团|已成|已结束|已完结/.test(text) || ["closed", "done", "finished", "completed"].includes(code)) return "closed";
  if (/候补|待支付/.test(text) || ["waitlist", "waiting"].includes(code)) return "waitlist";
  if (/提交|排团/.test(text) || ["submitted"].includes(code)) return "submitted";
  if (text || code) return "open";
  return "unknown";
}

function collectRows(payload) {
  const candidates = [
    payload?.array,
    payload?.retVal,
    payload?.retVal?.datas,
    payload?.retVal?.list,
    payload?.retVal?.rows,
    payload?.data,
    payload?.data?.list,
    payload?.result,
    payload?.result?.list,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

function inferDays(departureDate, returnDate) {
  const begin = Date.parse(departureDate);
  const end = Date.parse(returnDate);
  if (!Number.isFinite(begin) || !Number.isFinite(end)) return 0;
  return Math.max(1, Math.round((end - begin) / 86_400_000) + 1);
}

function formatDashboardRoomAllocation(row) {
  const dcfRmNum = numberValue(row, ["dcfRmNum"], 0);
  const scfRmNum = numberValue(row, ["scfRmNum"], 0);
  return `${dcfRmNum}大${scfRmNum}双`;
}

function formatDashboardRoomInventory(row) {
  const dcfAvailNum = numberValue(row, ["dcfAvailNum"], 0);
  const scfAvailNum = numberValue(row, ["scfAvailNum"], 0);
  return `${dcfAvailNum}大${scfAvailNum}双`;
}

function isExcludedThemeGroupRow(row) {
  const title = String(firstValue(row, ["title", "travelTypeDesc", "productName"], ""));
  const travelGroupCode = String(firstValue(row, ["travelGroupCode", "groupCode"], ""));
  return !/^ZT-/.test(travelGroupCode) || /数科|测试/.test(title);
}

function mapRowsToProducts(rows) {
  const groups = new Map();

  rows.forEach((row, index) => {
    const productCode = String(firstValue(row, ["travelType", "productCode"], ""));
    const title = String(firstValue(row, ["title", "travelTypeDesc", "productName"], ""));
    const series = String(firstValue(row, ["series"], ""));
    const seriesDesc = String(firstValue(row, ["seriesDesc"], ""));
    const theme = String(firstValue(row, ["theme"], ""));
    const themeDesc = String(firstValue(row, ["themeDesc"], ""));
    const productId = `product-${productCode || title || index}`;
    const group = groups.get(productId) || {
      id: productId,
      productCode,
      name: title,
      subtitle: uniqueStrings([seriesDesc, themeDesc]).join(" · "),
      businessType: "主题团",
      series,
      seriesDesc,
      theme,
      themeDesc,
      tags: uniqueStrings([seriesDesc, themeDesc]),
      status: "unknown",
      owner: "",
      productRemark: "",
      departures: [],
    };

    const departureDate = formatDateOnly(firstValue(row, ["groupBeginDate"], ""));
    const returnDate = formatDateOnly(firstValue(row, ["groupEndDate"], ""));
    const price = numberValue(row, ["adultPrice"], 0);
    const priceText = formatDashboardPrice(row);
    const orderNo = String(firstValue(row, ["travelGroupCode"], ""));

    group.departures.push({
      id: orderNo || `${productId}-${index}`,
      productId,
      departureDate,
      returnDate,
      days: inferDays(departureDate, returnDate),
      price,
      priceText,
      priceModel: String(firstValue(row, ["priceModel"], "")),
      listPrice: price,
      priceSource: price > 0 || priceText ? "detail" : "none",
      singleRoomSupplement: numberValue(row, ["singleSupplement"], 0),
      allocatedRooms: formatDashboardRoomAllocation(row),
      allocatedRoomCount: numberValue(row, ["dcfRmNum"], 0) + numberValue(row, ["scfRmNum"], 0),
      soldRoomCount: numberValue(row, ["dcfSoldNum"], 0) + numberValue(row, ["scfSoldNum"], 0),
      availableRoomCount: numberValue(row, ["dcfAvailNum"], 0) + numberValue(row, ["scfAvailNum"], 0),
      receivedGuests: numberValue(row, ["productSoldNum"], 0),
      remainingGuests: numberValue(row, ["productAvailNum"], 0),
      remainingRooms: formatDashboardRoomInventory(row),
      roomingRemark: "",
      consultant: String(firstValue(row, ["counselorName"], "")),
      orderNo,
      departureStatus: normalizeDepartureStatus(row),
      departureStatusText: String(firstValue(row, ["staDesc"], "")),
      orderStatus: normalizeOrderStatus(row),
      orderStatusText: String(firstValue(row, ["teamStaDesc"], "")),
      salesRemark: "",
      operationRemark: "",
      updatedAt: "",
    });

    groups.set(productId, group);
  });

  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
}

async function handleDashboard(request, env) {
  const body = await readJsonBody(request);
  const year = String(body?.filters?.year || body?.year || "2026");
  const response = await fetch(getDashboardUrl(env), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ year }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`listTravelGroupDashboard ${response.status}: ${errorText}`);
  }

  const payload = await response.json();
  const rows = collectRows(payload);
  const filteredRows = rows.filter((row) => !isExcludedThemeGroupRow(row));
  const remarkStore = await readRemarkStore(env);

  return {
    ok: true,
    source: "listTravelGroupDashboard",
    query: { year },
    products: applySavedRemarks(mapRowsToProducts(filteredRows), remarkStore),
    rawShape: {
      topLevelKeys: payload && typeof payload === "object" ? Object.keys(payload) : [],
      rowCount: filteredRows.length,
      totalRows: rows.length,
      unfilteredRowCount: rows.length,
      filteredOutRows: rows.length - filteredRows.length,
      firstRowKeys: rows[0] && typeof rows[0] === "object" ? Object.keys(rows[0]) : [],
    },
  };
}

async function handleUpdateRemark(request, env) {
  const body = await readJsonBody(request);
  const objectType = String(body?.objectType || "");
  const objectId = String(body?.objectId || "");
  const fieldName = String(body?.fieldName || "");
  const content = String(body?.content || "").trim();

  if (!["product", "departure", "order"].includes(objectType) || !objectId || !REMARK_FIELDS.has(fieldName)) {
    return jsonResponse({ ok: false, error: "Invalid remark payload" }, 400);
  }

  const store = await readRemarkStore(env);
  const key = getRemarkKey(objectType, objectId, fieldName);
  const beforeContent = String(store.remarks[key] || "");

  if (beforeContent === content) {
    return { ok: true, log: null };
  }

  if (content) {
    store.remarks[key] = content;
  } else {
    delete store.remarks[key];
  }

  const log = {
    id: `log-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    objectType,
    objectId,
    fieldName,
    beforeContent,
    afterContent: content,
    changedAt: new Date().toISOString(),
    source: "theme-group-dashboard",
  };

  store.logs = [log, ...store.logs].slice(0, 1000);
  await writeRemarkStore(env, store);

  return { ok: true, log };
}

async function handleRemarkLogs(request, env) {
  const body = await readJsonBody(request);
  const objectId = body?.objectId ? String(body.objectId) : "";
  const store = await readRemarkStore(env);
  const logs = objectId ? store.logs.filter((log) => log.objectId === objectId) : store.logs;

  return {
    ok: true,
    logs: logs.sort((a, b) => Date.parse(b.changedAt) - Date.parse(a.changedAt)),
  };
}

export default async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  try {
    if (request.method === "POST" && url.pathname === "/api/theme-groups/dashboard") {
      return jsonResponse(await handleDashboard(request, env));
    }

    if (request.method === "POST" && url.pathname === "/api/theme-groups/remarks/update") {
      const result = await handleUpdateRemark(request, env);
      return result instanceof Response ? result : jsonResponse(result);
    }

    if (request.method === "POST" && url.pathname === "/api/theme-groups/remarks/logs") {
      return jsonResponse(await handleRemarkLogs(request, env));
    }

    return jsonResponse({ ok: false, error: "Not found" }, 404);
  } catch (error) {
    return jsonResponse({ ok: false, error: error?.message || "EdgeOne function failed" }, 500);
  }
}
