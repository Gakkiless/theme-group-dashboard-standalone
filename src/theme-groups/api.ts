import { auth } from "../auth";
import type { RemarkField, ThemeGroupDeparture, ThemeGroupFilters, ThemeGroupLog, ThemeGroupProduct, UpdateRemarkInput } from "./types";

let productsStore: ThemeGroupProduct[] = [];

const wait = (ms = 180) => new Promise((resolve) => window.setTimeout(resolve, ms));

type ThemeGroupDashboardResponse = {
  ok: boolean;
  source?: string;
  products?: ThemeGroupProduct[];
  rawShape?: {
    topLevelKeys: string[];
    rowCount: number;
    firstRowKeys: string[];
  };
  error?: string;
};

export type ThemeGroupDepartureDetail = {
  travelGroupCode: string;
  ok: boolean;
  price: number;
  roomAllocation?: {
    largeBed: number;
    twinBed: number;
    other: number;
    text: string;
  };
  rmNum?: number;
  soldRoomNum?: number;
  availRoomNum?: number;
  msg?: string;
};

type ThemeGroupDepartureDetailsResponse = {
  ok: boolean;
  details?: ThemeGroupDepartureDetail[];
  error?: string;
};

type UpdateRemarkResponse = {
  ok: boolean;
  log?: ThemeGroupLog | null;
  error?: string;
};

type RemarkLogsResponse = {
  ok: boolean;
  logs?: ThemeGroupLog[];
  error?: string;
};

export async function fetchThemeGroupProducts(_params?: Partial<ThemeGroupFilters>) {
  // TODO: 替换为松赞操作系统真实产品 API。
  await wait();
  return structuredClone(productsStore);
}

export async function fetchThemeGroupDepartures(_params?: Partial<ThemeGroupFilters>) {
  // TODO: 替换为松赞操作系统真实团期 API。
  await wait();
  return structuredClone(productsStore.flatMap((product) => product.departures));
}

export async function fetchThemeGroupOrders(_params?: Partial<ThemeGroupFilters>) {
  // TODO: 替换为松赞操作系统真实团单 API。
  await wait();
  return structuredClone(
    productsStore.flatMap((product) =>
      product.departures.map((departure) => ({
        orderNo: departure.orderNo,
        orderStatus: departure.orderStatus,
        consultant: departure.consultant,
      })),
    ),
  );
}

export async function fetchThemeGroupInventory(_params?: Partial<ThemeGroupFilters>) {
  // TODO: 替换为松赞操作系统真实库存/房间资源 API。
  await wait();
  return structuredClone(
    productsStore.flatMap((product) =>
      product.departures.map((departure) => ({
        departureId: departure.id,
        allocatedRooms: departure.allocatedRooms,
        remainingGuests: departure.remainingGuests,
        remainingRooms: departure.remainingRooms,
      })),
    ),
  );
}

export async function fetchThemeGroupDashboard(params?: Partial<ThemeGroupFilters>) {
  const payload = await auth.fetch<ThemeGroupDashboardResponse>("/api/theme-groups/dashboard", {
    method: "POST",
    body: JSON.stringify({
      filters: params || {},
      firstResult: 0,
      pageSize: 200,
    }),
  });

  if (payload.ok && Array.isArray(payload.products)) {
    productsStore = payload.products;
    return structuredClone(productsStore);
  }

  throw new Error(payload.error || "Dashboard request failed");
}

export async function fetchThemeGroupDepartureDetails(travelGroupCodes: string[]) {
  const payload = await auth.fetch<ThemeGroupDepartureDetailsResponse>("/api/theme-groups/departure-details", {
    method: "POST",
    body: JSON.stringify({ travelGroupCodes }),
  });

  if (payload.ok && Array.isArray(payload.details)) {
    return payload.details;
  }

  throw new Error(payload.error || "Departure details request failed");
}

export async function updateThemeGroupRemark(input: UpdateRemarkInput) {
  const payload = await auth.fetch<UpdateRemarkResponse>("/api/theme-groups/remarks/update", {
    method: "POST",
    body: JSON.stringify(input),
  });

  if (!payload.ok) {
    throw new Error(payload.error || "Remark update failed");
  }

  productsStore = productsStore.map((product) => {
    if (input.objectType === "product" && product.id === input.objectId && input.fieldName === "productRemark") {
      return { ...product, productRemark: input.content };
    }

    return {
      ...product,
      departures: product.departures.map((departure) => {
        if (departure.id !== input.objectId) return departure;
        if (!isDepartureRemarkField(input.fieldName)) return departure;
        return {
          ...departure,
          [input.fieldName]: input.content,
          updatedAt: payload.log?.changedAt ?? departure.updatedAt,
        };
      }),
    };
  });

  return {
    products: structuredClone(productsStore),
    log: payload.log ?? null,
  };
}

export async function fetchThemeGroupRemarkLogs(objectId?: string) {
  const payload = await auth.fetch<RemarkLogsResponse>("/api/theme-groups/remarks/logs", {
    method: "POST",
    body: JSON.stringify({ objectId }),
  });

  if (payload.ok && Array.isArray(payload.logs)) {
    return payload.logs;
  }

  throw new Error(payload.error || "Remark logs request failed");
}

function isDepartureRemarkField(fieldName: RemarkField): fieldName is keyof Pick<ThemeGroupDeparture, "salesRemark" | "operationRemark" | "roomingRemark"> {
  return fieldName === "salesRemark" || fieldName === "operationRemark" || fieldName === "roomingRemark";
}
