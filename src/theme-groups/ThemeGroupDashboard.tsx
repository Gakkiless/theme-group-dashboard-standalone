import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  History,
  Loader2,
  Save,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  fetchThemeGroupDashboard,
  fetchThemeGroupRemarkLogs,
  updateThemeGroupRemark,
} from "./api";
import type {
  DepartureStatus,
  OrderStatus,
  RemarkField,
  RemarkObjectType,
  ThemeGroupDeparture,
  ThemeGroupFilters,
  ThemeGroupLog,
  ThemeGroupProduct,
} from "./types";

const defaultFilters: ThemeGroupFilters = {
  keyword: "",
  departureDate: "",
  series: [],
  themes: [],
  orderStatuses: [],
  showPastDepartures: false,
  showWaitShareOnly: false,
};

const orderStatusText: Record<OrderStatus, string> = {
  open: "可售",
  submitted: "已提交排团",
  cancelled: "已取消",
  closed: "已成团",
  waitlist: "待支付/候补",
  unknown: "未返回",
};

const departureStatusText: Record<DepartureStatus, string> = {
  opened: "已开团",
  cancelled: "已取消",
  unknown: "未返回",
};

const remarkFieldText: Record<RemarkField, string> = {
  productRemark: "产品备注",
  salesRemark: "备注",
  operationRemark: "备注",
  roomingRemark: "特殊房型/拼住备注",
};

type EditableRemark = {
  objectType: RemarkObjectType;
  objectId: string;
  fieldName: RemarkField;
  title: string;
  currentValue: string;
  context: string;
};

type GroupedProduct = ThemeGroupProduct & {
  departures: ThemeGroupDeparture[];
};

