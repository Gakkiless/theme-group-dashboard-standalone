import { createServer } from "node:http";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const REMARK_FIELDS = new Set(["productRemark", "salesRemark", "operationRemark", "roomingRemark"]);
const REMARK_STORE_PATH = join(__dirname, "data", "theme-group-remarks.json");

async function loadEnvFile() {
  try {
    const text = await readFile(join(__dirname, ".env"), "utf8");
    text.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const index = trimmed.indexOf("=");
      if (index < 0) return;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    });
  } catch {
    // .env is optional for local development.
  }
}

function jsonResponse(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
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
  return [
    adultCount ? `${adultCount}成人` : "",
    childCount && childType ? `${childCount}${childType}` : "",
  ]
    .filter(Boolean)
    .join("");
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

      if (!item || typeof item !== "object") return "";
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

function getRemarkKey(objectType, objectId, fieldName) {
  return `${objectType}:${objectId}:${fieldName}`;
}

function createEmptyRemarkStore() {
  return {
    remarks: {},
    logs: [],
  };
}

async function readRemarkStore() {
  try {
    const text = await readFile(REMARK_STORE_PATH, "utf8");
    const parsed = JSON.parse(text);
    return {
      remarks: parsed && typeof parsed.remarks === "object" && parsed.remarks ? parsed.remarks : {},
      logs: Array.isArray(parsed?.logs) ? parsed.logs : [],
    };
  } catch (error) {
    if (error.code === "ENOENT") return createEmptyRemarkStore();
    throw error;
  }
}

async function writeRemarkStore(store) {
  await mkdir(join(__dirname, "data"), { recursive: true });
  const tempPath = `${REMARK_STORE_PATH}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  await rename(tempPath, REMARK_STORE_PATH);
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

async function fetchDashboardRows(year) {
  const response = await fetch(SONGTSAM_THEME_GROUP_DASHBOARD_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ year }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`listTravelGroupDashboard ${response.status}: ${errorText}`);
  }

  const payload = await response.json();
  return {
    payload,
    rows: collectRows(payload),
  };
}

async function handleDashboard(req, res) {
  try {
    const body = await readJsonBody(req);
    const year = String(body?.filters?.year || body?.year || "2026");
    const { payload, rows } = await fetchDashboardRows(year);
    const filteredRows = rows.filter((row) => !isExcludedThemeGroupRow(row));
    const remarkStore = await readRemarkStore();

    return jsonResponse(res, 200, {
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
    });
  } catch (error) {
    return jsonResponse(res, 500, {
      ok: false,
      error: error.message,
    });
  }
}

async function handleUpdateRemark(req, res) {
  try {
    const body = await readJsonBody(req);
    const objectType = String(body?.objectType || "");
    const objectId = String(body?.objectId || "");
    const fieldName = String(body?.fieldName || "");
    const content = String(body?.content || "").trim();

    if (!["product", "departure", "order"].includes(objectType) || !objectId || !REMARK_FIELDS.has(fieldName)) {
      return jsonResponse(res, 400, {
        ok: false,
        error: "Invalid remark payload",
      });
    }

    const store = await readRemarkStore();
    const key = getRemarkKey(objectType, objectId, fieldName);
    const beforeContent = String(store.remarks[key] || "");

    if (beforeContent === content) {
      return jsonResponse(res, 200, {
        ok: true,
        log: null,
      });
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
    await writeRemarkStore(store);

    return jsonResponse(res, 200, {
      ok: true,
      log,
    });
  } catch (error) {
    return jsonResponse(res, 500, {
      ok: false,
      error: error.message,
    });
  }
}

async function handleRemarkLogs(req, res) {
  try {
    const body = await readJsonBody(req);
    const objectId = body?.objectId ? String(body.objectId) : "";
    const store = await readRemarkStore();
    const logs = objectId ? store.logs.filter((log) => log.objectId === objectId) : store.logs;

    return jsonResponse(res, 200, {
      ok: true,
      logs: logs.sort((a, b) => Date.parse(b.changedAt) - Date.parse(a.changedAt)),
    });
  } catch (error) {
    return jsonResponse(res, 500, {
      ok: false,
      error: error.message,
    });
  }
}

async function serveFile(res, pathname) {
  const target = pathname === "/" ? "/index.html" : pathname;
  const filePath = join(__dirname, "dist", target.replace(/^\/+/, ""));
  const data = await readFile(filePath);
  const contentType = MIME_TYPES[extname(filePath)] || "text/plain; charset=utf-8";
  res.writeHead(200, { "Content-Type": contentType });
  res.end(data);
}

await loadEnvFile();

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 3000);
const SONGTSAM_THEME_GROUP_DASHBOARD_URL =
  process.env.SONGTSAM_THEME_GROUP_DASHBOARD_URL ||
  "https://test-gds.songtsam.com/product-journey/api/travelGroup/listTravelGroupDashboard";

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "POST" && url.pathname === "/api/theme-groups/dashboard") {
    return handleDashboard(req, res);
  }

  if (req.method === "POST" && url.pathname === "/api/theme-groups/remarks/update") {
    return handleUpdateRemark(req, res);
  }

  if (req.method === "POST" && url.pathname === "/api/theme-groups/remarks/logs") {
    return handleRemarkLogs(req, res);
  }

  if (req.method === "GET") {
    try {
      return await serveFile(res, url.pathname);
    } catch {
      return jsonResponse(res, 404, { ok: false, error: "Not found" });
    }
  }

  return jsonResponse(res, 405, { ok: false, error: "Method not allowed" });
});

server.on("error", (error) => {
  const tips = {
    EADDRINUSE: `Port ${PORT} is already in use.`,
    EPERM: `Permission denied while binding ${HOST}:${PORT}.`,
  };
  console.error(tips[error.code] || error.message);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`Theme group dashboard server running at http://${HOST}:${PORT}`);
});
