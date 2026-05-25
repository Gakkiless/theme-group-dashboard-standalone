import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import HotelInventoryPage from "./hotel-inventory/HotelInventoryPage";
import ThemeGroupDashboard from "./theme-groups/ThemeGroupDashboard";

export default function App() {
  const page = window.location.pathname === "/hotel-inventory" ? <HotelInventoryPage /> : <ThemeGroupDashboard />;

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: "#a43127",
          borderRadius: 8,
          fontFamily: '"HarmonyOS Sans", "Source Han Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
        },
        components: {
          Button: {
            controlHeight: 40,
            borderRadius: 8,
          },
          Input: {
            controlHeight: 44,
            borderRadius: 8,
          },
          Select: {
            controlHeight: 44,
            borderRadius: 8,
          },
        },
      }}
    >
      {page}
    </ConfigProvider>
  );
}
