import { useMemo, useState, type ReactNode } from "react";
import { Button, DatePicker, Select } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { ArrowLeft, Hotel, Search } from "lucide-react";
import AuthLogoutButton from "../components/AuthLogoutButton";
import MobileQrButton from "../components/MobileQrButton";

type HotelInventoryFilters = {
  checkInStart: string;
  checkInEnd: string;
  hotel: string;
  roomType: string;
};

type HotelInventoryProduct = {
  id: string;
  productName: string;
  publicPoolRemainingRooms: number;
  preReservedRemainingRooms: number;
  date: string;
  price: number;
};

type HotelInventoryRoomGroup = {
  id: string;
  hotelName: string;
  roomTypeName: string;
  products: HotelInventoryProduct[];
};

const defaultFilters: HotelInventoryFilters = {
  checkInStart: "",
  checkInEnd: "",
  hotel: "",
  roomType: "",
};

const inventoryRows: HotelInventoryRoomGroup[] = [];

export default function HotelInventoryPage() {
  const [filters, setFilters] = useState<HotelInventoryFilters>(defaultFilters);
  const hotelOptions = useMemo(() => unique(inventoryRows.map((row) => row.hotelName)), []);
  const roomTypeOptions = useMemo(() => unique(inventoryRows.map((row) => row.roomTypeName)), []);
  const filteredRows = useMemo(
    () =>
      inventoryRows
        .filter((row) => !filters.hotel || row.hotelName === filters.hotel)
        .filter((row) => !filters.roomType || row.roomTypeName === filters.roomType)
        .map((row) => ({
          ...row,
          products: row.products.filter((product) => {
            const startMatches = !filters.checkInStart || product.date >= filters.checkInStart;
            const endMatches = !filters.checkInEnd || product.date <= filters.checkInEnd;
            return startMatches && endMatches;
          }),
        }))
        .filter((row) => row.products.length > 0),
    [filters],
  );

  const updateFilter = (patch: Partial<HotelInventoryFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
  };

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-[#1f2428]">
      <header className="border-b border-[#e5e7eb] bg-white">
        <div className="mx-auto flex max-w-[1920px] flex-col gap-4 px-4 py-4 sm:gap-5 sm:px-6 sm:py-6">
          <a href="/theme-groups/dashboard" className="inline-flex w-fit items-center gap-2 text-base text-[#4b535c] hover:text-[#a43127]">
            <ArrowLeft className="h-4 w-4" />
            返回主题团看板
          </a>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <MobileQrButton />
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#fff8f6] text-[#a43127] sm:h-12 sm:w-12">
                <Hotel className="h-6 w-6" />
              </span>
              <div>
                <h1 className="text-2xl font-semibold tracking-normal text-[#15191d] sm:text-[30px]">查询酒店库存</h1>
                <p className="mt-1 text-base text-[#7b838c]">按入住日期、酒店、房型查询库存与价格</p>
              </div>
            </div>
            <AuthLogoutButton />
          </div>

          <section className="rounded-lg border border-[#e5e7eb] bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.06)] sm:p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <DateRangeFilterInput
                label="入住起止日期"
                value={[filters.checkInStart, filters.checkInEnd]}
                onChange={(value) => updateFilter({ checkInStart: value[0], checkInEnd: value[1] })}
              />
              <SelectFilter
                label="酒店"
                value={filters.hotel}
                placeholder="全部酒店"
                emptyText="暂无酒店数据"
                options={hotelOptions}
                onChange={(value) => updateFilter({ hotel: value })}
              />
              <SelectFilter
                label="房型"
                value={filters.roomType}
                placeholder="全部房型"
                emptyText="暂无房型数据"
                options={roomTypeOptions}
                onChange={(value) => updateFilter({ roomType: value })}
              />
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                htmlType="button"
                disabled
                type="primary"
                icon={<Search className="h-4 w-4" />}
                size="large"
                className="w-full sm:w-auto"
              >
                查询
              </Button>
            </div>
          </section>
        </div>
      </header>

      <section className="mx-auto max-w-[1920px] px-4 py-4 sm:px-6 sm:py-5">
        <div className="overflow-hidden bg-transparent lg:rounded-lg lg:border lg:border-[#d8dde3] lg:bg-white lg:shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between rounded-lg border border-[#e3e5e8] bg-white px-4 py-3 lg:rounded-none lg:border-x-0 lg:border-t-0">
            <div className="flex items-center gap-2 text-base font-semibold">
              <Hotel className="h-5 w-5 text-[#a43127]" />
              酒店库存表
            </div>
          </div>
          <div className="hidden overflow-auto lg:block">
            <table className="min-w-[1180px] border-separate border-spacing-0 text-left text-base">
              <thead className="bg-white text-[#1f2428]">
                <tr>
                  <Th className="w-[220px]">酒店名称</Th>
                  <Th className="w-[220px]">房型名称</Th>
                  <Th className="w-[260px]">客房产品名称</Th>
                  <Th className="w-[170px]">公共池剩余房间数</Th>
                  <Th className="w-[190px]">预保留剩余房间数</Th>
                  <Th className="w-[150px]">日期</Th>
                  <Th className="w-[140px]">价格</Th>
                </tr>
              </thead>
              {filteredRows.length ? (
                filteredRows.map((row) => (
                  <tbody key={row.id}>
                    {row.products.map((product, productIndex) => (
                      <tr key={product.id} className="bg-white hover:bg-[#fbfdff]">
                        {productIndex === 0 ? (
                          <>
                            <Td rowSpan={row.products.length} strong>
                              {row.hotelName}
                            </Td>
                            <Td rowSpan={row.products.length} strong>
                              {row.roomTypeName}
                            </Td>
                          </>
                        ) : null}
                        <Td>{product.productName}</Td>
                        <Td>{product.publicPoolRemainingRooms}</Td>
                        <Td>{product.preReservedRemainingRooms}</Td>
                        <Td>{product.date}</Td>
                        <Td>{product.price > 0 ? `￥${formatMoney(product.price)}` : ""}</Td>
                      </tr>
                    ))}
                  </tbody>
                ))
              ) : (
                <tbody>
                  <tr>
                    <td colSpan={7} className="h-72 border-r border-[#d8dde3] px-4 py-8 text-center text-base text-[#7b838c]">
                      暂无酒店库存数据，等待接口接入
                    </td>
                  </tr>
                </tbody>
              )}
            </table>
          </div>
          <MobileInventoryList rows={filteredRows} />
        </div>
      </section>
    </main>
  );
}

