# 使用 Node.js 基础镜像
FROM node:18-alpine

# 设置容器中的工作目录
WORKDIR /app

# 复制 package.json 和 pnpm-lock.yaml 到工作目录
COPY package.json pnpm-lock.yaml ./

# 使用 pnpm 安装依赖
RUN npm install -g pnpm && pnpm install --prod

# 复制应用程序代码
COPY . .

# 构建 NestJS 应用
RUN pnpm run build

# 暴露应用运行的端口
EXPOSE 3000

# 定义运行应用的命令
CMD ["node", "dist/main.js"]