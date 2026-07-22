# 悠悠有品账单导出方法研究报告

## 执行摘要

悠悠有品（youpin898.com）目前**没有官方提供的账单/交易记录导出功能**，这是社区用户长期反映的痛点。对标竞品网易BUFF已支持网页端CSV导出，而悠悠有品至今未跟进。社区中已形成若干第三方工具和变通方案，覆盖从无技术门槛的微信小程序记账到需要一定技术能力的Python脚本/API调用等多个层次。本报告梳理了目前已知的全部方法，并给出分场景推荐。

---

## 一、官方现状

### 能做什么

悠悠有品 APP 内可以查看以下记录：

- **路径**：「我的」→「我的服务」→「我的账单」
- 可查看买入订单、卖出订单、租赁订单的历史明细
- 租赁订单进一步区分**租出**和**租入**两种类型，用户可在 APP 内切换筛选查看
- 每年年底会有限时活动性质的"年度账单"页面，展示年度总交易额等汇总数据
- 单个饰品详情页有"累积收益"字段（但用户反映数据不准确，见下文）

### 不能做什么

- **无法导出任何格式的账单文件**（CSV / Excel / PDF 均无）
- 网页端（youpin898.com）的交易记录接口未向用户开放
- APP 内统计数据的准确性受到用户质疑（贴吧帖子：「他这账单就压根经不起推敲」）

### 官方态度

2025年2月，贴吧有用户发帖《怎么导出悠悠有品的购买记录》并呼吁"官方你能不能把电脑版的网页做好点，开放一下购买记录的接口啥的？"——官方仅给该帖点赞，未做任何实质性承诺，功能至今未上线。

---

## 二、与同类平台的功能对比

| 平台 | 交易记录导出 | 说明 |
|------|-------------|------|
| **网易 BUFF** | ✅ 支持 | 网页端可直接导出 CSV，包含买入和卖出方向 |
| **悠悠有品（UUYP）** | ❌ 不支持 | 仅 APP 内查看，无导出功能，网页端接口未开放 |
| **C5GAME** | ⚠️ 有限 | 可查看记录，导出功能不明确 |
| **IGXE** | ⚠️ 有历史问题 | 据反映 2020 年前的交易记录已丢失，数据留存不稳定 |
| **Steam 官方** | ✅ 可查看 | 可查看库存交易历史，但无盈亏计算 |

> BUFF 账单导出操作：登录 BUFF 网页版 → 个人中心 → 交易记录 → 导出 CSV 文件。

---

## 三、第三方工具方案

### 方案一：CStra（本地记账工具）⭐ 推荐

**官网**：https://bfone177.github.io/CStra/

CStra 是专为 CS 玩家打造的**纯本地网页记账工具**，无需注册、无需登录、断网可用，所有数据存储在设备本地。

**核心特性：**
- 精准记录每笔买入/卖出（支持分批买入卖出）
- 统计所有交易的累计总收益
- **支持数据导出**（汇总来自 BUFF、悠悠有品等多平台的交易数据）
- 完全离线运行，数据安全无泄露风险

**适合场景：** 需要精细记录多批次交易、在意数据安全、不想依赖第三方账号的玩家。

**使用方式：** 打开网站，手动录入每笔交易数据（饰品名称、买入价格、卖出价格、日期、平台）。工具自动计算盈亏并支持导出汇总。

---

### 方案二：CS2 交易记录管理工具（浏览器插件）

**GitHub**：https://github.com/cs2trading/cs2-trade-manager

一个免费开源的浏览器插件（TypeScript + Vue），可自动调用悠悠有品等平台 API 同步交易数据。

**核心特性：**
- 支持平台：**悠悠有品、BUFF、C5GAME**
- 选择平台后一键"同步数据"，自动抓取交易记录
- 登录信息仅本地存储，代码开源可审计
- Chrome / Edge 均支持（开发者模式加载）

**安装方法：**
1. 访问 https://github.com/cs2trading/cs2-trade-manager/releases 下载最新版本（v1.0.6）
2. 解压后打开 Chrome/Edge，进入 `chrome://extensions/`
3. 开启"开发者模式" → 点击"加载已解压的扩展程序" → 选择解压目录
4. 点击插件图标，选择悠悠有品并启用，点击"同步数据"

