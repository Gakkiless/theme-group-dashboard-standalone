# 松赞在售主题团看板

这是从原 `songtsam-crm-copilot-demo` 中拆出来的独立主题团看板项目，只保留主题团销售看板相关代码。

## 目录

```text
.
├── server.mjs                 # BFF：聚合测试环境主题团接口
├── cloud-functions/           # EdgeOne Pages Functions：线上 API + KV 备注存储
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

## EdgeOne 部署

这个项目线上不能只部署静态 `dist/`，因为页面会请求同域 API：

```text
/api/theme-groups/dashboard
/api/theme-groups/remarks/update
/api/theme-groups/remarks/logs
```

已提供 EdgeOne Pages Functions：

```text
cloud-functions/api/[[default]].js
```

部署到 EdgeOne 时需要：

1. 连接 GitHub 仓库并按 Vite 项目构建：

```bash
npm install
npm run build
```

构建产物目录：

```text
dist
```

2. 在 EdgeOne 绑定 KV 存储，变量名使用任意一个即可：

```text
theme_group_kv
THEME_GROUP_KV
my_kv
```

推荐使用：

```text
theme_group_kv
```

3. 如需替换看板数据源，在 EdgeOne 环境变量里配置：

```text
SONGTSAM_THEME_GROUP_DASHBOARD_URL=...
```

默认数据源：

```text
https://test-gds.songtsam.com/product-journey/api/travelGroup/listTravelGroupDashboard
```

## 备注功能状态

本地开发时备注写入 `data/theme-group-remarks.json`。

EdgeOne 部署时备注和日志写入绑定的 KV，存储 key 为：

```text
theme_group_remarks
```
