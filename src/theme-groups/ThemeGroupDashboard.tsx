import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button, Checkbox, DatePicker, Drawer, Input, Modal, Select, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import {
  ArrowRight,
  Hotel,
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
import AuthLogoutButton from "../components/AuthLogoutButton";
import MobileQrButton from "../components/MobileQrButton";
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
  departureDateRange: ["", ""],
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
        <div className="mx-auto flex max-w-[1920px] flex-col gap-4 px-4 py-4 sm:gap-5 sm:px-6 sm:py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <MobileQrButton />
              <h1 className="text-2xl font-semibold tracking-normal text-[#15191d] sm:text-[30px]">松赞在售主题团看板</h1>
            </div>
            <AuthLogoutButton />
          </div>

          <section className="rounded-lg border border-[#e5e7eb] bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.06)] sm:p-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <label className="relative min-w-0 flex-1 sm:min-w-[360px]">
                  <Input
                    prefix={<Search className="h-5 w-5 text-[#6b7280]" />}
                    value={filters.keyword}
                    onChange={(event) => setFilters((current) => ({ ...current, keyword: event.target.value }))}
                    placeholder="搜索产品名称 / 产品编号 / 团单号"
                    allowClear
                    size="large"
                    className="w-full"
                  />
                </label>
                <Button
                  htmlType="button"
                  onClick={() => setFilters(defaultFilters)}
                  icon={<X className="h-4 w-4" />}
                  size="large"
                  className="w-full sm:w-auto"
                >
                  重置
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-3 text-base md:grid-cols-2 xl:grid-cols-4">
                <DateRangeFilterInput
                  label="团期出发日期"
                  value={filters.departureDateRange}
                  onChange={(value) => setFilters((current) => ({ ...current, departureDateRange: value }))}
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

      <section className="mx-auto max-w-[1920px] px-4 py-4 sm:px-6 sm:py-5">
        {error ? <div className="mb-4 rounded-lg border border-[#f1c4bf] bg-[#fff6f4] px-4 py-3 text-base text-[#a43127]">{error}</div> : null}

        <HotelInventoryEntryCard />

        <div className="overflow-hidden bg-transparent lg:rounded-lg lg:border lg:border-[#d8dde3] lg:bg-white lg:shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          {loading ? (
            <div className="h-1 overflow-hidden bg-[#f2dedb]">
              <div className="theme-group-loading-bar h-full bg-[#a43127]" />
            </div>
          ) : null}
          <div className="flex flex-col gap-3 rounded-lg border border-[#e3e5e8] bg-white px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:rounded-none lg:border-x-0 lg:border-t-0">
            <div className="flex items-center gap-2 text-base font-semibold">
              <SlidersHorizontal className="h-5 w-5 text-[#a43127]" />
              产品团期表
            </div>
            <div className="flex flex-col gap-2 text-base sm:flex-row sm:items-center">
              <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-[#d9dde2] bg-white px-4 text-base text-[#4b535c] transition hover:border-[#a43127] hover:text-[#a43127]">
                <Checkbox
                  checked={filters.showPastDepartures}
                  onChange={(event) => setFilters((current) => ({ ...current, showPastDepartures: event.target.checked }))}
                />
                展示历史团期
              </label>
              <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-[#d9dde2] bg-white px-4 text-base text-[#4b535c] transition hover:border-[#a43127] hover:text-[#a43127]">
                <Checkbox
                  checked={filters.showWaitShareOnly}
                  onChange={(event) => setFilters((current) => ({ ...current, showWaitShareOnly: event.target.checked }))}
                />
                仅显示待拼团
              </label>
            </div>
          </div>

          <div className="hidden max-h-[calc(100vh-260px)] min-h-[520px] overflow-auto lg:block">
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
                  <Th>待拼情况</Th>
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
          <MobileDepartureTable
            loading={loading}
            products={groupedProducts}
            onEdit={openRemarkEditor}
          />
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

type MobileDepartureTableRow = {
  key: string;
  product: GroupedProduct;
  departure: ThemeGroupDeparture;
};

function MobileDepartureTable({
  loading,
  products,
  onEdit,
}: {
  loading: boolean;
  products: GroupedProduct[];
  onEdit: (remark: EditableRemark) => void;
}) {
  const rows = products.flatMap((product) => product.departures.map((departure) => ({ key: departure.id, product, departure })));
  const columns: ColumnsType<MobileDepartureTableRow> = [
    {
      title: "产品",
      width: 260,
      fixed: "left",
      render: (_, row) => (
        <div className="min-w-[220px]">
          <div className="mb-1 flex flex-wrap gap-1">
            <Tag>{row.product.businessType}</Tag>
            {row.product.seriesDesc ? <Tag color="red">{row.product.seriesDesc}</Tag> : null}
          </div>
          <p className="mb-1 whitespace-normal text-sm font-semibold leading-5 text-[#15191d]">{row.product.name}</p>
          <p className="font-mono text-xs text-[#6d747c]">{row.product.productCode}</p>
        </div>
      ),
    },
    {
      title: "团单号",
      dataIndex: ["departure", "orderNo"],
      width: 170,
      render: (value: string) => <span className="font-mono">{value}</span>,
    },
    {
      title: "出发日期",
      width: 110,
      render: (_, row) => formatShortDate(row.departure.departureDate),
    },
    {
      title: "价格",
      width: 180,
      render: (_, row) => <PriceCell departure={row.departure} />,
    },
    {
      title: "余位",
      width: 90,
      render: (_, row) => row.departure.remainingGuests,
    },
    {
      title: "房间",
      width: 140,
      render: (_, row) => <RemainingRooms value={row.departure.remainingRooms} />,
    },
    {
      title: "待拼",
      width: 150,
      render: (_, row) => row.departure.roomingText ? <WaitShareInfo value={row.departure.roomingText} /> : "-",
    },
    {
      title: "顾问",
      width: 100,
      render: (_, row) => row.departure.consultant || "-",
    },
    {
      title: "状态",
      width: 120,
      render: (_, row) => (
        <div className="flex flex-col gap-1">
          <DepartureStatusBadge departure={row.departure} />
          <OrderStatusBadge departure={row.departure} />
        </div>
      ),
    },
    {
      title: "备注",
      width: 120,
      fixed: "right",
      render: (_, row) => (
        <Button
          type="link"
          onClick={() =>
            onEdit({
              objectType: "departure",
              objectId: row.departure.id,
              fieldName: "operationRemark",
              title: "编辑备注",
              currentValue: row.departure.operationRemark,
              context: `${row.product.name} / ${formatShortDate(row.departure.departureDate)} / ${row.departure.orderNo}`,
            })
          }
        >
          {row.departure.operationRemark ? "查看/编辑" : "添加"}
        </Button>
      ),
    },
  ];

  return (
    <div className="bg-white lg:hidden">
      <Table
        rowKey="key"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={false}
        scroll={{ x: 1450 }}
        locale={{ emptyText: "没有匹配的主题团" }}
        size="small"
      />
    </div>
  );
}

function HotelInventoryEntryCard() {
  return (
    <a
      href="/hotel-inventory"
      className="mb-4 flex flex-col gap-4 rounded-lg border border-[#d8dde3] bg-white px-4 py-4 text-[#1f2428] shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition hover:border-[#c9d0d8] hover:shadow-[0_12px_30px_rgba(15,23,42,0.1)] sm:mb-5 sm:flex-row sm:items-center sm:justify-between sm:px-5"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#fff8f6] text-[#a43127]">
          <Hotel className="h-5 w-5" />
        </span>
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-lg font-semibold leading-6 text-[#15191d]">查询酒店库存</h2>
            <p className="mt-1 text-sm text-[#7b838c]">进入独立页面后按入住日期、酒店、房型查询库存与价格</p>
          </div>
        </div>
      </div>
      <div className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#d9dde2] bg-white px-4 text-base text-[#4b535c] sm:w-auto">
        进入查询
        <ArrowRight className="h-4 w-4" />
      </div>
    </a>
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
    <Modal
      title={
        <div>
          <p className="text-xl font-semibold">{remark.title}</p>
          <p className="mt-1 text-base font-normal text-[#6d747c]">{remark.context}</p>
        </div>
      }
      open
      onCancel={onClose}
      footer={null}
      centered
      width={780}
    >
      <div className="grid gap-5 pt-3 md:grid-cols-[1fr_300px]">
        <div>
          <label className="text-base font-medium">{remarkFieldText[remark.fieldName]}</label>
          <Input.TextArea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            className="mt-2"
            placeholder="请输入备注"
            rows={8}
          />
          <div className="mt-3 flex justify-end gap-2">
            <Button htmlType="button" onClick={onClose}>
              取消
            </Button>
            <Button
              htmlType="button"
              type="primary"
              onClick={() => onSubmit(content.trim())}
              loading={saving}
              icon={saving ? undefined : <Save className="h-4 w-4" />}
            >
              保存
            </Button>
          </div>
        </div>
        <aside className="rounded-lg border border-[#e3e5e8] bg-[#fafafa] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="inline-flex items-center gap-2 text-base font-semibold">
              <History className="h-4 w-4 text-[#a43127]" />
              最近修改
            </h3>
            <Button type="link" size="small" onClick={onViewAll}>
              查看全部日志
            </Button>
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
    </Modal>
  );
}

function LogsDrawer({ logs, onClose }: { logs: ThemeGroupLog[]; onClose: () => void }) {
  return (
    <Drawer
      title={
        <div>
          <p className="text-lg font-semibold">备注修改日志</p>
          <p className="text-sm font-normal text-[#6d747c]">按修改时间倒序展示</p>
        </div>
      }
      open
      onClose={onClose}
      width={520}
    >
      <div className="space-y-3">
        {logs.length ? logs.map((log) => <LogItem key={log.id} log={log} />) : <p className="text-sm text-[#7b838c]">暂无日志</p>}
      </div>
    </Drawer>
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
    <Button
      htmlType="button"
      type="text"
      onClick={onClick}
      className="block min-h-8 w-full rounded-lg border border-transparent bg-transparent px-3 py-1.5 text-left text-base leading-5 text-[#1f2428] transition hover:border-[#a43127] hover:bg-[#fff8f6]"
    >
      {value ? <span className="line-clamp-3">{value}</span> : <span className="whitespace-nowrap text-[#a43127]">添加</span>}
    </Button>
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
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm text-[#6d747c]">{label}</span>
      <Select
        mode="multiple"
        value={values}
        options={options.map((option) => ({ label: option, value: option }))}
        onChange={onChange}
        placeholder={options.length ? "全部" : "暂无选项"}
        maxTagCount="responsive"
        size="large"
        allowClear
        className="w-full"
      />
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
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm text-[#6d747c]">{label}</span>
      <Select
        mode="multiple"
        value={values}
        options={options.map((option) => ({ label: option, value: option }))}
        onChange={onChange}
        placeholder={options.length ? "全部" : "暂无选项"}
        maxTagCount="responsive"
        size="large"
        allowClear
        className="w-full"
      />
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
          const [departureStartDate, departureEndDate] = filters.departureDateRange;
          const dateMatches =
            (!departureStartDate || departure.departureDate >= departureStartDate) &&
            (!departureEndDate || departure.departureDate <= departureEndDate);
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