export default function ThemeGroupDashboard() {
  const [products, setProducts] = useState<ThemeGroupProduct[]>([]);
  const [filters, setFilters] = useState<ThemeGroupFilters>(defaultFilters);
  const [editingRemark, setEditingRemark] = useState<EditableRemark | null>(null);
  const [allLogsObjectId, setAllLogsObjectId] = useState<string | null>(null);
  const [logs, setLogs] = useState<ThemeGroupLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    setLoading(true);
    setError("");
    fetchThemeGroupDashboard(filters)
      .then((data) => {
        if (!ignore) setProducts(data);
      })
      .catch(() => {
        if (!ignore) setError("看板数据加载失败，请稍后重试。");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    const objectId = editingRemark?.objectId ?? allLogsObjectId;
    if (!objectId) {
      setLogs([]);
      return;
    }

    let ignore = false;
    fetchThemeGroupRemarkLogs(objectId).then((items) => {
      if (!ignore) setLogs(items);
    });

    return () => {
      ignore = true;
    };
  }, [editingRemark?.objectId, allLogsObjectId]);

  const seriesOptions = useMemo(() => unique(products.map((product) => product.seriesDesc)), [products]);
  const themeOptions = useMemo(() => unique(products.flatMap((product) => splitOptionText(product.themeDesc))), [products]);
  const orderStatusOptions = useMemo(
    () => unique(products.flatMap((product) => product.departures.map((departure) => getOrderStatusLabel(departure))).filter(isVisibleOrderStatusOption)),
    [products],
  );

  const groupedProducts = useMemo(
    () => buildGroupedProducts(products, filters),
    [filters, products],
  );

  const openRemarkEditor = (remark: EditableRemark) => {
    setError("");
    setAllLogsObjectId(null);
    setEditingRemark(remark);
  };

  const submitRemark = async (content: string) => {
    if (!editingRemark) return;

    setSaving(true);
    setError("");

    try {
      const result = await updateThemeGroupRemark({
        objectType: editingRemark.objectType,
        objectId: editingRemark.objectId,
        fieldName: editingRemark.fieldName,
        content,
      });
      setProducts(result.products);
      setEditingRemark(null);
    } catch {
      setError("备注保存失败，请检查接口或稍后重试。");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-[#1f2428]">
      <header className="border-b border-[#e5e7eb] bg-white">
        <div className="mx-auto flex max-w-[1920px] flex-col gap-5 px-6 py-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-[30px] font-semibold tracking-normal text-[#15191d]">松赞在售主题团看板</h1>
            </div>
          </div>

          <section className="rounded-xl border border-[#e5e7eb] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <label className="relative min-w-[360px] flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6b7280]" />
                  <input
                    value={filters.keyword}
                    onChange={(event) => setFilters((current) => ({ ...current, keyword: event.target.value }))}
                    placeholder="搜索产品名称 / 产品编号 / 团单号"
                    className="h-12 w-full rounded-lg border-2 border-[#cfd6e4] bg-white pl-12 pr-4 text-base shadow-sm outline-none transition focus:border-[#a43127] focus:shadow-[0_0_0_3px_rgba(164,49,39,0.12)]"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setFilters(defaultFilters)}
                  className="inline-flex h-12 items-center gap-2 rounded-lg border border-[#d9dde2] bg-white px-4 text-base text-[#4b535c] transition hover:border-[#a43127] hover:text-[#a43127]"
                >
                  <X className="h-4 w-4" />
                  重置
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 text-base md:grid-cols-2 xl:grid-cols-4">
                <DateFilterInput
                  label="团期出发日期"
                  value={filters.departureDate}
                  onChange={(value) => setFilters((current) => ({ ...current, departureDate: value }))}
                />
                <FilterMultiSelect
                  label="产品系列"
                  values={filters.series}
                  onChange={(values) => setFilters((current) => ({ ...current, series: values }))}
                  options={seriesOptions}
                />
                <DropdownMultiSelect
                  label="产品主题"
                  values={filters.themes}
                  onChange={(values) => setFilters((current) => ({ ...current, themes: values }))}
                  options={themeOptions}
                />
                <FilterMultiSelect
                  label="团单状态"
                  values={filters.orderStatuses}
                  onChange={(values) => setFilters((current) => ({ ...current, orderStatuses: values }))}
                  options={orderStatusOptions}
                />
              </div>
            </div>
          </section>
        </div>
      </header>

      <section className="mx-auto max-w-[1920px] px-6 py-5">
        {error ? <div className="mb-4 rounded-lg border border-[#f1c4bf] bg-[#fff6f4] px-4 py-3 text-base text-[#a43127]">{error}</div> : null}

        <div className="overflow-hidden rounded-xl border border-[#d8dde3] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          {loading ? (
            <div className="h-1 overflow-hidden bg-[#f2dedb]">
              <div className="theme-group-loading-bar h-full bg-[#a43127]" />
            </div>
          ) : null}
          <div className="flex items-center justify-between border-b border-[#e3e5e8] px-4 py-3">
            <div className="flex items-center gap-2 text-base font-semibold">
              <SlidersHorizontal className="h-5 w-5 text-[#a43127]" />
              产品团期表
            </div>
            <div className="flex items-center gap-2 text-base">
              <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-[#d9dde2] bg-white px-4 text-base text-[#4b535c] transition hover:border-[#a43127] hover:text-[#a43127]">
                <input
                  type="checkbox"
                  checked={filters.showPastDepartures}
                  onChange={(event) => setFilters((current) => ({ ...current, showPastDepartures: event.target.checked }))}
                  className="h-4 w-4 accent-[#a43127]"
                />
                展示历史团期
              </label>
              <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-[#d9dde2] bg-white px-4 text-base text-[#4b535c] transition hover:border-[#a43127] hover:text-[#a43127]">
                <input
                  type="checkbox"
                  checked={filters.showWaitShareOnly}
                  onChange={(event) => setFilters((current) => ({ ...current, showWaitShareOnly: event.target.checked }))}
                  className="h-4 w-4 accent-[#a43127]"
                />
                仅显示待拼团
              </label>
            </div>
          </div>

          <div className="max-h-[calc(100vh-260px)] min-h-[520px] overflow-auto">
            <table className="min-w-[1850px] border-separate border-spacing-0 text-left text-base">
              <thead className="sticky top-0 z-20 bg-white text-[#1f2428]">
                <tr>
                  <Th className="sticky left-0 z-30 w-[320px]">产品名称</Th>
                  <Th className="w-[230px]">团单号</Th>
                  <Th className="w-[132px]">出发日期</Th>
                  <Th>价格/元/人</Th>
                  <Th className="w-[126px]">单房差</Th>
                  <Th className="w-[190px]">预分配房间资源</Th>
                  <Th className="w-[120px]">已收人数</Th>
                  <Th className="w-[120px]">余位人数</Th>
                  <Th className="w-[180px]">余位房间</Th>
                  <Th className="w-[190px]">拼住/特殊房型等</Th>
                  <Th className="w-[120px]">负责顾问</Th>
                  <Th className="w-[120px]">团期状态</Th>
                  <Th className="w-[136px]">团单状态</Th>
                  <Th className="w-[250px]">备注</Th>
                  <Th className="w-[170px]">最后更新时间</Th>
                </tr>
              </thead>
              {loading ? (
                <tbody>
                  <tr>
                    <td colSpan={15} className="h-72 text-center text-[#6d747c]">
                      <div className="mx-auto flex max-w-[360px] flex-col items-center gap-3">
                        <span className="flex h-14 w-14 items-center justify-center rounded-lg border border-[#f1c4bf] bg-[#fff8f6]">
                          <Loader2 className="h-6 w-6 animate-spin text-[#a43127]" />
                        </span>
                        <div>
                          <p className="font-medium text-[#1f2428]">正在拉取 2026 年主题团团期</p>
                          <p className="mt-1 text-xs text-[#7b838c]">接口数据量较大，正在自动分页聚合</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              ) : groupedProducts.length ? (
                groupedProducts.map((product) => (
                  <tbody key={product.id} className="group">
                    {product.departures.map((departure, departureIndex) => (
                      <tr key={departure.id} className={rowClassName(product, departure)}>
                        {departureIndex === 0 ? (
                          <td
                            rowSpan={product.departures.length}
                            className="sticky left-0 z-10 w-[320px] border-b border-r border-[#cfd5dc] bg-white p-0 align-top"
                          >
                            <ProductCell product={product} onEdit={openRemarkEditor} />
                          </td>
                        ) : null}
                        <Td mono>{departure.orderNo}</Td>
                        <Td strong>{formatShortDate(departure.departureDate)}</Td>
                        <Td strong className="whitespace-nowrap">
                          <PriceCell departure={departure} />
                        </Td>
                        <Td>{formatMoney(departure.singleRoomSupplement)}</Td>
                        <Td>{departure.allocatedRooms}</Td>
                        <Td strong={departure.receivedGuests > 0}>{departure.receivedGuests}</Td>
                        <Td>{departure.remainingGuests}</Td>
                        <Td>
                          <RemainingRooms value={departure.remainingRooms} />
                        </Td>
                        <Td>
                          <WaitShareInfo value={departure.roomingText} />
                        </Td>
                        <Td>{departure.consultant}</Td>
                        <Td>
                          <DepartureStatusBadge departure={departure} />
                        </Td>
                        <Td>
                          <OrderStatusBadge departure={departure} />
                        </Td>
                        <Td>
                          <RemarkButton
                            value={departure.operationRemark}
                            onClick={() =>
                              openRemarkEditor({
                                objectType: "departure",
                                objectId: departure.id,
                                fieldName: "operationRemark",
                                title: "编辑备注",
                                currentValue: departure.operationRemark,
                                context: `${product.name} / ${formatShortDate(departure.departureDate)} / ${departure.orderNo}`,
                              })
                            }
                          />
                        </Td>
                        <Td>{departure.updatedAt ? formatDateTime(departure.updatedAt) : ""}</Td>
                      </tr>
                    ))}
                  </tbody>
                ))
              ) : (
                <tbody>
                  <tr>
                    <td colSpan={15} className="h-72 text-center text-[#6d747c]">
                      没有匹配的主题团
                    </td>
                  </tr>
                </tbody>
              )}
            </table>
          </div>
        </div>
      </section>

      {editingRemark ? (
        <RemarkDialog
          remark={editingRemark}
          logs={logs.slice(0, 5)}
          saving={saving}
          onClose={() => setEditingRemark(null)}
          onSubmit={submitRemark}
          onViewAll={() => setAllLogsObjectId(editingRemark.objectId)}
        />
      ) : null}

      {allLogsObjectId ? <LogsDrawer logs={logs} onClose={() => setAllLogsObjectId(null)} /> : null}
    </main>
  );
}

