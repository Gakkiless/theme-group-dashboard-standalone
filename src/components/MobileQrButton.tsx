import { useMemo, useState } from "react";
import { Button, Modal, QRCode } from "antd";
import { QrCode } from "lucide-react";

function buildMobileUrl(baseUrl: string) {
  const base = baseUrl.replace(/\/+$/, "");
  return `${base}${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function isLocalUrl(value: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(value);
}

function getMobileBaseUrl() {
  return import.meta.env.VITE_MOBILE_BASE_URL || window.location.origin;
}

export default function MobileQrButton() {
  const [open, setOpen] = useState(false);
  const mobileUrl = useMemo(() => buildMobileUrl(getMobileBaseUrl()), []);

  return (
    <>
      <Button
        htmlType="button"
        onClick={() => setOpen(true)}
        icon={<QrCode className="h-4 w-4" />}
      >
        手机扫码
      </Button>

      <Modal title="扫码打开移动端" open={open} onCancel={() => setOpen(false)} footer={null} centered width={380}>
        <div className="flex flex-col items-center gap-4 pt-2">
          <QRCode value={mobileUrl} size={240} bordered />
          <p className="break-all rounded-lg bg-[#f5f7fb] px-3 py-2 text-center text-xs leading-5 text-[#4b535c]">{mobileUrl}</p>
          {isLocalUrl(mobileUrl) ? (
            <p className="text-center text-xs leading-5 text-[#a43127]">当前是本机地址，手机扫码可能无法访问。请在 `.env` 配置 `VITE_MOBILE_BASE_URL` 为局域网地址后重启前端服务。</p>
          ) : (
            <p className="text-center text-xs leading-5 text-[#7b838c]">请确认手机和电脑在同一网络或 VPN 环境。</p>
          )}
        </div>
      </Modal>
    </>
  );
}
