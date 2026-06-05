# B站同事吧盖楼自动抢楼工具

自动扫描 B 站同事吧新发布的盖楼帖子，并在接近目标楼层时自动发送评论。

## 功能特性

- 定时扫描新发布的帖子（每 5 分钟）
- 自动识别标题包含"盖楼"的帖子
- 解析帖子内容中的目标楼层
- 监控评论楼层，接近目标时自动抢楼
- 提供 Web 监控面板实时查看状态

## 环境要求

- Node.js >= 18
- pnpm（推荐）或 npm

## 安装

```bash
# 克隆项目
git clone <your-repo-url>
cd nestjs-project

# 安装依赖
pnpm install
```

## 配置

### 1. 创建本地配置文件

在项目根目录创建 `config.local.ts`：

```typescript
export const config = {
  // 从浏览器复制的 Cookie 字符串
  cookie: 'your_cookie_here',
  // 扫描间隔（分钟），默认 5
  scanInterval: 5,
};
```

### 2. 获取 Cookie

1. 打开 Chrome 浏览器，访问 https://bbplanet.bilibili.co/pc/
2. 登录你的账号
3. 按 `F12` 打开开发者工具
4. 切换到 **Network** 面板，随便点击一个请求
5. 在 **Headers** 中找到 `Cookie` 字段，复制完整内容
6. 粘贴到 `config.local.ts` 的 `cookie` 字段

或者在 **Console** 中执行 `document.cookie` 获取。

### 3. 重要 Cookie 字段

以下 Cookie 字段是必需的：

| 字段 | 说明 |
|------|------|
| `_AJSESSIONID` | 会话 ID，用于身份验证 |
| `billions_jwt` | JWT Token，包含过期时间 |
| `uid` | 用户 ID |
| `username` | 用户名 |

**注意**：`billions_jwt` 通常 24 小时过期，过期后需要重新获取。

## 运行

```bash
# 开发模式（代码修改自动重启）
pnpm run start:dev

# 生产模式
pnpm run build
pnpm run start:prod
```

## 访问监控面板

启动后访问：http://localhost:3000/monitor

监控面板功能：
- 实时显示监控中的帖子
- 显示当前楼层和目标楼层
- 区分已抢/待抢/已过期的楼层
- 自动刷新（3 秒）

## 常见问题

### dashboard验证失败

Cookie 已过期，需要重新从浏览器获取。

### 端口被占用

```bash
# 查看占用端口的进程
lsof -i :3000

# 杀掉进程
kill -9 <PID>

# 简洁写法
kill -9 $(lsof -ti:3000)
```

## 项目结构

```
nestjs-project/
├── src/
│   ├── app.module.ts          # 模块配置
│   ├── app.controller.ts      # 控制器（监控 API）
│   ├── app.service.ts         # 服务（API 请求）
│   └── tasks/
│       └── article-scanner.ts # 定时扫描任务
├── public/
│   └── monitor.html           # 监控面板页面
├── config.local.ts            # 本地配置（不提交 Git）
├── .gitignore
├── package.json
└── README.md
```

## 技术栈

- NestJS
- TypeScript
- @nestjs/schedule（定时任务）
- Axios（HTTP 请求）

## 免责声明

本工具仅供学习交流使用，请遵守 B 站相关规定。
