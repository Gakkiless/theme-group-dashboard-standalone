# 松赞在售主题团看板

这是从原 `songtsam-crm-copilot-demo` 中拆出来的独立主题团看板项目，只保留主题团销售看板相关代码。

## 目录

```text
.
├── server.mjs                 # BFF：聚合测试环境主题团接口
├── src/
│   ├── App.tsx                # 直接渲染主题团看板
│   ├── main.tsx
│   ├── styles.css
│   └── theme-groups/
│       ├── ThemeGroupDashboard.tsx
│       ├── api.ts
│       └── types.ts
├── index.html
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

## 本地运行

安装依赖：

```bash
npm install
```

启动 BFF：

```bash
npm run server
```

启动前端：

```bash
npm run dev -- --port 5173
```

打开：

```text
http://127.0.0.1:5173/theme-groups/dashboard
```

## 接口配置

默认使用测试环境接口：

```text
https://test-gds.songtsam.com/product-journey/api/travelGroup/listTravelGroupDashboard
```

如需替换，复制 `.env.example` 为 `.env`，修改：

```text
SONGTSAM_THEME_GROUP_DASHBOARD_URL=...
```

## 服务器部署

这个项目不是纯静态站，页面会请求同域 API：

```text
/api/theme-groups/dashboard
/api/theme-groups/remarks/update
/api/theme-groups/remarks/logs
```

部署到公司服务器时建议：

```bash
npm install
npm run build
npm run server
```

`server.mjs` 会同时提供 API 和 `dist/` 静态文件访问。可用 Nginx 或网关反代到：

```text
http://127.0.0.1:3000
```

如需替换看板数据源，在服务器环境变量或 `.env` 里配置：

```text
SONGTSAM_THEME_GROUP_DASHBOARD_URL=...
```

默认数据源：

```text
https://test-gds.songtsam.com/product-journey/api/travelGroup/listTravelGroupDashboard
```

## 备注功能状态

备注和日志写入本地 JSON 文件：

```text
data/theme-group-remarks.json
```

生产部署时请确保运行 `npm run server` 的进程对 `data/` 目录有写入权限。
