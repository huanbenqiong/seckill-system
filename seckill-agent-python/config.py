# ==================== Java 后端接口地址 ====================
# seckill-admin-agent 服务端口（见 seckill-admin-agent/src/main/resources/application.yml）
JAVA_BASE_URL = "http://localhost:8090"

# seckill-admin-agent 中配置的 Token（两处需保持一致）
AGENT_TOKEN = "seckill-agent-secret-key-2026"

# ==================== 大模型配置 ====================
# DeepSeek API（通过 https://platform.deepseek.com/ 获取 API Key）
OPENAI_API_KEY = "sk-0c2a4792a8d34ef9852c68dfc3e2c7c0"
OPENAI_BASE_URL = "https://api.deepseek.com/v1"
MODEL_NAME = "deepseek-chat"

# ==================== Agent 行为配置 ====================
# 补货默认阈值
DEFAULT_LOW_STOCK_THRESHOLD = 10
DEFAULT_TARGET_STOCK = 50
# 单次最大补货数量
MAX_RESTOCK_PER_GOODS = 500
