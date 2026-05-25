import { auth } from "../auth";

export type HotelInventoryQuery = {
  hotelCodes: string[];
  beginDate: string;
  endDate: string;
};

export type HotelInventoryRow = {
  id: string;
  rsvDate: string;
  hotelCode: string;
  hotelName: string;
  hotelShortName: string;
  roomTypeCode: string;
  roomTypeName: string;
  publicPoolNum: number;
  blockAvailNum: number;
  preAllocationNum: number;
  preOccupiedNum: number;
  realOccupiedNum: number;
  pmsTotalNum: number;
  oooNum: number;
};

type HotelInventoryResponse = {
  ok: boolean;
  rows?: HotelInventoryRow[];
  error?: string;
};

export async function fetchHotelInventory(query: HotelInventoryQuery) {
  const payload = await auth.fetch<HotelInventoryResponse>("/api/hotel-inventory/query", {
    method: "POST",
    body: JSON.stringify(query),
  });

  if (payload.ok && Array.isArray(payload.rows)) {
    return payload.rows;
  }

  throw new Error(payload.error || "Hotel inventory request failed");
}
