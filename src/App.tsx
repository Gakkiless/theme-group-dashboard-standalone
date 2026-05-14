import HotelInventoryPage from "./hotel-inventory/HotelInventoryPage";
import ThemeGroupDashboard from "./theme-groups/ThemeGroupDashboard";

export default function App() {
  if (window.location.pathname === "/hotel-inventory") {
    return <HotelInventoryPage />;
  }

  return <ThemeGroupDashboard />;
}
