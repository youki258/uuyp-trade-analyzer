import csv
import json
from pathlib import Path

from exporter.bill_exporter import BillExporter
from exporter.client import UUYPApiError


def test_export_json_preserves_identity_fields_without_mutating_input(tmp_path):
    source = {
        "sell": [
            {
                "orderNo": "order-1",
                "user_id": "user-1",
                "user_nickname": "seller",
                "BuyerNickName": "buyer",
                "buyerUserId": "buyer-id",
                "user": {"id": "nested-user"},
                "displayNickname": "display-name",
                "_detail": {
                    "SellerNickName": "nested-seller",
                    "seller_user_id": "seller-id",
                    "amount": 0,
                },
            }
        ],
        "buy": [],
        "lease": [],
    }
    exporter = BillExporter(object(), output_dir=str(tmp_path))

    exporter.export_json(source, filename="safe.json")
    payload = json.loads((tmp_path / "safe.json").read_text(encoding="utf-8"))

    exported_order = payload["data"]["sell"][0]
    assert exported_order["user_id"] == "user-1"
    assert exported_order["user_nickname"] == "seller"
    assert exported_order["BuyerNickName"] == "buyer"
    assert exported_order["buyerUserId"] == "buyer-id"
    assert exported_order["user"]["id"] == "nested-user"
    assert exported_order["_detail"]["SellerNickName"] == "nested-seller"
    assert source["sell"][0]["user_id"] == "user-1"


def test_safe_api_call_retries_normalized_api_errors():
    exporter = BillExporter(object())
    calls = 0

    def failing_call():
        nonlocal calls
        calls += 1
        raise UUYPApiError("temporary network failure")

    exporter.MAX_RETRIES = 1
    assert exporter._safe_api_call(failing_call) is None
    assert calls == 1


def test_server_csv_exports_expected_fields(tmp_path):
    source = {
        "sell": [
            {
                "orderNo": "order-1",
                "commodityName": "AK-47 | Redline",
                "buyerUserName": "buyer-list",
                "sellerUserName": "seller-list",
                "totalAmount": 10000,
                "createOrderTime": 1767225600000,
                "tradeOfferId": "offer-list",
            },
            {
                "orderNo": "order-2",
                "commodityName": "AK-47 | Redline",
                "buyerNickname": "buyer-detail",
                "sellerNickname": "seller-detail",
                "totalAmount": 12000,
                "createOrderTime": 1767225600000,
                "tradeOfferId": "",
                "_detail": {"tradeOfferId": "offer-detail"},
            }
        ],
        "buy": [
            {
                "orderNo": "order-3",
                "commodityName": "AK-47 | Redline",
                "buyerUserName": "buy-buyer",
                "sellerUserName": "buy-seller",
                "totalAmount": 9000,
                "createOrderTime": 1767225600000,
                "tradeOfferId": "offer-buy",
            }
        ],
        "lease": [],
    }
    exporter = BillExporter(object(), output_dir=str(tmp_path))

    combined = exporter.export_csv(source, filename="combined.csv")
    split_files = exporter.export_excel_ready_csv(source)

    with open(combined, encoding="utf-8-sig", newline="") as handle:
        combined_rows = list(csv.DictReader(handle))
    assert combined_rows[0].keys() == {
        "订单类型", "订单号", "商品名称", "商品模板ID", "订单状态",
        "成交数量", "成交价格(分)", "成交时间", "买家昵称", "卖家昵称", "Steam报价ID",
    }
    assert combined_rows[0]["买家昵称"] == "buyer-list"
    assert combined_rows[0]["卖家昵称"] == "seller-list"
    assert combined_rows[0]["成交时间"].startswith("2026-01-01")
    assert combined_rows[0]["Steam报价ID"] == "offer-list"
    assert combined_rows[1]["Steam报价ID"] == "offer-detail"

    split_by_type = {Path(path).name.split("_")[1]: path for path in split_files}
    with open(split_by_type["sell"], encoding="utf-8-sig", newline="") as handle:
        sell_rows = list(csv.DictReader(handle))
    assert sell_rows[0].keys() == {
        "订单号", "商品名称", "订单状态", "成交数量", "成交价格(分)",
        "成交时间", "Steam报价ID", "买家昵称", "卖家昵称",
    }
    assert sell_rows[0]["买家昵称"] == "buyer-list"
    assert sell_rows[0]["卖家昵称"] == "seller-list"
    assert sell_rows[1]["Steam报价ID"] == "offer-detail"


def test_trade_offer_id_prefers_list_value_over_detail(tmp_path):
    source = {
        "sell": [
            {
                "orderNo": "order-1",
                "tradeOfferId": "offer-list",
                "_detail": {"tradeOfferId": "offer-detail"},
            }
        ],
        "buy": [],
        "lease": [],
    }
    exporter = BillExporter(object(), output_dir=str(tmp_path))

    output = exporter.export_csv(source, filename="combined.csv")

    with open(output, encoding="utf-8-sig", newline="") as handle:
        row = next(csv.DictReader(handle))
    assert row["Steam报价ID"] == "offer-list"


def test_extract_field_keeps_zero_value():
    assert BillExporter._extract_field({"totalAmount": 0}, "totalAmount", "fallback") == 0
