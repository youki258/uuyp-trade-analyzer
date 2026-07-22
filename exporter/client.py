"""
悠悠有品 API 客户端
参考 Steamauto (github.com/Steamauto/Steamauto) 和 CS2 Trade Manager 的实现
"""

import json
import random
import string
import time
import requests
from typing import Optional, Dict, List, Any


class UUYPClient:
    """悠悠有品 API 客户端，支持登录认证和数据抓取"""

    BASE_URL = "https://api.youpin898.com"

    def __init__(self, token: str = "", app_type: str = "app"):
        """
        初始化客户端
        :param token: Bearer Token（可通过登录获取或抓包获得）
        :param app_type: 认证模式 - "app"(模拟APP) 或 "web"(模拟网页)
        """
        self.session = requests.Session()
        self.token = token
        self.app_type = app_type
        self.nickname = ""
        self.user_id = ""

        # 生成设备信息
        self.device_info = UUYPClient._generate_device_info()
        self.session_id = self.device_info["deviceId"]

        # 设置请求头
        if app_type == "app":
            self.session.headers.update(UUYPClient._generate_app_headers(token, self.session_id))
        else:
            self.session.headers.update(self._generate_web_headers(token))

        # 获取 uk 设备校验码（降低风控概率）
        if app_type == "app":
            self._fetch_uk()

        # 如果有 token，验证并获取用户信息
        if token:
            self._verify_token()

    # ==================== 设备与请求头 ====================

    @staticmethod
    def _generate_random_string(length: int) -> str:
        """生成随机字符串"""
        letters_and_digits = string.ascii_letters + string.digits
        return "".join(random.choice(letters_and_digits) for _ in range(length))

    @staticmethod
    def _generate_device_info() -> Dict[str, Any]:
        """生成模拟 Android 设备信息"""
        return {
            "deviceId": UUYPClient._generate_random_string(24),
            "deviceType": "5",
            "hasSteamApp": 1,
            "systemName": "Android",
            "systemVersion": "14",
        }

    @staticmethod
    def _generate_app_headers(token: str = "", device_id: str = "") -> Dict[str, str]:
        """生成模拟 APP 端的请求头（对齐 v5.46.1 真实客户端）"""
        return {
            "authorization": f"Bearer {token}" if token else "",
            "content-type": "application/json; charset=utf-8",
            "user-agent": "okhttp/3.14.9",
            "app-version": "5.46.1",
            "apptype": "4",
            "package-type": "uuyp",
            "devicetoken": device_id,
            "deviceid": device_id,
            "platform": "android",
            "accept-encoding": "gzip",
            "Gameid": "730",
            "requestTag": UUYPClient._generate_random_string(32).upper(),
            "hasSteamApp": "1",
            "deviceType": "5",
            "currentTheme": "Light",
        }

    def _generate_web_headers(self, token: str = "") -> Dict[str, str]:
        """生成模拟 Web 端的请求头"""
        return {
            "authorization": f"Bearer {token}" if token else "",
            "content-type": "application/json; charset=utf-8",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "accept": "application/json, text/plain, */*",
            "accept-encoding": "gzip, deflate, br",
            "accept-language": "zh-CN,zh;q=0.9",
            "apptype": "1",
            "origin": "https://www.youpin898.com",
            "referer": "https://www.youpin898.com/",
        }

    def _fetch_uk(self):
        """
        获取 uk 设备校验码（通过 /api/app 明文设备指纹方式）
        来源：cs2-trade-manager 实现，经实测验证有效。
        uk 用于降低服务端风控判定概率。
        """
        try:
            data = {
                "appVersion": "5.46.1",
                "data": {
                    "manu": "OnePlus",
                    "brand": "OnePlus",
                    "mod": 1718369655000,
                    "cpucnt": 8,
                    "abi": "arm64-v8a",
                    "abi2": "x86_64",
                    "cpuinfos": "Processor\t: ARMv8 processor rev 1 (aarch64)",
                    "cpumax": "3200000",
                    "mems": 536870912,
                    "fmem": 479239008,
                    "fd": 126139039744,
                    "ds": 134208294912,
                    "scr": "1080*1920",
                    "dpi": 480,
                    "type": "Phone",
                    "os": "Android",
                    "osvn": "14",
                    "osvc": 34,
                    "osb": "UP1A.231005.007",
                    "tz": "Asia/Shanghai",
                    "loc": "CN",
                    "lang": "zh",
                    "fp": "OnePlus/OnePlus8Pro/OnePlus8Pro:14/UP1A.231005.007:user/release-keys",
                    "bootT": int(time.time() * 1000) - 3600000,
                    "font": 1,
                    "pkg": "com.uu898.uuhavequality",
                    "lvc": 0,
                    "vc": 2025012411,
                    "vn": "5.46.1",
                    "dn": "com.uu898.uuhavequality.app.App",
                    "it": int(time.time() * 1000) - 1500000,
                    "ut": int(time.time() * 1000) - 1500000,
                    "u": False,
                    "sn": "-998, Attempt to invoke virtual method",
                    "len": 78245620,
                    "aid": UUYPClient._generate_random_string(16),
                    "fs": "/data/user/0/com.uu898.uuhavequality/files",
                    "imeis": "-999",
                    "phone": "-999",
                    "mac": "",
                    "bt": True,
                    "mob": True,
                    "av": True,
                    "con": True,
                    "r": False,
                },
                "src": "android",
                "time": int(time.time() * 1000),
                "uid": self.session_id,
                "uk": "",
                "userId": 0,
                "version": "v1.0.0",
                "Sessionid": self.session_id,
            }
            resp = requests.post(
                f"{self.BASE_URL}/api/app",
                json=data,
                headers={"Content-Type": "application/json"},
                timeout=10,
            )
            result = resp.json()
            uk = (result.get("data") or {}).get("uk", "")
            if uk:
                self.session.headers["uk"] = uk
                print("[OK] uk 设备校验码获取成功")
            else:
                print(f"[!] uk 获取失败 (code={result.get('code')}, 不影响基本功能)")
        except Exception as e:
            print(f"[!] uk 获取异常（不影响基本功能）: {e}")

    def _verify_token(self):
        """验证 Token 是否有效，并获取用户信息"""
        try:
            info = self.call_api("GET", "/api/user/Account/getUserInfo").json()
            if "Data" in info and info.get("Code") == 0:
                self.nickname = info["Data"].get("NickName", "")
                self.user_id = info["Data"].get("UserId", "")
                print("[OK] Token 验证成功")
            else:
                raise Exception(f"Token 验证失败: {info.get('Msg', '未知错误')}")
        except Exception as e:
            raise Exception(f"Token 无效或已过期，请重新获取: {e}")

    # ==================== 登录认证 ====================

    @staticmethod
    def send_sms_code(phone: str, region_code: int = 86) -> Dict:
        """
        发送短信验证码（APP 端方式）
        :param phone: 手机号
        :param region_code: 区号，默认86
        :return: API 响应
        """
        device_info = UUYPClient._generate_device_info()
        headers = UUYPClient._generate_app_headers("", device_info["deviceId"])
        headers["devicetoken"] = device_info["deviceId"]
        headers["deviceid"] = device_info["deviceId"]

        url = f"{UUYPClient.BASE_URL}/api/user/Auth/SendSignInSmsCode"
        data = {
            "Area": region_code,
            "Mobile": phone,
            "Sessionid": device_info["deviceId"],
            "Code": "",
        }
        response = requests.post(url, json=data, headers=headers, timeout=15)
        result = response.json()

        if result.get("Code") == 5050:
            print("[!] 该手机号需要手动发送短信验证（SmsUpSignIn）")
        elif result.get("Code") == 0:
            print("[OK] 验证码发送成功")
        else:
            print(f"[FAIL] 验证码发送失败: {result.get('Msg', '未知错误')}")

        return result, device_info, headers

    @staticmethod
    def sms_sign_in(phone: str, code: str, session_id: str, headers: Dict = None) -> Dict:
        """
        通过短信验证码登录
        :param phone: 手机号
        :param code: 短信验证码（为空则使用 SmsUpSignIn）
        :param session_id: 与发送验证码时一致的 session id
        :param headers: 请求头
        :return: 包含 Token 的响应
        """
        if code == "":
            url = f"{UUYPClient.BASE_URL}/api/user/Auth/SmsUpSignIn"
        else:
            url = f"{UUYPClient.BASE_URL}/api/user/Auth/SmsSignIn"

        data = {
            "Area": 86,
            "Code": code,
            "Sessionid": session_id,
            "Mobile": phone,
            "TenDay": 1,  # 10天免登录
        }
        response = requests.post(url, json=data, headers=headers or {}, timeout=15)
        result = response.json()

        if result.get("Code") == 0 and "Data" in result and "Token" in result["Data"]:
            print("[OK] 登录成功")
            return result
        else:
            print(f"[FAIL] 登录失败: {result.get('Msg', '未知错误')}")
            return result

    @staticmethod
    def pwd_sign_in(username: str, password: str) -> Dict:
        """
        通过密码登录（Web 端方式）
        :param username: 手机号
        :param password: 登录密码
        :return: 包含 Token 的响应
        """
        url = f"{UUYPClient.BASE_URL}/api/user/Auth/PwdSignIn"
        headers = {
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "accept": "application/json, text/plain, */*",
            "accept-encoding": "gzip, deflate, br",
            "accept-language": "zh-CN,zh;q=0.9",
            "apptype": "1",
            "origin": "https://www.youpin898.com",
            "referer": "https://www.youpin898.com/",
            "content-type": "application/json; charset=utf-8",
        }
        data = {
            "code": "",
            "SessionId": "",
            "UserName": username,
            "UserPwd": password,
        }
        response = requests.post(url, json=data, headers=headers, timeout=15)
        result = response.json()

        if result.get("Code") == 0 and "Data" in result and "Token" in result["Data"]:
            print("[OK] 密码登录成功")
        else:
            print(f"[FAIL] 密码登录失败: {result.get('Msg', '未知错误')}")

        return result

    # ==================== API 调用 ====================

    def call_api(self, method: str, path: str, data: Dict = None) -> requests.Response:
        """
        调用 API
        :param method: GET, POST, PUT, DELETE
        :param path: 请求路径
        :param data: 请求数据
        :return: Response 对象
        """
        url = self.BASE_URL + path
        try:
            if method == "GET":
                response = self.session.get(url, params=data, timeout=30)
            elif method == "POST":
                response = self.session.post(url, json=data, timeout=30)
            elif method == "PUT":
                response = self.session.put(url, json=data, timeout=30)
            elif method == "DELETE":
                response = self.session.delete(url, timeout=30)
            else:
                raise ValueError(f"不支持的 HTTP 方法: {method}")

            # 调试日志 — 不记录响应内容，防止泄露用户数据
            print(f"[API] {method} {path} -> {response.status_code}")
            return response

        except requests.exceptions.RequestException as e:
            raise Exception(f"网络请求失败: {e}")

    @staticmethod
    def _is_json(data: str) -> bool:
        try:
            json.loads(data)
            return True
        except Exception:
            return False

    # ==================== 交易数据获取 ====================

    def get_sell_orders(self, page: int = 1, page_size: int = 20,
                        order_status: int = 340) -> Dict:
        """
        获取卖出订单列表
        :param page: 页码，从1开始
        :param page_size: 每页数量（服务端上限20，超出返回空列表）
        :param order_status: 订单状态
            140 = 待发货, 200 = 交易中, 340 = 已完成
        :return: API 响应
        """
        data = {
            "keys": "",
            "orderStatus": order_status,
            "pageIndex": page,
            "pageSize": page_size,
            "presenterId": 0,
            "sceneType": 0,
            "Sessionid": self.session_id,
        }
        response = self.call_api("POST", "/api/youpin/bff/trade/sale/v1/sell/list", data)
        return response.json()

    def get_buy_orders(self, page: int = 1, page_size: int = 20,
                       order_status: int = 340) -> Dict:
        """
        获取买入订单列表
        :param page: 页码，从1开始
        :param page_size: 每页数量（服务端上限20，超出返回空列表）
        :param order_status: 订单状态
        :return: API 响应
        """
        data = {
            "keys": "",
            "orderStatus": order_status,
            "pageIndex": page,
            "pageSize": page_size,
            "presenterId": 0,
            "sceneType": 0,
            "Sessionid": self.session_id,
        }
        response = self.call_api("POST", "/api/youpin/bff/trade/sale/v1/buy/list", data)
        return response.json()

    def get_order_detail(self, order_no: str) -> Dict:
        """
        获取订单详情
        :param order_no: 订单号
        :return: API 响应
        """
        data = {
            "orderNo": order_no,
            "userId": self.user_id,
            "Sessionid": self.session_id,
        }
        response = self.call_api("POST", "/api/youpin/bff/trade/v1/order/query/detail", data)
        return response.json()

    def get_lease_out_orders(self, page: int = 1, page_size: int = 50,
                             sort_type: int = 0, keywords: str = "") -> Dict:
        """
        获取租出订单列表（已确认的接口，来源：Steamauto 源码）
        :param page: 页码，从1开始
        :param page_size: 每页数量（默认50）
        :param sort_type: 排序类型（0=默认）
        :param keywords: 搜索关键词
        :return: API 响应
        """
        data = {
            "gameId": 730,
            "pageIndex": page,
            "pageSize": page_size,
            "sortType": sort_type,
            "keywords": keywords,
        }
        response = self.call_api("POST", "/api/youpin/bff/trade/v1/order/lease/out/list", data)
        return response.json()

    def get_lease_in_orders(self, page: int = 1, page_size: int = 50,
                            sort_type: int = 0, keywords: str = "",
                            api_path: str = None) -> Dict:
        """
        获取租入订单列表

        注意：租入订单接口暂无公开稳定路径。这里仅支持传入抓包确认后的 api_path；
        若未传入 api_path，会直接返回失败提示，不再进行猜测式路径尝试。

        :param page: 页码
        :param page_size: 每页数量
        :param sort_type: 排序类型
        :param keywords: 搜索关键词
        :param api_path: 自定义 API 路径（如已通过抓包获取，直接传入）
        :return: API 响应
        """
        data = {
            "gameId": 730,
            "pageIndex": page,
            "pageSize": page_size,
            "sortType": sort_type,
            "keywords": keywords,
        }

        if not api_path:
            print("[!] 未提供 --lease-in-path，跳过租入订单抓取")
            print("    抓包方法：Fiddler/Charles/mitmproxy -> APP 我的账单 -> 租赁 -> 租入")
            return {"Code": -1, "Msg": "租入订单接口未配置，请使用 --lease-in-path 传入抓包路径"}

        try:
            response = self.call_api("POST", api_path, data)
            result = response.json()
            code = result.get("Code") or result.get("code")
            if code == 0:
                print(f"[OK] 租入订单接口调用成功: {api_path}")
            else:
                msg = result.get("Msg") or result.get("msg") or ""
                print(f"[!] 租入订单接口返回 code={code}, msg={msg}")
            return result
        except Exception as e:
            print(f"[!] 租入订单接口请求异常: {e}")
            return {"Code": -1, "Msg": f"租入订单接口请求异常: {e}"}

    def get_todo_orders(self, page: int = 1, page_size: int = 100) -> Dict:
        """
        获取待处理订单列表
        :param page: 页码
        :param page_size: 每页数量
        :return: API 响应
        """
        data = {
            "userId": self.user_id,
            "pageIndex": page,
            "pageSize": page_size,
            "Sessionid": self.session_id,
        }
        response = self.call_api("POST", "/api/youpin/bff/trade/todo/v1/orderTodo/list", data)
        return response.json()

    def get_user_info(self) -> Dict:
        """获取用户信息"""
        response = self.call_api("GET", "/api/user/Account/getUserInfo")
        return response.json()

    def get_sell_list(self) -> List[Dict]:
        """获取当前在售商品列表（全量）"""
        all_items = []
        page = 0
        while True:
            page += 1
            data = {"pageIndex": page, "pageSize": 100, "whetherMerge": 0}
            response = self.call_api("POST", "/api/youpin/bff/new/commodity/v1/commodity/list/sell", data)
            result = response.json()
            if result.get("code") != 0:
                break
            items = result.get("data", {}).get("commodityInfoList", [])
            all_items.extend(items)
            if len(items) < 100:
                break
        return all_items