**注意事项：**
- 该插件已于 2025 年 12 月从 Edge 官方商店下架，需手动安装
- 仅支持 Chromium 系浏览器（Chrome / Edge），不支持 Firefox
- 目前仅有盈亏管理功能，**不支持 CSV/Excel 格式导出**
- 最后一次代码更新为 2024 年 9 月，开发可能已停滞

**适合场景：** 想要快速查看悠悠有品盈亏情况、对数据导出需求不高的用户。

---

### 方案三：CS2Profit 收益统计系统（Python 本地部署）

**GitHub**：https://github.com/jinlHe/CS2Profit

一个本地运行的 Python + Flask Web 应用，支持多平台余额和交易数据统一管理。

**核心特性：**
- 支持平台：BUFF、悠悠有品、IGXE、C5
- 总投入/库存价值/总利润实时计算
- 多平台余额汇总，一键刷新
- BUFF 平台导出 CSV 后可直接导入分析
- **悠悠有品导入方式：对手机订单截图，使用 OCR 识别生成数据**（这是目前社区对悠悠无导出功能的最优变通方案之一）
- 本地运行，不上传任何用户数据

**安装方法：**
```bash
git clone https://github.com/jinlHe/CS2Profit.git
cd CS2Profit
pip install -r requirements.txt
python app.py
# 浏览器访问 http://127.0.0.1:5000
```

**适合场景：** 有一定 Python 基础、需要多平台统一盈亏面板的用户。

---

### 方案四：GoGo 饰品账单（微信小程序）

**查找方式：** 微信搜索"GoGo饰品账单"

由一位 CS 玩家开发的轻量记账小程序，开发动机与许多用户一样："经常忘记自己某个饰品何时买的又卖了多少钱是亏是赚，得去翻 buff 或者 uu"。

**核心特性：**
- 记录饰品买入时间、买入价、卖出价，自动计算盈亏
- 手机端操作，随时记录
- 完全手动输入，不需要接触 API 或技术工具

**适合场景：** 技术零门槛、偏好手机操作的轻量用户，习惯在每次完成交易后立即记录。

---

### 方案五：API 脚本方案（技术用户）

悠悠有品没有公开 API 文档，但开源社区通过对 APP 进行逆向分析，整理出了一套可用的非官方接口，最完整的实现见 **Steamauto** 项目（主要用于自动发货，但代码中包含交易记录相关接口）。

**主要可用接口（已知）：**

| 接口功能 | 端点 | 参数 |
|---------|------|------|
| 获取出售订单列表 | `POST /api/youpin/bff/trade/sale/v1/sell/list` | keys, orderStatus, pageIndex, pageSize |
| 获取购买订单列表 | `POST /api/youpin/bff/trade/sale/v1/buy/list` | keys, orderStatus, pageIndex, pageSize |
| 待发货订单列表 | `POST /api/youpin/bff/trade/todo/v1/orderTodo/list` | userId, pageIndex, pageSize |
| 批量订单详情查询 | `POST /api/youpin/bff/trade/v1/order/query/detail` | orderNo, userId |
| **获取租出订单列表** | `POST /api/youpin/bff/trade/v1/order/lease/out/list` | gameId(730), pageIndex, pageSize(50), sortType(0), keywords |
| 获取租赁已上架物品 | `POST /api/youpin/bff/new/commodity/v1/commodity/list/lease` | pageIndex, pageSize, whetherMerge |
| 获取零CD租赁已上架物品 | `POST /api/youpin/bff/new/commodity/v1/commodity/list/zeroCDLease` | pageIndex, pageSize, whetherMerge |
| 租赁上架 | `POST /api/commodity/Inventory/SellInventoryWithLeaseV2` | GameId, ItemInfos |
| 修改租赁价格 | `PUT /api/commodity/Commodity/PriceChangeWithLeaseV2` | Commoditys |
| 可开启零CD转租的订单 | `POST /api/youpin/bff/trade/v1/order/lease/sublet/canEnable/list` | pageIndex, pageSize |

