import { useMemo, useState } from "react";
import { Alert, Button, DatePicker, Select, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import { ArrowLeft, Hotel, Search } from "lucide-react";
import AuthLogoutButton from "../components/AuthLogoutButton";
import MobileQrButton from "../components/MobileQrButton";
import { fetchHotelInventory, type HotelInventoryRow } from "./api";

type HotelInventoryFilters = {
  checkInStart: string;
  checkInEnd: string;
  hotelCode: string;
  roomType: string;
};

const defaultFilters: HotelInventoryFilters = {
  checkInStart: "",
  checkInEnd: "",
  hotelCode: "STML-CS",
  roomType: "",
};

const defaultHotelOptions = [{ label: "STML-CS", value: "STML-CS" }];

const inventoryColumns: ColumnsType<HotelInventoryRow> = [
  {
    title: "日期",
    dataIndex: "rsvDate",
    width: 130,
    fixed: "left",
    sorter: (a, b) => a.rsvDate.localeCompare(b.rsvDate),
  },
  {
    title: "酒店",
    dataIndex: "hotelName",
    width: 210,
    render: (_, row) => (
      <div>
        <p className="font-semibold text-[#15191d]">{row.hotelName || row.hotelShortName || row.hotelCode}</p>
        <p className="mt-1 font-mono text-xs text-[#7b838c]">{row.hotelCode}</p>
      </div>
    ),
  },
  {
    title: "房型",
    dataIndex: "roomTypeName",
    width: 220,
    render: (_, row) => (
      <div>
        <p className="font-semibold text-[#15191d]">{row.roomTypeName || row.roomTypeCode}</p>
        <p className="mt-1 font-mono text-xs text-[#7b838c]">{row.roomTypeCode}</p>
      </div>
    ),
  },
  {
    title: "公共池",
    dataIndex: "publicPoolNum",
    width: 110,
    align: "right",
    render: (value: number) => <InventoryNumber value={value} />,
  },
  {
    title: "预保留",
    dataIndex: "blockAvailNum",
    width: 110,
    align: "right",
    render: (value: number) => <InventoryNumber value={value} />,
  },
  {
    title: "预分配",
    dataIndex: "preAllocationNum",
    width: 110,
    align: "right",
  },
  {
    title: "预占",
    dataIndex: "preOccupiedNum",
    width: 100,
    align: "right",
  },
  {
    title: "实占",
    dataIndex: "realOccupiedNum",
    width: 100,
    align: "right",
  },
  {
    title: "总房量",
    dataIndex: "pmsTotalNum",
    width: 110,
    align: "right",
  },
  {
    title: "维修",
    dataIndex: "oooNum",
    width: 100,
    align: "right",
    render: (value: number) => (value > 0 ? <Tag color="red">{value}</Tag> : value),
  },
];

export default function HotelInventoryPage() {
  const [filters, setFilters] = useState<HotelInventoryFilters>(defaultFilters);
  const [rows, setRows] = useState<HotelInventoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const hotelOptions = useMemo(() => {
    const fromRows = rows.map((row) => ({
      label: row.hotelName ? `${row.hotelName}（${row.hotelCode}）` : row.hotelCode,
      value: row.hotelCode,
    }));
    return uniqueOptions([...defaultHotelOptions, ...fromRows]);
  }, [rows]);
  const roomTypeOptions = useMemo(
    () =>
      uniqueOptions(
        rows
          .filter((row) => !filters.hotelCode || row.hotelCode === filters.hotelCode)
          .map((row) => ({
            label: row.roomTypeName ? `${row.roomTypeName}（${row.roomTypeCode}）` : row.roomTypeCode,
            value: row.roomTypeCode,
          })),
      ),
    [filters.hotelCode, rows],
  );
  const filteredRows = useMemo(
    () =>
      rows
        .filter((row) => !filters.hotelCode || row.hotelCode === filters.hotelCode)
        .filter((row) => !filters.roomType || row.roomTypeCode === filters.roomType),
    [filters.hotelCode, filters.roomType, rows],
  );
  const canQuery = Boolean(filters.checkInStart && filters.checkInEnd);

  const updateFilter = (patch: Partial<HotelInventoryFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
  };

  const queryInventory = async () => {
    if (!canQuery) return;
    setLoading(true);
    setError("");

    try {
      const result = await fetchHotelInventory({
        hotelCodes: filters.hotelCode ? [filters.hotelCode] : [],
        beginDate: filters.checkInStart,
        endDate: filters.checkInEnd,
      });
      setRows(result);
    } catch {
      setError("酒店库存数据加载失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
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
                <p className="mt-1 text-base text-[#7b838c]">按入住日期、酒店、房型查询库存</p>
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
                value={filters.hotelCode}
                placeholder="请选择酒店"
                options={hotelOptions}
                onChange={(value) => updateFilter({ hotelCode: value, roomType: "" })}
              />
              <SelectFilter
                label="房型"
                value={filters.roomType}
                placeholder="全部房型"
                options={roomTypeOptions}
                onChange={(value) => updateFilter({ roomType: value })}
                allowClear
              />
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                htmlType="button"
                disabled={!canQuery}
                loading={loading}
                type="primary"
                icon={<Search className="h-4 w-4" />}
                size="large"
                className="w-full sm:w-auto"
                onClick={queryInventory}
              >
                查询
              </Button>
            </div>
          </section>
        </div>
      </header>

      <section className="mx-auto max-w-[1920px] px-4 py-4 sm:px-6 sm:py-5">
        {error ? <Alert className="mb-4" type="error" showIcon message={error} /> : null}
        <div className="overflow-hidden rounded-lg border border-[#d8dde3] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between border-b border-[#e3e5e8] bg-white px-4 py-3">
            <div className="flex items-center gap-2 text-base font-semibold">
              <Hotel className="h-5 w-5 text-[#a43127]" />
              酒店库存表
            </div>
            <span className="text-sm text-[#7b838c]">共 {filteredRows.length} 条</span>
          </div>
          <Table
            rowKey="id"
            loading={loading}
            columns={inventoryColumns}
            dataSource={filteredRows}
            pagination={false}
            scroll={{ x: 1200 }}
            size="middle"
            locale={{ emptyText: canQuery ? "暂无酒店库存数据" : "请选择入住起止日期后查询" }}
          />
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
  options,
  allowClear = false,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: Array<{ label: string; value: string }>;
  allowClear?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm text-[#6d747c]">{label}</span>
      <Select
        value={value || undefined}
        onChange={(nextValue) => onChange(nextValue || "")}
        placeholder={placeholder}
        options={options}
        size="large"
        className="w-full"
        allowClear={allowClear}
      />
    </label>
  );
}

function InventoryNumber({ value }: { value: number }) {
  const color = value > 0 ? "#276749" : "#9aa1a9";
  return <span style={{ color, fontWeight: value > 0 ? 600 : 400 }}>{value}</span>;
}

function uniqueOptions(options: Array<{ label: string; value: string }>) {
  const seen = new Set<string>();
  return options.filter((option) => {
    if (!option.value || seen.has(option.value)) return false;
    seen.add(option.value);
    return true;
  });
}
