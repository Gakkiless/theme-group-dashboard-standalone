import { useEffect, useMemo, useState } from "react";
import { QrCode, X } from "lucide-react";
import QRCode from "qrcode";

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
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    if (!open) return;
    setQrDataUrl("");
    QRCode.toDataURL(mobileUrl, {
      width: 240,
      margin: 2,
      color: {
        dark: "#1f2428",
        light: "#ffffff",
      },
    }).then(setQrDataUrl);
  }, [mobileUrl, open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#d9dde2] bg-white px-3 text-sm font-medium text-[#4b535c] transition hover:border-[#a43127] hover:text-[#a43127]"
      >
        <QrCode className="h-4 w-4" />
        手机扫码
      </button>

      {open ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/35 px-4">
          <section className="w-full max-w-[360px] rounded-xl bg-white shadow-[0_16px_48px_rgba(15,23,42,0.22)]">
            <header className="flex items-center justify-between border-b border-[#edf0f3] px-5 py-4">
              <h2 className="text-lg font-semibold text-[#15191d]">扫码打开移动端</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-[#6d747c] hover:text-[#a43127]">
                <X className="h-5 w-5" />
              </button>
            </header>
            <div className="flex flex-col items-center gap-4 px-5 py-6">
              <div className="flex h-[260px] w-[260px] items-center justify-center rounded-lg border border-[#e3e5e8] bg-white">
                {qrDataUrl ? <img src={qrDataUrl} alt="移动端访问二维码" className="h-60 w-60" /> : <span className="text-sm text-[#7b838c]">生成中</span>}
              </div>
              <p className="break-all rounded-lg bg-[#f5f7fb] px-3 py-2 text-center text-xs leading-5 text-[#4b535c]">{mobileUrl}</p>
              {isLocalUrl(mobileUrl) ? (
                <p className="text-center text-xs leading-5 text-[#a43127]">当前是本机地址，手机扫码可能无法访问。请在 `.env` 配置 `VITE_MOBILE_BASE_URL` 为局域网地址后重启前端服务。</p>
              ) : (
                <p className="text-center text-xs leading-5 text-[#7b838c]">请确认手机和电脑在同一网络或 VPN 环境。</p>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
