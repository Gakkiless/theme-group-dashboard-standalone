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

## 备注功能状态

当前备注仍是前端内存 demo 逻辑，刷新后会丢。要变成持久化，建议下一步在 `server.mjs` 里加 JSON 文件存储或正式数据库接口，再替换 `src/theme-groups/api.ts` 里的 `updateThemeGroupRemark` 和 `fetchThemeGroupRemarkLogs`。
