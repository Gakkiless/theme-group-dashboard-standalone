import { useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, Hotel, Search } from "lucide-react";

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
        <div className="mx-auto flex max-w-[1920px] flex-col gap-5 px-6 py-6">
          <a href="/theme-groups/dashboard" className="inline-flex w-fit items-center gap-2 text-base text-[#4b535c] hover:text-[#a43127]">
            <ArrowLeft className="h-4 w-4" />
            返回主题团看板
          </a>
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#fff8f6] text-[#a43127]">
              <Hotel className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-[30px] font-semibold tracking-normal text-[#15191d]">查询酒店库存</h1>
              <p className="mt-1 text-base text-[#7b838c]">按入住日期、酒店、房型查询库存与价格</p>
            </div>
          </div>

          <section className="rounded-xl border border-[#e5e7eb] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <DateFilterInput
                label="入住开始日期"
                value={filters.checkInStart}
                onChange={(value) => updateFilter({ checkInStart: value })}
              />
              <DateFilterInput
                label="入住结束日期"
                value={filters.checkInEnd}
                onChange={(value) => updateFilter({ checkInEnd: value })}
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
              <button
                type="button"
                disabled
                className="inline-flex h-11 cursor-not-allowed items-center gap-2 rounded-lg bg-[#a43127] px-5 text-base text-white opacity-50"
              >
                <Search className="h-4 w-4" />
                查询
              </button>
            </div>
          </section>
        </div>
      </header>

      <section className="mx-auto max-w-[1920px] px-6 py-5">
        <div className="overflow-hidden rounded-xl border border-[#d8dde3] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between border-b border-[#e3e5e8] px-4 py-3">
            <div className="flex items-center gap-2 text-base font-semibold">
              <Hotel className="h-5 w-5 text-[#a43127]" />
              酒店库存表
            </div>
          </div>
          <div className="overflow-auto">
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
        </div>
      </section>
    </main>
  );
}

function DateFilterInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const openPicker = () => {
    const input = inputRef.current;
    if (!input) return;
    if (typeof input.showPicker === "function") input.showPicker();
    input.focus();
  };

  return (
    <label className="flex cursor-pointer flex-col gap-1.5" onClick={openPicker}>
      <span className="text-sm text-[#6d747c]">{label}</span>
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 cursor-pointer rounded-lg border border-[#d9dde2] bg-white px-3 text-base outline-none transition focus:border-[#a43127] focus:shadow-[0_0_0_3px_rgba(164,49,39,0.12)]"
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
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={options.length === 0}
        className="h-11 rounded-lg border border-[#d9dde2] bg-white px-3 text-base outline-none transition disabled:cursor-not-allowed disabled:bg-[#f7f8fa] disabled:text-[#9aa1a9] focus:border-[#a43127] focus:shadow-[0_0_0_3px_rgba(164,49,39,0.12)]"
      >
        <option value="">{options.length ? placeholder : emptyText}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
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
