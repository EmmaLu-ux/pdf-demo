# pdf-demo Monorepo

该仓库已改造成基于 pnpm workspace 的 monorepo，所有具体业务应用位于 `packages` 目录下。

## 目录结构

- `package.json`：工作区聚合脚本，统一调度各 package
- `pnpm-workspace.yaml`：Workspace 配置
- `packages/web`：原有的 Vue 3 + Vite 应用（现命名为 `pdf-demo-web`）

## 常用命令

在仓库根目录执行以下命令即可操作对应的子包：

```bash
pnpm install          # 安装所有 workspace 依赖
pnpm dev              # 启动 packages/web 开发服务器
pnpm build            # 构建 packages/web
pnpm lint             # 运行 packages/web 的 ESLint
pnpm format           # 执行 packages/web 的 Prettier
```

需要在子包中添加更多脚本时，请直接在其 `package.json` 中维护，然后通过根目录脚本或 `pnpm --filter <package>` 调用。
