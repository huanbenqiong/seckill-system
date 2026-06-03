"""
秒杀系统 AI 商家助手 - FastAPI 入口
提供 HTTP 接口供前端商家端调用
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import config
from agent import chat_with_agent

app = FastAPI(
    title="秒杀系统 AI 商家助手",
    description="商家端智能数据分析与自动补货 Agent 接口",
    version="1.0.0"
)

# 允许跨域（前端商家端）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    """对话请求体"""
    message: str
    chat_history: Optional[list] = None


class ChatResponse(BaseModel):
    """对话响应体"""
    code: int
    message: str
    data: Optional[str] = None


@app.get("/")
async def root():
    return {"status": "ok", "service": "seckill-agent-python", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """
    核心接口：商家发送自然语言，Agent 返回自然语言回答

    支持场景：
    - 场景一（智能补库）：
        "帮我把库存低于10的商品补到50"
        "帮我盯着商品1，库存低于10就补货"
    - 场景二（数据问答）：
        "今天上午的战况如何？"
        "哪款商品卖得最快？"
        "今天的销售排行前五是什么？"
    """
    if not req.message or not req.message.strip():
        return ChatResponse(code=400, message="消息不能为空", data=None)

    try:
        # 处理对话历史，格式转换：[[user, assistant], ...] → [(user, assistant), ...]
        history = None
        if req.chat_history:
            try:
                history = [
                    (str(item[0]), str(item[1]))
                    for item in req.chat_history
                    if isinstance(item, list) and len(item) >= 2
                ]
            except Exception:
                history = None

        answer = chat_with_agent(req.message, history)
        return ChatResponse(code=200, message="success", data=answer)

    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent 处理失败: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    print("=" * 50)
    print("  秒杀系统 AI 商家助手")
    print("  Python Agent 服务启动中...")
    print(f"  后端接口地址: http://localhost:8099")
    print(f"  Java 数据源:   {config.JAVA_BASE_URL}")
    print("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=8099, reload=False)