function ProductCell({ product, onEdit }: { product: ThemeGroupProduct; onEdit: (remark: EditableRemark) => void }) {
  return (
    <div className="flex h-full flex-col gap-4 p-5">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-[#6d747c]">{product.businessType}</span>
        </div>
        <h2 className="mt-2 text-lg font-semibold leading-7 text-[#11161a]">{product.name}</h2>
      </div>
      <div className="space-y-2 text-base leading-7 text-[#4b535c]">
        <p className="font-mono text-lg text-[#15191d]">{product.productCode}</p>
        {product.seriesDesc ? (
          <p>
            <span className="text-[#7b838c]">产品系列：</span>
            {product.seriesDesc}
          </p>
        ) : null}
        {product.themeDesc ? (
          <p>
            <span className="text-[#7b838c]">产品主题：</span>
            {product.themeDesc}
          </p>
        ) : null}
      </div>
      <div>
        <p className="mb-1.5 text-sm font-medium text-[#6d747c]">产品备注</p>
        <RemarkButton
          value={product.productRemark}
          onClick={() =>
            onEdit({
              objectType: "product",
              objectId: product.id,
              fieldName: "productRemark",
              title: "编辑产品备注",
              currentValue: product.productRemark,
              context: `${product.name} / ${product.productCode}`,
            })
          }
        />
      </div>
    </div>
  );
}

function RemarkDialog({
  remark,
  logs,
  saving,
  onClose,
  onSubmit,
  onViewAll,
}: {
  remark: EditableRemark;
  logs: ThemeGroupLog[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (content: string) => void;
  onViewAll: () => void;
}) {
  const [content, setContent] = useState(remark.currentValue);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <section className="w-full max-w-[780px] rounded-xl border border-[#d8dde3] bg-white shadow-songtsam">
        <header className="flex items-start justify-between border-b border-[#e3e5e8] px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold">{remark.title}</h2>
            <p className="mt-1 text-base text-[#6d747c]">{remark.context}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-[#6d747c] hover:text-[#a43127]">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="grid gap-5 p-6 md:grid-cols-[1fr_300px]">
          <div>
            <label className="text-base font-medium">{remarkFieldText[remark.fieldName]}</label>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              className="mt-2 h-56 w-full resize-none rounded-lg border border-[#d9dde2] p-4 text-base leading-7 outline-none focus:border-[#a43127]"
              placeholder="请输入备注"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={onClose} className="h-10 rounded-lg border border-[#d9dde2] bg-white px-5 text-base">
                取消
              </button>
              <button
                type="button"
                onClick={() => onSubmit(content.trim())}
                disabled={saving}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#a43127] px-5 text-base text-white disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                保存
              </button>
            </div>
          </div>
          <aside className="rounded-lg border border-[#e3e5e8] bg-[#fafafa] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="inline-flex items-center gap-2 text-base font-semibold">
                <History className="h-4 w-4 text-[#a43127]" />
                最近修改
              </h3>
              <button type="button" onClick={onViewAll} className="text-sm text-[#a43127]">
                查看全部日志
              </button>
            </div>
            {logs.length ? (
              <div className="space-y-3">
                {logs.map((log) => (
                  <LogItem key={log.id} log={log} compact />
                ))}
              </div>
            ) : (
              <p className="text-base text-[#7b838c]">暂无修改记录</p>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}

function LogsDrawer({ logs, onClose }: { logs: ThemeGroupLog[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/20">
      <section className="h-full w-full max-w-[520px] overflow-auto border-l border-[#d8dde3] bg-white shadow-songtsam">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e3e5e8] bg-white px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">备注修改日志</h2>
            <p className="text-sm text-[#6d747c]">按修改时间倒序展示</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-[#6d747c] hover:text-[#a43127]">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="space-y-3 p-5">
          {logs.length ? logs.map((log) => <LogItem key={log.id} log={log} />) : <p className="text-sm text-[#7b838c]">暂无日志</p>}
        </div>
      </section>
    </div>
  );
}

function LogItem({ log, compact = false }: { log: ThemeGroupLog; compact?: boolean }) {
  return (
    <article className="border border-[#e3e5e8] bg-white p-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{remarkFieldText[log.fieldName]}</p>
          <p className="mt-1 text-xs text-[#6d747c]">{formatDateTime(log.changedAt)}</p>
        </div>
        {!compact ? <span className="text-xs text-[#7b838c]">{log.source}</span> : null}
      </div>
      <div className="mt-3 space-y-2 text-xs leading-5">
        <p>
          <span className="text-[#7b838c]">修改前：</span>
          {log.beforeContent || "空"}
        </p>
        <p>
          <span className="text-[#7b838c]">修改后：</span>
          {log.afterContent || "空"}
        </p>
      </div>
    </article>
  );
}

function RemarkButton({ value, onClick }: { value: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block min-h-8 w-full rounded-lg border border-transparent bg-transparent px-3 py-1.5 text-left text-base leading-5 text-[#1f2428] transition hover:border-[#a43127] hover:bg-[#fff8f6]"
    >
      {value ? <span className="line-clamp-3">{value}</span> : <span className="whitespace-nowrap text-[#a43127]">添加</span>}
    </button>
  );
}

function PriceCell({ departure }: { departure: ThemeGroupDeparture }) {
  const text = departure.priceText || (departure.price ? formatMoney(departure.price) : "");
  if (!text) return <span>-</span>;

  const lines = text.split("；").filter(Boolean);
  return (
    <div className="space-y-1 leading-5">
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}

function RemainingRooms({ value }: { value: string }) {
  if (!value) return null;
  return (
    <div className="space-y-1 leading-5">
      {value.split("；").map((item) => (
        <p key={item}>{item}</p>
      ))}
    </div>
  );
}

function WaitShareInfo({ value }: { value: string }) {
  if (!value) return null;
  return (
    <div className="space-y-1 leading-6">
      {value.split("；").map((item) => (
        <p key={item}>{item}</p>
      ))}
    </div>
  );
}

function OrderStatusBadge({ departure }: { departure: ThemeGroupDeparture }) {
  const { orderStatus: status } = departure;
  const className =
    status === "open"
      ? "bg-[#e8f5ed] text-[#276749]"
      : status === "cancelled"
        ? "bg-[#f0f1f2] text-[#666]"
        : status === "waitlist"
          ? "bg-[#fff3d6] text-[#9a5b00]"
          : status === "unknown"
            ? "bg-[#f0f1f2] text-[#666]"
            : "bg-[#e8f0fb] text-[#245c9b]";

  return <span className={`inline-flex rounded-md px-2.5 py-1.5 text-sm font-medium ${className}`}>{getOrderStatusLabel(departure)}</span>;
}

function DepartureStatusBadge({ departure }: { departure: ThemeGroupDeparture }) {
  const { departureStatus: status } = departure;
  const className =
    status === "opened"
      ? "bg-[#e8f5ed] text-[#276749]"
      : status === "cancelled"
        ? "bg-[#f0f1f2] text-[#666]"
        : "bg-[#f0f1f2] text-[#666]";

  return <span className={`inline-flex rounded-md px-2.5 py-1.5 text-sm font-medium ${className}`}>{departure.departureStatusText || departureStatusText[status]}</span>;
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

function FilterMultiSelect({
  label,
  values,
  options,
  onChange,
}: {
  label: string;
  values: string[];
  options: string[];
  onChange: (values: string[]) => void;
}) {
  const toggle = (value: string) => {
    onChange(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm text-[#6d747c]">{label}</span>
      <div className="flex min-h-11 flex-wrap gap-1.5 rounded-lg border border-[#d9dde2] bg-white p-1.5">
        {options.length ? (
          options.map((option) => {
            const selected = values.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => toggle(option)}
                className={`h-8 rounded-md border px-2.5 text-sm ${
                  selected ? "border-[#a43127] bg-[#fff8f6] text-[#a43127]" : "border-transparent bg-[#f6f7f8] text-[#4b535c]"
                }`}
              >
                {option}
              </button>
            );
          })
        ) : (
          <span className="px-2 py-1 text-sm text-[#7b838c]">暂无选项</span>
        )}
      </div>
    </div>
  );
}

function DropdownMultiSelect({
  label,
  values,
  options,
  onChange,
}: {
  label: string;
  values: string[];
  options: string[];
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const toggle = (value: string) => {
    onChange(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  };

  return (
    <div className="relative flex flex-col gap-1.5">
      <span className="text-sm text-[#6d747c]">{label}</span>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-11 items-center justify-between rounded-lg border border-[#d9dde2] bg-white px-3 text-left text-base outline-none transition hover:border-[#a43127]"
      >
        <span className="truncate">{values.length ? values.join("、") : "全部"}</span>
        <span className="text-[#6d747c]">⌄</span>
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-72 overflow-auto rounded-lg border border-[#d9dde2] bg-white p-2 shadow-songtsam">
          {options.length ? (
            options.map((option) => {
              const selected = values.includes(option);
              return (
                <label key={option} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-base hover:bg-[#fff8f6]">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggle(option)}
                    className="h-4 w-4 accent-[#a43127]"
                  />
                  <span>{option}</span>
                </label>
              );
            })
          ) : (
            <span className="block px-2 py-1 text-sm text-[#7b838c]">暂无选项</span>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Th({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <th className={`whitespace-nowrap border-b border-r border-[#cfd5dc] bg-[#f3f6fa] px-4 py-4 text-base font-semibold ${className}`}>{children}</th>;
}

function Td({
  children,
  strong = false,
  mono = false,
  className = "",
}: {
  children: ReactNode;
  strong?: boolean;
  mono?: boolean;
  className?: string;
}) {
  return (
    <td
      className={`border-b border-r border-[#d8dde3] px-4 py-3 align-middle leading-6 ${strong ? "font-semibold" : ""} ${
        mono ? "whitespace-nowrap font-mono" : ""
      } ${className}`}
    >
      {children}
    </td>
  );
}

function buildGroupedProducts(
  products: ThemeGroupProduct[],
  filters: ThemeGroupFilters,
): GroupedProduct[] {
  const keyword = filters.keyword.trim().toLowerCase();
  const today = getTodayDateString();

  return products
    .filter((product) => filters.series.length === 0 || filters.series.includes(product.seriesDesc))
    .filter((product) => filters.themes.length === 0 || splitOptionText(product.themeDesc).some((theme) => filters.themes.includes(theme)))
    .map((product) => {
      const productMatchesKeyword =
        keyword.length === 0 ||
        product.name.toLowerCase().includes(keyword) ||
        product.productCode.toLowerCase().includes(keyword);

      const departures = product.departures
        .filter((departure) => {
          const departureMatchesKeyword =
            productMatchesKeyword ||
            departure.orderNo.toLowerCase().includes(keyword);
          const dateMatches = !filters.departureDate || departure.departureDate === filters.departureDate;
          const openedMatches = departure.departureStatus === "opened";
          const historyMatches = filters.showPastDepartures || departure.departureDate >= today;
          const waitShareMatches = !filters.showWaitShareOnly || Boolean(departure.roomingText);
          const orderStatusLabel = getOrderStatusLabel(departure);
          const orderStatusMatches = filters.orderStatuses.length === 0 || filters.orderStatuses.includes(orderStatusLabel);

          return (
            departureMatchesKeyword &&
            dateMatches &&
            openedMatches &&
            historyMatches &&
            waitShareMatches &&
            orderStatusMatches
          );
        })
        .sort(compareDeparturesByDateProximity);

      return { ...product, departures };
    })
    .filter((product) => product.departures.length > 0);
}

function compareDeparturesByDateProximity(a: ThemeGroupDeparture, b: ThemeGroupDeparture) {
  const today = Date.parse(getTodayDateString());
  const aDate = Date.parse(a.departureDate);
  const bDate = Date.parse(b.departureDate);
  const aDistance = Number.isFinite(aDate) ? Math.abs(aDate - today) : Number.MAX_SAFE_INTEGER;
  const bDistance = Number.isFinite(bDate) ? Math.abs(bDate - today) : Number.MAX_SAFE_INTEGER;
  if (aDistance !== bDistance) return aDistance - bDistance;
  return (Number.isFinite(aDate) ? aDate : 0) - (Number.isFinite(bDate) ? bDate : 0);
}

function rowClassName(_product: ThemeGroupProduct, _departure: ThemeGroupDeparture) {
  return "bg-white hover:bg-[#fbfdff]";
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function formatShortDate(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hour = `${date.getHours()}`.padStart(2, "0");
  const minute = `${date.getMinutes()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day} ${hour}:${minute}`;
}

function unique(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

function getTodayDateString() {
  const date = new Date();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function getOrderStatusLabel(departure: ThemeGroupDeparture) {
  return departure.orderStatusText || (departure.orderStatus === "open" ? "未返回" : orderStatusText[departure.orderStatus]);
}

function isVisibleOrderStatusOption(label: string) {
  return Boolean(label) && !["可售", "失败", "未返回"].includes(label);
}

function splitOptionText(value: string) {
  return value
    .split(/[，,、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}
