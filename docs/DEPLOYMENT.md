# AI Doctor 部署指南

本文档详细说明如何在本地开发环境和生产环境中部署AI Doctor系统。

---

## 本地开发环境

### 系统要求

- **操作系统**: Windows 10+, macOS 10.15+, Linux (Ubuntu 20.04+)
- **Node.js**: v18.0.0 或更高版本
- **Python**: v3.9.0 或更高版本
- **Docker**: v20.10.0 或更高版本
- **内存**: 至少 8GB RAM
- **硬盘**: 至少 10GB 可用空间

### 依赖服务

#### 1. Qdrant 向量数据库

**方式一：使用 Docker (推荐)**

```bash
# 拉取镜像
docker pull qdrant/qdrant

# 运行容器
docker run -d \
  --name qdrant \
  -p 6333:6333 \
  -p 6334:6334 \
  -v $(pwd)/qdrant_storage:/qdrant/storage:z \
  qdrant/qdrant
```

**方式二：使用 Docker Compose**

创建 `docker-compose.yml`:

```yaml
version: '3.8'

services:
  qdrant:
    image: qdrant/qdrant:latest
    container_name: qdrant
    ports:
      - "6333:6333"  # HTTP API
      - "6334:6334"  # gRPC
    volumes:
      - ./qdrant_storage:/qdrant/storage
    environment:
      - QDRANT__SERVICE__HTTP_PORT=6333
      - QDRANT__SERVICE__GRPC_PORT=6334
    restart: unless-stopped
```

启动服务：
```bash
docker-compose up -d
```

验证服务：
```bash
# 检查健康状态
curl http://localhost:6333/health

# 查看集合列表
curl http://localhost:6333/collections
```

**方式三：本地安装 (不推荐)**

```bash
# macOS
brew install qdrant

# Linux (需要手动编译)
git clone https://github.com/qdrant/qdrant.git
cd qdrant
cargo build --release
./target/release/qdrant
```

---

### 后端部署

#### 1. 克隆项目

```bash
git clone <repository-url>
cd ai_doctor
```

#### 2. 创建 Python 虚拟环境

```bash
cd backend

# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

#### 3. 安装依赖

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

**requirements.txt 清单**:
```txt
# Web框架
Flask==3.0.0
Flask-CORS==4.0.0

# LangChain生态
langchain==0.1.0
langchain-openai==0.0.2
langchain-community==0.0.10

# 向量数据库
qdrant-client==1.7.0

# 文档解析
PyPDF2==3.0.1
python-docx==1.1.0
python-pptx==0.6.23
markdown==3.5.1

# NLP工具
jieba==0.42.1
spacy==3.7.2
scikit-learn==1.3.2

# AI模型
openai==1.6.1
zhipuai==2.0.1

# 数据处理
numpy==1.24.3
pandas==2.0.3

# 工具库
python-dotenv==1.0.0
requests==2.31.0
tqdm==4.66.1
```

#### 4. 下载 NLP 模型 (可选)

如果使用 spaCy 进行中文NLP：

```bash
# 下载中文模型
python -m spacy download zh_core_web_sm

# 或下载更大的模型（更准确但更慢）
python -m spacy download zh_core_web_md
```

#### 5. 配置环境变量

```bash
# 复制示例配置
cp .env.example .env

# 编辑配置文件
# Windows: notepad .env
# macOS/Linux: nano .env
```

**完整 .env 配置**:

```env
# ============================================
# Flask 应用配置
# ============================================
FLASK_APP=app.py
FLASK_ENV=development
FLASK_DEBUG=True
FLASK_RUN_HOST=0.0.0.0
FLASK_RUN_PORT=5000

# ============================================
# LLM 配置 (二选一或都配置)
# ============================================

# OpenAI 配置
OPENAI_API_KEY=sk-xxx
OPENAI_API_BASE=https://api.openai.com/v1
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# 智谱AI 配置
ZHIPUAI_API_KEY=xxx
ZHIPUAI_MODEL=glm-4

# ============================================
# Qdrant 向量数据库配置
# ============================================
QDRANT_HOST=localhost
QDRANT_PORT=6333
QDRANT_GRPC_PORT=6334
QDRANT_API_KEY=
QDRANT_COLLECTION_PREFIX=ai_doctor
QDRANT_VECTOR_SIZE=768

# ============================================
# 文档处理配置
# ============================================
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_EXTENSIONS=txt,pdf,docx,md
CHUNK_SIZE=500
CHUNK_OVERLAP=50
UPLOAD_FOLDER=./uploads

# ============================================
# 检索配置
# ============================================
DEFAULT_TOP_K=5
DEFAULT_SEARCH_MODE=hybrid
DEFAULT_ALPHA=0.7

# ============================================
# NLP 配置
# ============================================
SPACY_MODEL=zh_core_web_sm
USE_JIEBA=True

