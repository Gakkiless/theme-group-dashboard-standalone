export type ProductStatus = "on_sale" | "paused" | "offline" | "unknown";
export type DepartureStatus = "opened" | "cancelled" | "unknown";
export type OrderStatus = "open" | "submitted" | "cancelled" | "closed" | "waitlist" | "unknown";
export type RemarkField = "productRemark" | "salesRemark" | "operationRemark" | "roomingRemark";
export type RemarkObjectType = "product" | "departure" | "order";

export type ThemeGroupProduct = {
  id: string;
  productCode: string;
  name: string;
  subtitle: string;
  businessType: string;
  series: string;
  seriesDesc: string;
  theme: string;
  themeDesc: string;
  tags: string[];
  status: ProductStatus;
  owner: string;
  productRemark: string;
  departures: ThemeGroupDeparture[];
};

export type ThemeGroupDeparture = {
  id: string;
  productId: string;
  departureDate: string;
  returnDate: string;
  days: number;
  price: number;
  priceText: string;
  priceModel: string;
  listPrice?: number;
  priceSource?: "list" | "detail" | "none";
  singleRoomSupplement: number;
  allocatedRooms: string;
  allocatedRoomCount?: number;
  soldRoomCount?: number;
  availableRoomCount?: number;
  receivedGuests: number;
  remainingGuests: number;
  remainingRooms: string;
  roomingText: string;
  roomingRemark: string;
  consultant: string;
  orderNo: string;
  departureStatus: DepartureStatus;
  departureStatusText: string;
  orderStatus: OrderStatus;
  orderStatusText: string;
  salesRemark: string;
  operationRemark: string;
  updatedAt: string;
};

export type ThemeGroupLog = {
  id: string;
  objectType: RemarkObjectType;
  objectId: string;
  fieldName: RemarkField;
  beforeContent: string;
  afterContent: string;
  changedAt: string;
  source: "theme-group-dashboard";
};

export type ThemeGroupFilters = {
  keyword: string;
  departureDate: string;
  series: string[];
  themes: string[];
  orderStatuses: string[];
  showPastDepartures: boolean;
};

export type ThemeGroupSortKey = "departureDate" | "price" | "receivedGuests" | "remainingGuests" | "updatedAt";
export type SortDirection = "asc" | "desc";

export type UpdateRemarkInput = {
  objectType: RemarkObjectType;
  objectId: string;
  fieldName: RemarkField;
  content: string;
};
