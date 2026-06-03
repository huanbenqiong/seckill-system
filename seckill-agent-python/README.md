# 秒杀系统 AI 商家助手 (seckill-agent-python)

基于 Python LangChain + DeepSeek 大模型的商家端智能助手，为商家提供自然语言数据分析和自动补货能力。

## 目录结构

```
seckill-agent-python/
├── config.py              # 配置文件（API地址、模型参数、Token）
├── main.py                # FastAPI 入口，运行此文件启动服务
├── agent/
│   ├── __init__.py
│   └── agent.py           # LangChain Agent 核心逻辑
├── tools/
│   ├── __init__.py
│   ├── stock_tools.py     # 库存相关工具（查询、追加、批量补货）
│   └── data_tools.py      # 数据查询工具（大盘、商品统计、销售排行）
├── requirements.txt
└── README.md
```

## 快速启动

### 1. 安装依赖

```bash
cd seckill-agent-python
pip install -r requirements.txt
```

### 2. 配置

编辑 `config.py`，填写以下配置：

```python
# DeepSeek API Key（必填）
OPENAI_API_KEY = "your-deepseek-api-key-here"

# Java 后端地址（seckill-admin-agent 服务端口）
JAVA_BASE_URL = "http://localhost:8090"

# Agent Token（需与 Java 后端 application.yml 中配置一致）
AGENT_TOKEN = "seckill-agent-secret-key-2026"
```

### 3. 启动 Python Agent 服务

```bash
python main.py
```

服务将在 `http://localhost:8081` 启动。

### 4. 启动 Java Admin Agent 服务

在 `seckill-system` 目录下：

```bash
cd seckill-system
mvn clean install -DskipTests
cd seckill-admin-agent
mvn spring-boot:run
```

服务将在 `http://localhost:8090` 启动。

## 接口说明

### POST /chat

商家端前端调用此接口与 AI 助手对话。

**请求示例：**

```json
{
  "message": "帮我把库存低于10的商品补到50",
  "chat_history": []
}
```

**响应示例：**

```json
{
  "code": 200,
  "message": "success",
  "data": "已为您完成批量补货操作，共处理 3 件商品：\n- 商品ID=1，从 8 补至 50（追加 42 件）\n- 商品ID=3，从 5 补至 50（追加 45 件）\n- 商品ID=7，当前库存 20，无需补货"
}
```

## 支持的商家对话示例

### 场景一：智能补库

| 商家输入 | Agent 行为 |
|---------|-----------|
| "帮我查询库存低于10的商品" | 调用 get_low_stock_goods |
| "帮我把库存低于10的商品补到50" | 调用 batch_restock |
| "帮我查一下商品1的库存，然后补100" | 调用 check_stock + add_stock |
| "帮我把商品2、3、5的活动延期一天" | 调用 extend_activity_time |

### 场景二：数据问答

| 商家输入 | Agent 行为 |
|---------|-----------|
| "今天上午的战况如何？" | 调用 get_dashboard |
| "哪款商品卖得最快？" | 调用 get_sales_rank |
| "商品1的详细统计是什么？" | 调用 get_goods_stats |
| "最近7天销售排行前五是什么？" | 调用 get_sales_rank |

## Java Admin Agent API 列表

| 接口 | 方法 | 功能 |
|------|------|------|
| `/admin/api/goods/{id}/stock` | GET | 查询指定商品库存 |
| `/admin/api/goods/low-stock` | GET | 查询低库存商品 |
| `/admin/api/goods/{id}/stock/add` | POST | 追加库存 |
| `/admin/api/goods/restock` | POST | 批量补货 |
| `/admin/api/goods/extend-time` | POST | 批量延期活动 |
| `/admin/api/data/dashboard` | GET | 大盘汇总数据 |
| `/admin/api/data/goods/{id}/stats` | GET | 单商品统计 |
| `/admin/api/data/sales-rank` | GET | 销售排行榜 |
| `/admin/api/data/goods` | GET | 所有商品列表 |