> 以上接口来源于 Steamauto 源码（2026年3月 v5.8.3），覆盖出售/购买/租赁上架/租出订单等场景。

**认证方式：** 密码/短信登录后获取 Bearer Token，后续请求携带：
```
Authorization: Bearer {Token}
Content-Type: application/json; charset=utf-8
User-Agent: okhttp/3.14.9
apptype: 4
```

**账单数据的局限性：** 目前公开代码中**没有专用的账单明细或余额流水 API**，只能通过分页遍历出售/购买订单列表来拼接账单数据。财务流水（余额变动、提现记录等）需要用 Fiddler/Charles/mitmproxy 对 APP 进行抓包，分析"我的账单"页面的实际请求后才能获取。

**租赁数据的特殊情况：** 租赁是悠悠有品区别于 BUFF 等纯交易平台的重要功能，在 APP "我的账单"中可以看到租赁记录，并区分"租出"和"租入"两种类型。但在 API 层面存在不对称：

- **租出订单（已确认）**：接口路径为 `/api/youpin/bff/trade/v1/order/lease/out/list`，在 Steamauto 源码中有完整实现，参数为 `gameId=730, pageIndex, pageSize, sortType, keywords`，可正常抓取。
- **租入订单（未确认）**：在 Steamauto、cs2-trade-manager、AutoUU 等所有已知开源项目中**均未实现租入订单的获取接口**。按照 API 命名规律推测可能为 `/api/youpin/bff/trade/v1/order/lease/in/list`，但实际调用可能返回错误。获取租入订单数据需要通过 APP 抓包确认实际接口路径。

**获取租入订单接口的抓包方法：**
1. 安装 Fiddler / Charles / mitmproxy 等抓包工具
2. 手机配置代理，安装并信任抓包工具的 CA 证书
3. 打开悠悠有品 APP →「我的」→「我的服务」→「我的账单」
4. 切换到「租赁」标签页，选择「租入」筛选
5. 在抓包工具中找到对应的 API 请求，记录完整的 URL 路径和参数格式

