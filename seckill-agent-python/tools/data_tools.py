"""
数据查询相关工具函数，供 LangChain Agent 调用
"""
import requests
from langchain_core.tools import tool
from config import JAVA_BASE_URL, AGENT_TOKEN

HEADERS = {
    "X-Agent-Token": AGENT_TOKEN,
    "Content-Type": "application/json"
}


@tool
def get_dashboard() -> dict:
    """
    获取今日秒杀大盘汇总数据
    包含：总订单量、已支付、待支付、已取消、总销售额、活跃商品数、低库存商品数、热门商品
    """
    url = f"{JAVA_BASE_URL}/admin/api/data/dashboard"
    resp = requests.get(url, headers=HEADERS, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    if data.get("code") != 200:
        raise ValueError(f"获取大盘数据失败: {data.get('message', '未知错误')}")
    return data.get("data", {})


@tool
def get_goods_stats(goods_id: int) -> dict:
    """
    获取指定商品的详细统计信息
    包含：商品ID、当前库存、已售数量、秒杀价、活动时长、售罄速度、转化率
    """
    url = f"{JAVA_BASE_URL}/admin/api/data/goods/{goods_id}/stats"
    resp = requests.get(url, headers=HEADERS, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    if data.get("code") != 200:
        raise ValueError(f"获取商品统计失败: {data.get('message', '未知错误')}")
    return data.get("data", {})


@tool
def get_sales_rank(start_date: str = None, end_date: str = None, limit: int = 10) -> list:
    """
    获取销售排行榜

    参数:
        start_date: 开始日期，格式 YYYY-MM-DD，默认为今天
        end_date: 结束日期，格式 YYYY-MM-DD，默认为今天
        limit: 返回数量，默认10
    """
    url = f"{JAVA_BASE_URL}/admin/api/data/sales-rank"
    params = {"limit": limit}
    if start_date:
        params["startDate"] = start_date
    if end_date:
        params["endDate"] = end_date
    resp = requests.get(url, headers=HEADERS, params=params, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    if data.get("code") != 200:
        raise ValueError(f"获取销售排行失败: {data.get('message', '未知错误')}")
    return data.get("data", [])


@tool
def get_all_goods() -> list:
    """
    获取所有商品列表（带实时库存）
    """
    url = f"{JAVA_BASE_URL}/admin/api/data/goods"
    resp = requests.get(url, headers=HEADERS, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    if data.get("code") != 200:
        raise ValueError(f"获取商品列表失败: {data.get('message', '未知错误')}")
    return data.get("data", [])
