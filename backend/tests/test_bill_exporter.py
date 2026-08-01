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
                "buyerNickname": "buyer-secret",
                "sellerNickname": "seller-secret",
                "totalAmount": 10000,
                "createOrderTime": 1767225600000,
            }
        ],
        "buy": [],
        "lease": [],
    }
    exporter = BillExporter(object(), output_dir=str(tmp_path))

    combined = exporter.export_csv(source, filename="combined.csv")
    split_files = exporter.export_excel_ready_csv(source)

    combined_text = Path(combined).read_text(encoding="utf-8-sig")
    split_text = "\n".join(Path(path).read_text(encoding="utf-8-sig") for path in split_files)
    assert "订单号" in combined_text
    assert "订单号" in split_text
    assert "order-1" in combined_text


def test_extract_field_keeps_zero_value():
    assert BillExporter._extract_field({"totalAmount": 0}, "totalAmount", "fallback") == 0
