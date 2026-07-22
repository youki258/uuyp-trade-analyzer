"""
悠悠有品 CS2 账单分析服务 — 无状态多会话服务器入口
用法:
  python app.py                  # 开发模式，端口 8765
  python app.py --port 8080      # 指定端口
  python app.py --host 127.0.0.1 # 指定监听地址
"""
import argparse
import logging
import sys
from pathlib import Path

BASE_DIR = Path(__file__).parent
STATIC_DIR = BASE_DIR / "static"
sys.path.insert(0, str(BASE_DIR))


def main():
    parser = argparse.ArgumentParser(description="UUYP 无状态分析服务")
    parser.add_argument("--port", type=int, default=8765, help="监听端口 (默认 8765)")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="监听地址 (默认 0.0.0.0)")
    args = parser.parse_args()

    from server.app import create_stateless_app

    app = create_stateless_app(STATIC_DIR)

    log = logging.getLogger("werkzeug")
    log.setLevel(logging.WARNING)

    print(f"[✓] 服务已启动: http://{args.host}:{args.port}/")
    app.run(host=args.host, port=args.port, debug=False)


if __name__ == "__main__":
    main()