**相关开源项目：**
- [Steamauto/Steamauto](https://github.com/Steamauto/Steamauto)：活跃维护（2026年3月 v5.8.3），包含最完整的悠悠有品 API 实现
- [jiajiaxd/uuyoupinapi](https://github.com/jiajiaxd/uuyoupinapi)：已归档，功能已并入 Steamauto
- [854771076/Probe-CS2Spider（Gitee: sixsixsix8/UUYP）](https://gitee.com/sixsixsix8/UUYP)：基于 Scrapy 的爬虫，含悠悠有品，仅供学习

> ⚠️ **风险提示**：调用非官方 API 可能触发悠悠有品风控导致账号被限制；Token 一旦泄露等同于账号被盗；接口随时可能失效。请在充分评估风险后谨慎使用，且务必遵守平台服务条款。

---

## 四、各方案对比总结

| 方案 | 技术门槛 | 自动化程度 | 支持导出 | 数据准确性 | 安全性 |
|------|---------|-----------|---------|-----------|--------|
| CStra（手动记账） | ⭐ 极低 | 手动 | ✅ 支持 | 高（用户自控） | ⭐⭐⭐ 最高 |
| GoGo 饰品账单（微信） | ⭐ 极低 | 手动 | ❓ 不明 | 高（用户自控） | ⭐⭐⭐ 高 |
| CS2 Trade Manager（插件） | ⭐⭐ 低 | 自动同步 | ❌ 不支持 | 中（依赖接口） | ⭐⭐ 中 |
| CS2Profit（Python） | ⭐⭐⭐ 中 | 半自动 | ✅ 支持 | 中（OCR 识别悠悠） | ⭐⭐⭐ 高（本地） |
| 手动 Excel | ⭐ 极低 | 手动 | ✅ 支持 | 高（用户自控） | ⭐⭐⭐ 最高 |
| API 脚本 | ⭐⭐⭐⭐⭐ 高 | 全自动 | ✅ 可编程 | 中（仅订单数据） | ⭐ 低（有封号风险） |

---

## 五、分场景推荐

**普通玩家（追求简便）：** 推荐使用 **CStra** 记账工具或 **GoGo 饰品账单** 微信小程序。每次完成一笔交易后立刻录入，习惯养成后几乎没有额外负担，还能一目了然地看到跨平台的总盈亏。

**同时使用 BUFF 的玩家：** 先在 BUFF 网页端定期导出 CSV 交易记录，再手动补充悠悠有品的数据（从 APP 截图或查询记录中抄录），然后在 Excel 中整合计算。这是目前最接近"完整账单导出"的低技术方案。

**有 Python 基础的用户：** 部署 **CS2Profit**，利用 BUFF CSV 导入 + 悠悠有品截图 OCR 识别，获得统一的可视化盈亏面板，覆盖多平台余额管理。

**开发者/重度玩家：** 参考 **Steamauto** 项目中的 uuyoupinapi 模块代码，调用 `/buy/list` 和 `/sell/list` 接口分页获取历史订单，自行编写脚本生成账单。如需财务流水数据，需结合抓包工具（Fiddler/mitmproxy）分析 APP 网络请求。

---

## 六、结论

悠悠有品账单导出的核心问题在于**官方功能缺失**。与 BUFF 的明显功能差距使得社区呼声持续，但官方至今未给出改进时间表。目前最适合普通用户的方案是 **CStra 本地记账工具**（操作简单、安全可靠、支持导出）或 **GoGo 饰品账单**微信小程序；有一定技术能力的用户可选择 CS2Profit 或 API 脚本方案。期待悠悠有品官方早日上线网页端交易记录导出功能。

---

## 参考资料

1. [悠悠可以导出交易记录吗 - 悠悠有品吧 百度贴吧](https://tieba.baidu.com/p/9692796082)
2. [怎么导出悠悠有品的购买记录 - 悠悠有品吧 百度贴吧](https://tieba.baidu.com/p/9497259464)
3. [悠悠有品账单统计方式遭质疑 - 百度贴吧](https://tieba.baidu.com/p/9041445048)
4. [开发了个小程序，用来记录饰品收益（GoGo饰品账单）- 百度贴吧](https://tieba.baidu.com/p/9017894241)
5. [CStra - CSGO饰品交易记录工具](https://bfone177.github.io/CStra/)
6. [GitHub - cs2trading/cs2-trade-manager](https://github.com/cs2trading/cs2-trade-manager)
7. [GitHub - jinlHe/CS2Profit：个人的CS2收益统计系统](https://github.com/jinlHe/CS2Profit)
8. [GitHub - Steamauto/Steamauto：全自动收发货解决方案](https://github.com/Steamauto/Steamauto)
9. [AutoUU--有品租赁自动上架工具--API篇 - CSDN](https://blog.csdn.net/weixin_43543078/article/details/130890852)
10. [GitHub - jiajiaxd/uuyoupinapi：悠悠有品的登录、发货API](https://github.com/jiajiaxd/uuyoupinapi)
11. [Gitee - sixsixsix8/UUYP：基于Scrapy的CS2饰品平台爬虫](https://gitee.com/sixsixsix8/UUYP)
12. [悠悠有品我的账单在哪里看 - 百度知道](https://zhidao.baidu.com/question/1869615980576780747.html)
13. [网易BUFF、C5game、悠悠有品、IGXE等4大平台对比 - 知乎](https://zhuanlan.zhihu.com/p/623136187)
14. [SteamTradingSiteTracker批量导出功能 - GitCode](https://blog.gitcode.com/6f59b4c20daa4f4503485d5b14335ed1.html)
15. [悠悠有品饰品交易平台官网](https://www.youpin898.com/)
16. [AutoUU--有品租赁自动上架工具（程序篇）- CSDN](https://blog.csdn.net/weixin_43543078/article/details/130891032)
17. [GitHub - worldofgoo9/AutoUU：有品租赁自动上架的轻量化工具](https://github.com/worldofgoo9/AutoUU)
18. [Steamauto租赁上架终极指南 - CSDN](https://blog.csdn.net/gitblog_07796/article/details/148969231)
