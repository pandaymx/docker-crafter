# docker-crafter
🐳 Docker 工作区管理面板

![CI Status](https://github.com/your-org/docker-crafter/actions/workflows/ci.yml/badge.svg)
![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Go Version](https://img.shields.io/github/go-mod/go-version/your-org/docker-crafter)
![Docker Image Size (tag)](https://img.shields.io/docker/image-size/your-org/docker-crafter/latest)

## 📌 项目简介 (Introduction)
`docker-crafter` 是一个轻量级的跨平台 Docker 工作区管理面板，旨在通过直观的界面统一管理本地及远程的多引擎 Docker 容器，解决多项目混杂导致的容器管理难题。

## 🏗️ 架构 (Architecture)
- **后端**：使用 Go + Gin 框架构建，提供高性能、标准化的 RESTful JSON API 和 WebSocket 实时通讯。
- **前端**：使用 React + Vite 构建，支持动态环境感知的 UI 架构。
- **交付方式**：单二进制文件运行，前端 `dist` 静态资源被静态内嵌于二进制中。
- **连接能力**：支持多引擎 Docker 客户端连接，可通过挂载 Socket (`/var/run/docker.sock`) 原生操作。

## ✨ 核心功能 (Features)
- **工作区聚合 (Workspace Aggregation)**：自动基于 `com.docker.compose.project` 标签识别 Compose 项目与 Standalone 独立容器分组。
- **实时监控 (Real-time Monitoring)**：容器 CPU、内存占用的实时图表与数据推送。
- **容器控制 (Container Control)**：支持单个与批量处理容器的启、停、重启、查看日志及交互式终端连接。
- **检索过滤 (Search & Filter)**：快速基于名称、状态筛选，支持多维度排序。
- **国际化 (i18n)**：中英双语支持。

## ⚙️ 环境变量表 (Environment Variables)

| 变量名 | 默认值 | 描述 |
| :--- | :--- | :--- |
| `CRAFTER_PORT` | `8080` | 后端 API 及页面监听端口 |
| `CRAFTER_DB_PATH` | `./data/crafter.db` | 本地 SQLite 数据库存储路径 |
| `CORS_ALLOW_ORIGIN` | *空 (禁用)* | 允许跨域的 Origin 列表 (逗号分隔)，用于分离部署 |

## 🚀 本地运行 (Local Development)

启动整个项目 (后端将伺服编译好的前端静态文件)：
```bash
make build
make run
```

如需进行前端独立开发 (代理 `/api` 到后端)：
```bash
make run-backend
# 新终端执行
make run-frontend
```

## 🐳 Docker 部署 (Docker Deployment)

基于提供的 `Dockerfile`，你可以构建并启动：

```bash
docker build -t docker-crafter .

docker run -d \
  --name docker-crafter \
  -p 8080:8080 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v ./data:/app/data \
  docker-crafter
```
*(注：挂载 `/var/run/docker.sock` 以及确保宿主权限正确，是应用连接 Docker 的前提条件。)*

## ⚠️ 安全警告 / Security Warning
> ⚠️ **警告**：本应用挂载宿主机 Docker Socket (`/var/run/docker.sock`)，等同于拥有宿主的 **root 权限**。
>
> 严禁在生产环境将前端面板直接暴露在公网！
>
> 如果必须进行公网访问，务必在反向代理层（如 Nginx, Traefik）配置严格的认证（如 Basic Auth 或 OAuth）以及相应的网络隔离策略。

## 📚 相关文档 / Related
- [API 契约 (API Contract)](docs/api-contract.md)
