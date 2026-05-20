import { auth } from "../auth";

export default function AuthLogoutButton() {
  return (
    <button
      type="button"
      onClick={() => {
        auth.logout();
        window.location.reload();
      }}
      className="h-10 rounded-lg border-none bg-[#ff4d4f] px-4 text-sm font-medium text-white transition hover:bg-[#d9363e]"
    >
      退出登录
    </button>
  );
}
