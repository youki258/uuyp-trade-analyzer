"""
悠悠有品 CS2 账单分析服务 — 无状态多会话服务器入口

开发模式:
  python app.py                  # 端口 8765
  python app.py --port 8080      # 指定端口

生产模式 (gunicorn):
  gunicorn -w 4 -b 0.0.0.0:8765 --timeout 300 app:app
"""
import argparse
import logging
import sys
from pathlib import Path

BASE_DIR = Path(__file__).parent
STATIC_DIR = BASE_DIR / "static"
sys.path.insert(0, str(BASE_DIR))

from server.app import create_stateless_app

# 模块级 app 对象，供 gunicorn 导入
app = create_stateless_app(STATIC_DIR)


def main():
    parser = argparse.ArgumentParser(description="UUYP 无状态分析服务")
    parser.add_argument("--port", type=int, default=8765, help="监听端口 (默认 8765)")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="监听地址 (默认 0.0.0.0)")
    args = parser.parse_args()

    log = logging.getLogger("werkzeug")
    log.setLevel(logging.WARNING)

    print(f"[OK] 开发服务器启动: http://{args.host}:{args.port}/")
    app.run(host=args.host, port=args.port, debug=False)


if __name__ == "__main__":
    main()
