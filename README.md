# v2ex-tx2json (Node)

将 V2EX 的交易页面（tx）解析为 JSON。该包为 Node.js 版本，功能源自 Python 实现。

## 安装

使用 npm:

```bash
npm install v2ex-tx2json
```

（本地开发安装：在本目录运行 `npm install`）

## 快速开始

```js
const { TX2JSON } = require('v2ex-tx2json');

const client = new TX2JSON('https://v2ex.com', process.env.V2EX_COOKIE);
client.parse('交易哈希或tx字符串')
	.then(info => console.log(info))
	.catch(err => console.error(err));
```

另可直接使用库中的 `extractFieldsFromHtml(html)` 对已下载的 HTML 做解析（测试用途）。

## 测试

使用 Jest 运行测试：

```bash
npm test
```

## 发布到 npm

1. 更新 `package.json` 的 `version` 字段为新的语义化版本。
2. 确认 `README.md`, `LICENSE` 在包中存在。
3. 登录 npm：`npm login`
4. 发布：`npm publish --access public`（如果需要 public 包）
