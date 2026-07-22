"""
悠悠有品账单数据抓取器
全量抓取所有交易数据并保存为本地文件
"""

import json
import csv
import os
import time
from datetime import datetime
from typing import Dict, List, Optional, Any
from .client import UUYPClient


class BillExporter:
    """悠悠有品账单数据抓取与导出"""

    # 请求间隔（秒），避免触发风控
    # 实测验证：补充 uk 校验 + 更新 headers 后，0.5s 间隔连续请求不触发 84104
    LIST_INTERVAL = 1.0       # 列表请求间隔（原 3.0，实测 1.0 安全）
    DETAIL_INTERVAL = 1.0     # 详情请求间隔（原 1.5）
    MAX_RETRIES = 3           # 最大重试次数
    PAGE_SIZE = 20            # 每页数量（服务端上限，超出返回空列表）

    def __init__(self, client: UUYPClient, output_dir: str = "./output"):
        """
        :param client: 已认证的 UUYPClient 实例
        :param output_dir: 输出目录
        """
        self.client = client
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def _safe_api_call(self, func, *args, **kwargs) -> Optional[Dict]:
        """带重试的安全 API 调用"""
        for attempt in range(self.MAX_RETRIES):
            try:
                result = func(*args, **kwargs)
                # 检查风控错误
                code = result.get("Code") or result.get("code")
                if code == 84101:
                    print("[FAIL] 登录已失效，请重新获取 Token")
                    return None
                if code == 84104:
                    print("[FAIL] 触发风控，暂时无法获取数据，等待后重试...")
                    time.sleep(30)
                    continue
                return result
            except Exception as e:
                print(f"[!] 请求失败 (尝试 {attempt + 1}/{self.MAX_RETRIES}): {e}")
                if attempt < self.MAX_RETRIES - 1:
                    time.sleep(5 * (attempt + 1))
        return None

    def fetch_all_sell_orders(self, order_status: int = 340) -> List[Dict]:
        """
        抓取全部卖出订单
        :param order_status: 订单状态 (340=已完成, 200=交易中, 140=待发货)
        :return: 订单列表
        """
        all_orders = []
        page = 1

        print(f"\n{'='*60}")
        print(f"开始抓取卖出订单 (状态: {order_status})")
        print(f"{'='*60}")

        while True:
            print(f"\n[>] 正在抓取卖出订单第 {page} 页...")
            result = self._safe_api_call(
                self.client.get_sell_orders,
                page=page,
                page_size=self.PAGE_SIZE,
                order_status=order_status,
            )

            if result is None:
                print("[FAIL] 获取卖出订单失败，停止抓取")
                break

            # 兼容两种响应格式
            code = result.get("Code") or result.get("code")
            if code != 0:
                print(f"[FAIL] API 返回错误: code={code}, msg={result.get('Msg') or result.get('msg')}")
                break

            order_list = result.get("Data", {}).get("orderList") or result.get("data", {}).get("orderList", [])
            if not order_list:
                print(f"[OK] 第 {page} 页无数据，卖出订单抓取完成")
                break

            all_orders.extend(order_list)
            print(f"[OK] 第 {page} 页获取 {len(order_list)} 条记录，累计 {len(all_orders)} 条")

            if len(order_list) < self.PAGE_SIZE:
                print(f"[OK] 已到最后一页，卖出订单抓取完成")
                break

            page += 1
            time.sleep(self.LIST_INTERVAL)

        return all_orders

    def fetch_all_buy_orders(self, order_status: int = 340) -> List[Dict]:
        """
        抓取全部买入订单
        :param order_status: 订单状态
        :return: 订单列表
        """
        all_orders = []
        page = 1

        print(f"\n{'='*60}")
        print(f"开始抓取买入订单 (状态: {order_status})")
        print(f"{'='*60}")

        while True:
            print(f"\n[>] 正在抓取买入订单第 {page} 页...")
            result = self._safe_api_call(
                self.client.get_buy_orders,
                page=page,
                page_size=self.PAGE_SIZE,
                order_status=order_status,
            )

            if result is None:
                print("[FAIL] 获取买入订单失败，停止抓取")
                break

            code = result.get("Code") or result.get("code")
            if code != 0:
                print(f"[FAIL] API 返回错误: code={code}")
                break

            order_list = result.get("Data", {}).get("orderList") or result.get("data", {}).get("orderList", [])
            if not order_list:
                print(f"[OK] 第 {page} 页无数据，买入订单抓取完成")
                break

            all_orders.extend(order_list)
            print(f"[OK] 第 {page} 页获取 {len(order_list)} 条记录，累计 {len(all_orders)} 条")

            if len(order_list) < self.PAGE_SIZE:
                print(f"[OK] 已到最后一页，买入订单抓取完成")
                break

            page += 1
            time.sleep(self.LIST_INTERVAL)

        return all_orders

    def fetch_all_lease_orders(self, lease_in_api_path: str = None) -> List[Dict]:
        """
        抓取全部租赁订单（租出 + 租入）
        
        租出订单接口已确认（来自 Steamauto 源码）：
            POST /api/youpin/bff/trade/v1/order/lease/out/list
            
        租入订单接口在所有开源项目中均未找到，工具会自动尝试多种可能的路径。
        如自动尝试均失败，请通过 APP 抓包确认路径后传入 lease_in_api_path 参数。
        
        :param lease_in_api_path: 租入订单的自定义 API 路径（如已通过抓包确认）
        """
        all_orders = []

        # 抓取租出订单
        out_orders = self._fetch_lease_page_list("lease_out")
        all_orders.extend(out_orders)

        # 抓取租入订单
        in_orders = self._fetch_lease_page_list("lease_in", api_path=lease_in_api_path)
        all_orders.extend(in_orders)

        if not in_orders:
            print(f"\n{'='*60}")
            print("[!] 未获取到租入订单数据")
            print("[!] 租入订单接口在 Steamauto、cs2-trade-manager 等开源项目中均未实现")
            print("[!] 如需获取租入数据，请按以下步骤抓包确认接口路径：")
            print("    1. 安装 Fiddler/Charles/mitmproxy 等抓包工具")
            print("    2. 手机配置代理，安装并信任抓包工具的 CA 证书")
            print("    3. 打开悠悠有品 APP -> 我的 -> 我的服务 -> 我的账单")
            print("    4. 切换到「租赁」标签页，选择「租入」筛选")
            print("    5. 在抓包工具中找到对应的 API 请求")
            print("    6. 记录完整的请求 URL 路径和参数格式")
            print("    7. 重新运行工具，使用 --lease-in-path 参数传入路径")
            print(f"{'='*60}")

        return all_orders

    def _fetch_lease_page_list(self, lease_type: str = "lease_out",
                                api_path: str = None) -> List[Dict]:
        """
        分页抓取租出/租入订单
        :param lease_type: "lease_out" 或 "lease_in"
        :param api_path: 自定义 API 路径（租入接口用）
        """
        all_orders = []
        page = 1
        type_name = "租出" if lease_type == "lease_out" else "租入"
        page_size = 50  # 与 Steamauto 保持一致

        print(f"\n{'='*60}")
        print(f"开始抓取{type_name}订单")
        print(f"{'='*60}")

        while True:
            print(f"\n[>] 正在抓取{type_name}订单第 {page} 页...")
            if lease_type == "lease_out":
                result = self._safe_api_call(
                    self.client.get_lease_out_orders,
                    page=page,
                    page_size=page_size,
                )
            else:
                result = self._safe_api_call(
                    self.client.get_lease_in_orders,
                    page=page,
                    page_size=page_size,
                    api_path=api_path,
                )

            if result is None:
                print(f"[FAIL] 获取{type_name}订单失败，停止抓取")
                break

            # 兼容大小写 Code/code
            code = result.get("Code") or result.get("code")
            if code is not None and code != 0:
                msg = result.get("Msg") or result.get("msg") or ""
                print(f"[!] {type_name}订单 API 返回: code={code}, msg={msg}")
                if lease_type == "lease_in" and code != 0:
                    print(f"[!] 租入订单接口路径可能不正确，跳过")
                    print(f"[!] 请通过 APP 抓包确认实际路径，参考上方指引")
                break

            # 提取订单列表（兼容 Data/data 两种格式）
            # 租赁订单可能返回在 orderDataList 或 orderList 中
            order_data = (
                (result.get("Data") or result.get("data") or {}).get("orderDataList")
                or (result.get("Data") or result.get("data") or {}).get("orderList")
                or []
            )
            if not order_data:
                total = (result.get("Data") or result.get("data") or {}).get("totalCount", "?")
                print(f"[OK] 第 {page} 页无数据，{type_name}订单抓取完成 (totalCount={total})")
                break

            # 标记订单来源
            for order in order_data:
                order["_lease_type"] = type_name

            all_orders.extend(order_data)
            print(f"[OK] 第 {page} 页获取 {len(order_data)} 条{type_name}记录，累计 {len(all_orders)} 条")

            if len(order_data) < page_size:
                print(f"[OK] 已到最后一页，{type_name}订单抓取完成")
                break

            page += 1
            time.sleep(self.LIST_INTERVAL)

        return all_orders

    def fetch_order_details_batch(self, order_list: List[Dict]) -> List[Dict]:
        """
        批量获取订单详情
        :param order_list: 订单列表
        :return: 带详情的订单列表
        """
        detailed_orders = []
        total = len(order_list)

        print(f"\n[>] 开始获取 {total} 个订单的详情...")

        for i, order in enumerate(order_list):
            order_no = order.get("orderNo") or order.get("orderId") or order.get("orderNo", "")
            if not order_no:
                detailed_orders.append(order)
                continue

            print(f"  [{i+1}/{total}] 获取订单 {order_no} 详情...")
            detail = self._safe_api_call(self.client.get_order_detail, order_no)

            if detail:
                detail_data = detail.get("data") or detail.get("Data", {})
                order["_detail"] = detail_data

            detailed_orders.append(order)
            time.sleep(self.DETAIL_INTERVAL)

        return detailed_orders

    def fetch_all_data(self, fetch_detail: bool = False,
                       include_lease: bool = True,
                       lease_in_api_path: str = None) -> Dict[str, List[Dict]]:
        """
        抓取全部交易数据
        :param fetch_detail: 是否获取订单详情（耗时更长）
        :param include_lease: 是否包含租赁订单
        :param lease_in_api_path: 租入订单的自定义 API 路径（如已通过抓包确认）
        :return: {"sell": [...], "buy": [...], "lease": [...]}
        """
        data = {}

        # 抓取卖出订单
        sell_orders = self.fetch_all_sell_orders(order_status=340)
        if fetch_detail and sell_orders:
            sell_orders = self.fetch_order_details_batch(sell_orders)
        data["sell"] = sell_orders

        # 抓取买入订单
        buy_orders = self.fetch_all_buy_orders(order_status=340)
        if fetch_detail and buy_orders:
            buy_orders = self.fetch_order_details_batch(buy_orders)
        data["buy"] = buy_orders

        # 抓取租赁订单
        if include_lease:
            lease_orders = self.fetch_all_lease_orders(lease_in_api_path=lease_in_api_path)
            data["lease"] = lease_orders
        else:
            data["lease"] = []

        return data

    # ==================== 数据导出 ====================

    def export_json(self, data: Dict[str, List[Dict]], filename: str = None) -> str:
        """
        导出为 JSON 文件
        :param data: 抓取的数据
        :param filename: 文件名（默认自动生成）
        :return: 文件路径
        """
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"uuyp_bills_{timestamp}.json"

        filepath = os.path.join(self.output_dir, filename)

        export_data = {
            "export_time": datetime.now().isoformat(),
            "user_nickname": self.client.nickname,
            "user_id": self.client.user_id,
            "summary": {
                "sell_count": len(data.get("sell", [])),
                "buy_count": len(data.get("buy", [])),
                "lease_count": len(data.get("lease", [])),
            },
            "data": data,
        }

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(export_data, f, ensure_ascii=False, indent=2)

        print(f"\n[OK] JSON 文件已保存: {filepath}")
        return filepath

    @staticmethod
    def _format_timestamp(ts) -> str:
        """将毫秒时间戳转为可读时间字符串"""
        if not ts:
            return ""
        try:
            if isinstance(ts, (int, float)):
                return datetime.fromtimestamp(ts / 1000).strftime("%Y-%m-%d %H:%M:%S")
            return str(ts)
        except Exception:
            return str(ts)

    @staticmethod
    def _extract_field(order: Dict, *keys) -> Any:
        """从订单中按优先级提取字段值"""
        for key in keys:
            val = order.get(key)
            if val is not None and val != "" and val != 0:
                return val
        return ""

    @staticmethod
    def _extract_quantity(order: Dict, product_detail: Dict) -> int:
        """提取成交数量，默认 1"""
        candidates = [
            order.get("commodityNum"),
            order.get("commoditySuccessNum"),
            order.get("num"),
            product_detail.get("num"),
            product_detail.get("commodityNum"),
        ]
        for val in candidates:
            if val is None or val == "":
                continue
            try:
                qty = int(float(str(val)))
                if qty > 0:
                    return qty
            except Exception:
                continue
        return 1

    def export_csv(self, data: Dict[str, List[Dict]], filename: str = None) -> str:
        """
        导出为 CSV 文件（所有订单合并）
        :param data: 抓取的数据
        :param filename: 文件名
        :return: 文件路径
        """
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"uuyp_bills_{timestamp}.csv"

        filepath = os.path.join(self.output_dir, filename)

        # CSV 列定义
        headers = [
            "订单类型", "订单号", "商品名称", "商品模板ID",
            "订单状态", "成交数量", "成交价格(分)", "成交时间",
            "买家昵称", "卖家昵称", "Steam报价ID",
        ]

        rows = []
        for order_type, orders in data.items():
            for order in orders:
                product_detail = order.get("productDetail") or order.get("commodity") or {}
                # 价格: totalAmount > commodityAmount > paymentAmount > productDetail.price
                price = (
                    self._extract_field(order, "totalAmount", "commodityAmount", "paymentAmount")
                    or self._extract_field(product_detail, "price")
                )
                # 时间: createOrderTime > finishOrderTime > paySuccessTime
                raw_time = (
                    self._extract_field(order, "createOrderTime", "finishOrderTime", "paySuccessTime")
                )
                # Steam报价ID: tradeOfferId
                trade_offer_id = order.get("tradeOfferId") or ""

                rows.append({
                    "订单类型": "卖出" if order_type == "sell" else "买入" if order_type == "buy" else order.get("_lease_type", "租赁"),
                    "订单号": order.get("orderNo") or order.get("id") or order.get("orderId") or "",
                    "商品名称": product_detail.get("commodityName") or order.get("commodityName") or "",
                    "商品模板ID": product_detail.get("commodityTemplateId") or "",
                    "订单状态": order.get("orderStatusName") or str(order.get("orderStatus") or ""),
                    "成交数量": self._extract_quantity(order, product_detail),
                    "成交价格(分)": price,
                    "成交时间": self._format_timestamp(raw_time),
                    "买家昵称": order.get("buyerUserName") or order.get("buyerNickName") or "",
                    "卖家昵称": order.get("sellerUserName") or order.get("sellerNickName") or "",
                    "Steam报价ID": trade_offer_id,
                })

        with open(filepath, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=headers)
            writer.writeheader()
            writer.writerows(rows)

        print(f"[OK] CSV 文件已保存: {filepath}")
        print(f"    卖出: {len(data.get('sell', []))} 条, 买入: {len(data.get('buy', []))} 条, 租赁: {len(data.get('lease', []))} 条")
        return filepath

    def export_excel_ready_csv(self, data: Dict[str, List[Dict]]) -> List[str]:
        """
        分别导出卖出/买入/租赁三个 CSV 文件，方便 Excel 分析
        :return: 文件路径列表
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        files = []

        for order_type in ["sell", "buy", "lease"]:
            orders = data.get(order_type, [])
            if not orders:
                continue

            type_name = {"sell": "卖出", "buy": "买入", "lease": "租赁"}[order_type]
            filename = f"uuyp_{order_type}_{timestamp}.csv"
            filepath = os.path.join(self.output_dir, filename)

            if order_type == "lease":
                headers = [
                    "订单号", "商品名称", "租赁类型", "短租价(分/天)",
                    "长租价(分/天)", "押金(分)", "成交时间",
                ]
            else:
                headers = [
                    "订单号", "商品名称", "订单状态", "成交数量", "成交价格(分)",
                    "成交时间", "Steam报价ID",
                ]

            rows = []
            for order in orders:
                if order_type == "lease":
                    # 租赁订单：商品信息在 commodityInfo 中
                    commodity_info = order.get("commodityInfo") or order.get("productDetail") or {}
                    rows.append({
                        "订单号": order.get("orderNo") or order.get("orderId") or order.get("id") or "",
                        "商品名称": commodity_info.get("name") or commodity_info.get("commodityName") or "",
                        "租赁类型": order.get("_lease_type", "租出"),
                        "短租价(分/天)": order.get("leaseUnitPrice") or commodity_info.get("leaseUnitPrice") or "",
                        "长租价(分/天)": order.get("longLeaseUnitPrice") or commodity_info.get("longLeaseUnitPrice") or "",
                        "押金(分)": order.get("leaseDeposit") or commodity_info.get("leaseDeposit") or "",
                        "成交时间": self._format_timestamp(
                            self._extract_field(order, "createOrderTime", "finishOrderTime", "startTime")
                        ),
                    })
                else:
                    product_detail = order.get("productDetail") or order.get("commodity") or {}
                    price = (
                        self._extract_field(order, "totalAmount", "commodityAmount", "paymentAmount")
                        or self._extract_field(product_detail, "price")
                    )
                    raw_time = (
                        self._extract_field(order, "createOrderTime", "finishOrderTime", "paySuccessTime")
                    )
                    trade_offer_id = order.get("tradeOfferId") or ""

                    rows.append({
                        "订单号": order.get("orderNo") or order.get("id") or order.get("orderId") or "",
                        "商品名称": product_detail.get("commodityName") or order.get("commodityName") or "",
                        "订单状态": order.get("orderStatusName") or str(order.get("orderStatus") or ""),
                        "成交数量": self._extract_quantity(order, product_detail),
                        "成交价格(分)": price,
                        "成交时间": self._format_timestamp(raw_time),
                        "Steam报价ID": trade_offer_id,
                    })

            with open(filepath, "w", encoding="utf-8-sig", newline="") as f:
                writer = csv.DictWriter(f, fieldnames=headers)
                writer.writeheader()
                writer.writerows(rows)

            files.append(filepath)
            print(f"[OK] {type_name}订单 CSV 已保存: {filepath} ({len(rows)} 条)")

        return files
