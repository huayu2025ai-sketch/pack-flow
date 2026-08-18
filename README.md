# PackFlow

PackFlow 是一个轻量的打包清单与运输状态追踪工具，适合出差、旅行、搬家和寄送物品等场景。项目使用原生 HTML、CSS 和 JavaScript 构建，无需后端数据库。

## 功能

- 创建、编辑、删除和拖动排序分组
- 添加、编辑、删除和拖动排序物品
- 标记物品完成状态并查看分组进度
- 设置分组为待准备、运输中或已收到
- 按分类、分组状态和关键词筛选物品
- 为不同物品分类显示不同颜色标签
- 单独展开或收起分组物品列表
- 一键展开或收起当前视图中的全部分组
- 导入和导出 JSON 备份
- 日间与深夜模式
- 针对手机端优化的响应式布局

## 数据与隐私

所有清单数据仅保存在当前浏览器的 `localStorage` 中，不会上传到服务器。

这意味着：

- 不同浏览器、设备或浏览器用户之间不会自动同步数据。
- 清除浏览器网站数据后，清单可能无法恢复。
- 更换设备或浏览器前，建议使用页面中的“导出”功能保存 JSON 备份。
- 导入备份会覆盖当前清单，页面会在执行前要求确认。

## 本地运行

需要 Python 3。

```bash
./run.sh start
```

默认访问地址：<http://127.0.0.1:8080>

常用命令：

```bash
./run.sh status
./run.sh restart
./run.sh stop
```

指定端口：

```bash
PACKFLOW_PORT=9000 ./run.sh start
```

也可以直接启动静态文件服务：

```bash
python3 -m http.server 8080 --bind 127.0.0.1
```

## Docker 部署

项目提供了 `Dockerfile` 和 `docker-compose.yml`。

```bash
docker compose up -d --build
```

Compose 配置会将服务加入外部 Docker 网络 `npm-network`，适合配合 Nginx Proxy Manager 使用。首次部署前请确保该网络已经存在：

```bash
docker network create npm-network
```

容器内部通过 Nginx 在 80 端口提供静态页面，并包含健康检查。

## 项目结构

```text
.
├── index.html          # 页面结构
├── styles.css          # 主题与响应式样式
├── app.js              # 清单数据和交互逻辑
├── run.sh              # 本地服务管理脚本
├── Dockerfile          # Nginx 容器镜像
└── docker-compose.yml  # Docker Compose 部署配置
```

## 技术栈

- 原生 HTML、CSS、JavaScript
- 浏览器 Local Storage
- Nginx
- Docker Compose