# ============================================
# 日志配置
# ============================================
LOG_LEVEL=INFO
LOG_FILE=./logs/app.log
```

#### 6. 初始化数据库

```bash
# 创建必要的目录
mkdir -p uploads
mkdir -p logs
mkdir -p qdrant_storage

# 运行初始化脚本 (如果有)
python init_db.py
```

#### 7. 启动后端服务

```bash
# 开发模式
python app.py

# 或使用 Flask CLI
flask run

# 生产模式 (使用 Gunicorn)
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

服务将运行在 `http://localhost:5000`

#### 8. 验证后端

```bash
# 健康检查
curl http://localhost:5000/api/health

# 查看知识库列表
curl http://localhost:5000/api/knowledge-bases

# 预期响应
# {"success": true, "data": [], "total": 0}
```

---

### 前端部署

#### 1. 安装依赖

```bash
# 返回项目根目录
cd ..

# 安装 Node.js 依赖
npm install
```

**主要依赖**:
```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.20.0",
    "antd": "^5.12.0",
    "axios": "^1.6.2",
    "@ant-design/icons": "^5.2.6"
  },
  "devDependencies": {
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "~5.6.2",
    "vite": "^6.0.11",
    "eslint": "^9.18.0"
  }
}
```

#### 2. 配置环境变量

创建 `.env.local`:

```env
# API 基础地址
VITE_API_BASE_URL=http://localhost:5000/api

# 应用配置
VITE_APP_TITLE=AI Doctor
VITE_APP_VERSION=1.0.0
```

#### 3. 启动开发服务器

```bash
npm run dev
```

前端服务将运行在 `http://localhost:5173`

#### 4. 构建生产版本

```bash
npm run build
```

构建产物将输出到 `dist/` 目录。

---

## 生产环境部署

### 架构建议

```
                    ┌─────────────┐
                    │   Nginx     │  反向代理 + 静态资源
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
    ┌─────▼─────┐    ┌─────▼─────┐   ┌─────▼─────┐
    │  前端静态  │    │  Backend  │   │  Backend  │
    │   资源    │    │  Instance │   │  Instance │
    └───────────┘    └─────┬─────┘   └─────┬─────┘
                           │                │
                     ┌─────▼────────────────▼─────┐
                     │      Qdrant Cluster        │
                     └────────────────────────────┘
```

### 1. 使用 Docker 部署

#### Dockerfile (后端)

创建 `backend/Dockerfile`:

```dockerfile
FROM python:3.9-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt .

# 安装 Python 依赖
RUN pip install --no-cache-dir -r requirements.txt

# 下载 spaCy 模型
RUN python -m spacy download zh_core_web_sm

# 复制应用代码
COPY . .

# 创建必要的目录
RUN mkdir -p uploads logs

# 暴露端口
EXPOSE 5000

# 启动命令
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "--timeout", "120", "app:app"]
```

#### Dockerfile (前端)

创建 `Dockerfile`:

```dockerfile
# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

# 复制依赖文件
COPY package*.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 生产阶段
FROM nginx:alpine

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### Docker Compose (完整部署)

创建 `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  # Qdrant 向量数据库
  qdrant:
    image: qdrant/qdrant:latest
    container_name: qdrant_prod
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant_data:/qdrant/storage
    environment:
      - QDRANT__SERVICE__HTTP_PORT=6333
      - QDRANT__SERVICE__GRPC_PORT=6334
    restart: unless-stopped
    networks:
      - ai_doctor_network

  # 后端服务
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: backend_prod
    ports:
      - "5000:5000"
    environment:
      - FLASK_ENV=production
      - QDRANT_HOST=qdrant
      - QDRANT_PORT=6333
    env_file:
      - ./backend/.env
    volumes:
      - ./backend/uploads:/app/uploads
      - ./backend/logs:/app/logs
    depends_on:
      - qdrant
    restart: unless-stopped
    networks:
      - ai_doctor_network

  # 前端服务
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: frontend_prod
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped
    networks:
      - ai_doctor_network

volumes:
  qdrant_data:

networks:
  ai_doctor_network:
    driver: bridge
```

#### 启动生产环境

```bash
# 构建并启动所有服务
docker-compose -f docker-compose.prod.yml up -d

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f

# 停止服务
docker-compose -f docker-compose.prod.yml down
```

### 2. Nginx 配置

创建 `nginx.conf`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # 前端静态资源
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 代理
    location /api/ {
        proxy_pass http://backend:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 超时设置
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;
    }

    # 文件上传大小限制
    client_max_body_size 20M;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;
}
```

### 3. HTTPS 配置 (使用 Let's Encrypt)

```bash
# 安装 Certbot
apt-get install certbot python3-certbot-nginx

# 获取证书
certbot --nginx -d yourdomain.com

# 自动续期
certbot renew --dry-run
```

更新 nginx.conf 添加 HTTPS:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # ... 其他配置同上
}

# HTTP 重定向到 HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## 性能优化