const { RangePicker } = DatePicker;

function DateRangeFilterInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: [string, string];
  onChange: (value: [string, string]) => void;
}) {
  const pickerValue: [Dayjs, Dayjs] | null = value[0] && value[1] ? [dayjs(value[0]), dayjs(value[1])] : null;

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm text-[#6d747c]">{label}</span>
      <RangePicker
        value={pickerValue}
        onChange={(_, dateStrings) => onChange([dateStrings[0], dateStrings[1]])}
        className="w-full"
        size="large"
        allowClear
      />
    </label>
  );
}

function SelectFilter({
  label,
  value,
  placeholder,
  emptyText,
  options,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  emptyText: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm text-[#6d747c]">{label}</span>
      <Select
        value={value}
        onChange={onChange}
        disabled={options.length === 0}
        options={[{ label: options.length ? placeholder : emptyText, value: "" }, ...options.map((option) => ({ label: option, value: option }))]}
        size="large"
        className="w-full"
      />
    </label>
  );
}

function MobileInventoryList({ rows }: { rows: HotelInventoryRoomGroup[] }) {
  if (!rows.length) {
    return <div className="min-h-[260px] px-5 py-16 text-center text-base text-[#7b838c] lg:hidden">暂无酒店库存数据，等待接口接入</div>;
  }

  return (
    <div className="space-y-3 bg-[#f5f7fb] p-3 lg:hidden">
      {rows.map((row) => (
        <section key={row.id} className="overflow-hidden rounded-lg border border-[#e3e5e8] bg-white">
          <div className="border-b border-[#eef0f3] p-4">
            <p className="text-lg font-semibold leading-7 text-[#15191d]">{row.hotelName}</p>
            <p className="mt-1 text-sm text-[#6d747c]">房型：{row.roomTypeName}</p>
          </div>
          <div className="divide-y divide-[#eef0f3]">
            {row.products.map((product) => (
              <article key={product.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold leading-6 text-[#15191d]">{product.productName}</p>
                    <p className="mt-1 text-sm text-[#6d747c]">{product.date}</p>
                  </div>
                  <p className="whitespace-nowrap text-base font-semibold text-[#a43127]">{product.price > 0 ? `￥${formatMoney(product.price)}` : "-"}</p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <MobileField label="公共池剩余">{product.publicPoolRemainingRooms}</MobileField>
                  <MobileField label="预保留剩余">{product.preReservedRemainingRooms}</MobileField>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function MobileField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs text-[#8a929b]">{label}</p>
      <div className="text-sm font-medium leading-6 text-[#1f2428]">{children ?? "-"}</div>
    </div>
  );
}

function Th({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <th className={`whitespace-nowrap border-b border-r border-[#cfd5dc] bg-[#f3f6fa] px-4 py-4 text-base font-semibold ${className}`}>{children}</th>;
}

function Td({
  children,
  strong = false,
  rowSpan,
}: {
  children: ReactNode;
  strong?: boolean;
  rowSpan?: number;
}) {
  return (
    <td rowSpan={rowSpan} className={`border-b border-r border-[#d8dde3] px-4 py-3 align-middle leading-6 ${strong ? "font-semibold" : ""}`}>
      {children}
    </td>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function unique(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}
