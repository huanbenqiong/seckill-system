"""
LangChain Agent 核心逻辑
支持场景一（智能补库）和场景二（自然语言数据问答）
"""
import os
from langchain_openai import ChatOpenAI
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
from tools.stock_tools import (
    check_stock, get_low_stock_goods, add_stock, batch_restock, extend_activity_time
)
from tools.data_tools import (
    get_dashboard, get_goods_stats, get_sales_rank, get_all_goods
)
from config import OPENAI_API_KEY, OPENAI_BASE_URL, MODEL_NAME


def _build_llm():
    """构建大模型实例"""
    if not OPENAI_API_KEY or OPENAI_API_KEY == "your-deepseek-api-key-here":
        raise ValueError("请先在 config.py 中配置您的 DeepSeek API Key")
    return ChatOpenAI(
        model=MODEL_NAME,
        api_key=OPENAI_API_KEY,
        base_url=OPENAI_BASE_URL,
        temperature=0.3,
        timeout=60
    )


# 所有可用的工具列表
TOOLS = [
    check_stock,
    get_low_stock_goods,
    add_stock,
    batch_restock,
    extend_activity_time,
    get_dashboard,
    get_goods_stats,
    get_sales_rank,
    get_all_goods,
]


def _build_agent():
    """构建 LangChain Tool Calling Agent"""
    llm = _build_llm()

    prompt = ChatPromptTemplate.from_messages([
        ("system", """你是一个专业的秒杀系统商家助手。你可以通过调用以下工具来查询和操作秒杀系统的数据。

可用工具：
- check_stock(goods_id): 查询指定商品的当前库存
- get_low_stock_goods(threshold): 查询库存低于阈值的商品列表
- add_stock(goods_id, add_count): 为指定商品追加库存
- batch_restock(threshold, target_stock): 批量将低库存商品补至目标库存
- extend_activity_time(goods_ids, extend_days): 批量延期商品活动
- get_dashboard(): 获取今日秒杀大盘汇总数据
- get_goods_stats(goods_id): 获取指定商品的详细统计
- get_sales_rank(start_date, end_date, limit): 获取销售排行榜
- get_all_goods(): 获取所有商品列表

数据说明：
- 库存单位为"件"，soldCount 为已售数量
- 订单状态：0=待支付，2=已支付，-1=已取消
- 所有金额单位为"元"

重要原则：
1. 你只能操作已有商品ID，不能凭空捏造商品ID
2. 回答时要基于工具返回的真实数据，不要编造
3. 如果用户的问题需要多个步骤，请依次调用工具，逐步给出回答
4. 补货操作优先使用 batch_restock 批量完成
5. 涉及多个商品时，先查询再操作，给出清晰的执行结果汇总
"""),
        MessagesPlaceholder(variable_name="chat_history", optional=True),
        ("human", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])

    agent = create_tool_calling_agent(llm, TOOLS, prompt)
    return AgentExecutor(agent=agent, tools=TOOLS, verbose=True, max_iterations=10)


# 全局 Agent 实例（延迟初始化）
_agent_executor = None


def get_agent():
    global _agent_executor
    if _agent_executor is None:
        _agent_executor = _build_agent()
    return _agent_executor


def chat_with_agent(user_input: str, chat_history: list = None) -> str:
    """
    场景一 & 场景二通用入口：处理商家自然语言输入

    参数:
        user_input: 商家的自然语言问题或指令
        chat_history: 对话历史，格式为 [(user_msg, ai_msg), ...]

    返回:
        Agent 的自然语言回答
    """
    agent = get_agent()

    history_messages = []
    if chat_history:
        for user_msg, ai_msg in chat_history:
            if user_msg:
                history_messages.append(HumanMessage(content=user_msg))
            if ai_msg:
                history_messages.append(AIMessage(content=ai_msg))

    try:
        response = agent.invoke({
            "input": user_input,
            "chat_history": history_messages,
        })
        return response["output"]
    except Exception as e:
        return f"抱歉，处理您的请求时遇到了问题：{str(e)}。请您重述一下问题，或联系管理员检查服务状态。"
