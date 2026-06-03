"""
库存相关工具函数，供 LangChain Agent 调用
"""
import requests
from langchain_core.tools import tool
from config import JAVA_BASE_URL, AGENT_TOKEN

HEADERS = {
    "X-Agent-Token": AGENT_TOKEN,
    "Content-Type": "application/json"
}


@tool
def check_stock(goods_id: int) -> dict:
    """
    查询指定商品的当前剩余库存

    参数:
        goods_id: 商品ID

    返回:
        包含 goodsId 和 stockCount 的字典
    """
    url = f"{JAVA_BASE_URL}/admin/api/goods/{goods_id}/stock"
    resp = requests.get(url, headers=HEADERS, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    if data.get("code") != 200:
        raise ValueError(f"查询库存失败: {data.get('message', '未知错误')}")
    return data.get("data", {})


@tool
def get_low_stock_goods(threshold: int = 10) -> list:
    """
    查询所有库存低于指定阈值的商品

    参数:
        threshold: 库存阈值，默认为10

    返回:
        低库存商品列表
    """
    url = f"{JAVA_BASE_URL}/admin/api/goods/low-stock"
    resp = requests.get(url, headers=HEADERS, params={"threshold": threshold}, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    if data.get("code") != 200:
        raise ValueError(f"查询低库存商品失败: {data.get('message', '未知错误')}")
    return data.get("data", [])


@tool
def add_stock(goods_id: int, add_count: int) -> dict:
    """
    追加指定商品的库存（同时更新 Redis 和数据库）

    参数:
        goods_id: 商品ID
        add_count: 追加数量（正数）

    返回:
        包含 goodsId、addedCount、currentStock 的字典
    """
    if add_count <= 0:
        raise ValueError("追加数量必须大于0")
    url = f"{JAVA_BASE_URL}/admin/api/goods/{goods_id}/stock/add"
    resp = requests.post(url, headers=HEADERS, json={"addCount": add_count}, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    if data.get("code") != 200:
        raise ValueError(f"追加库存失败: {data.get('message', '未知错误')}")
    return data.get("data", {})


@tool
def batch_restock(threshold: int = 10, target_stock: int = 50) -> dict:
    """
    批量补货：将所有库存低于阈值的商品补至目标库存

    参数:
        threshold: 库存阈值，默认为10
        target_stock: 目标库存，默认为50

    返回:
        补货结果列表
    """
    url = f"{JAVA_BASE_URL}/admin/api/goods/restock"
    resp = requests.post(url, headers=HEADERS, json={
        "threshold": threshold,
        "targetStock": target_stock
    }, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    if data.get("code") != 200:
        raise ValueError(f"批量补货失败: {data.get('message', '未知错误')}")
    return data.get("data", {})


@tool
def extend_activity_time(goods_ids: list, extend_days: int = 1) -> dict:
    """
    批量延期商品活动结束时间

    参数:
        goods_ids: 商品ID列表
        extend_days: 延期天数，默认1天
    """
    url = f"{JAVA_BASE_URL}/admin/api/goods/extend-time"
    resp = requests.post(url, headers=HEADERS, json={
        "goodsIds": goods_ids,
        "extendDays": extend_days
    }, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    if data.get("code") != 200:
        raise ValueError(f"延期活动失败: {data.get('message', '未知错误')}")
    return data.get("data", {})
