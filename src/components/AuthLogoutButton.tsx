import { Button } from "antd";
import { auth } from "../auth";

export default function AuthLogoutButton() {
  return (
    <Button
      htmlType="button"
      onClick={() => {
        auth.logout();
        window.location.reload();
      }}
      danger
      type="primary"
    >
      退出登录
    </Button>
  );
}