### 后端优化

1. **使用 Gunicorn 多进程**:
```bash
gunicorn -w 4 -k gevent --worker-connections 1000 -b 0.0.0.0:5000 app:app
```

2. **启用缓存**:
```python
# 使用 Redis 缓存检索结果
from flask_caching import Cache

cache = Cache(app, config={
    'CACHE_TYPE': 'redis',
    'CACHE_REDIS_URL': 'redis://localhost:6379/0'
})
```

3. **异步处理文档**:
```python
# 使用 Celery 处理耗时任务
from celery import Celery

celery = Celery(app.name, broker='redis://localhost:6379/0')
celery.conf.update(app.config)

@celery.task
def process_document(doc_id):
    # 异步处理文档
    pass
```

### 前端优化

1. **代码分割**:
```typescript
// 使用 React.lazy 进行路由懒加载
const KBManage = lazy(() => import('./pages/KBManage'));
```

2. **资源压缩**:
```javascript
// vite.config.ts
export default {
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
  },
};
```

### Qdrant 优化

1. **集群部署** (高可用):
```yaml
# 3节点集群配置
services:
  qdrant-node1:
    image: qdrant/qdrant
    environment:
      - QDRANT__CLUSTER__ENABLED=true
      - QDRANT__CLUSTER__NODE_ID=1
    
  qdrant-node2:
    image: qdrant/qdrant
    environment:
      - QDRANT__CLUSTER__ENABLED=true
      - QDRANT__CLUSTER__NODE_ID=2
    
  qdrant-node3:
    image: qdrant/qdrant
    environment:
      - QDRANT__CLUSTER__ENABLED=true
      - QDRANT__CLUSTER__NODE_ID=3
```

2. **索引优化**:
```python
# 使用 HNSW 索引提升检索速度
client.create_collection(
    collection_name="kb_collection",
    vectors_config=VectorParams(
        size=768,
        distance=Distance.COSINE,
        hnsw_config=HnswConfigDiff(
            m=16,  # 连接数
            ef_construct=100,  # 构建时的邻居数
        )
    )
)
```

---

## 监控与日志

### 应用监控

使用 Prometheus + Grafana:

```yaml
# docker-compose.monitoring.yml
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

### 日志收集

使用 ELK Stack (Elasticsearch + Logstash + Kibana):

```yaml
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.10.0
    environment:
      - discovery.type=single-node
    ports:
      - "9200:9200"

  logstash:
    image: docker.elastic.co/logstash/logstash:8.10.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf

  kibana:
    image: docker.elastic.co/kibana/kibana:8.10.0
    ports:
      - "5601:5601"
```

---

## 备份与恢复

### Qdrant 数据备份

```bash
# 创建快照
curl -X POST 'http://localhost:6333/collections/{collection_name}/snapshots'

# 下载快照
curl -o backup.snapshot 'http://localhost:6333/collections/{collection_name}/snapshots/{snapshot_name}'

# 恢复快照
curl -X PUT 'http://localhost:6333/collections/{collection_name}/snapshots/upload' \
  --data-binary @backup.snapshot
```

### 应用数据备份

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/$DATE"

mkdir -p $BACKUP_DIR

# 备份上传的文档
cp -r ./backend/uploads $BACKUP_DIR/

# 备份Qdrant数据
docker exec qdrant tar czf /tmp/qdrant_backup.tar.gz /qdrant/storage
docker cp qdrant:/tmp/qdrant_backup.tar.gz $BACKUP_DIR/

# 备份配置文件
cp ./backend/.env $BACKUP_DIR/

echo "Backup completed: $BACKUP_DIR"
```

---

## 故障排查

### 常见问题

1. **Qdrant 连接失败**
```bash
# 检查容器状态
docker ps | grep qdrant

# 查看日志
docker logs qdrant

# 测试连接
curl http://localhost:6333/health
```

2. **后端服务无响应**
```bash
# 检查进程
ps aux | grep python

# 查看日志
tail -f backend/logs/app.log

# 重启服务
systemctl restart ai-doctor-backend
```

3. **内存不足**
```bash
# 查看内存使用
free -h

# 清理Docker缓存
docker system prune -a
```

---

## 安全建议

1. **环境变量保护**: 不要将 `.env` 文件提交到版本控制
2. **API Key 管理**: 使用密钥管理服务（如 AWS Secrets Manager）
3. **防火墙配置**: 仅开放必要端口
4. **定期更新**: 及时更新依赖包和系统补丁
5. **访问控制**: 实施 JWT 认证和 RBAC 权限控制

---

## 扩展阅读

- [Qdrant 官方文档](https://qdrant.tech/documentation/)
- [Flask 部署指南](https://flask.palletsprojects.com/en/3.0.x/deploying/)
- [Docker 最佳实践](https://docs.docker.com/develop/dev-best-practices/)
- [Nginx 性能调优](https://www.nginx.com/blog/tuning-nginx/)
