This is a [Plasmo extension](https://docs.plasmo.com/) project bootstrapped with [`plasmo init`](https://www.npmjs.com/package/plasmo).

## Getting Started

First, run the development server:

```bash
pnpm dev
# or
npm run dev
```

Open your browser and load the appropriate development build. For example, if you are developing for the chrome browser, using manifest v3, use: `build/chrome-mv3-dev`.

You can start editing the popup by modifying `popup.tsx`. It should auto-update as you make changes. To add an options page, simply add a `options.tsx` file to the root of the project, with a react component default exported. Likewise to add a content page, add a `content.ts` file to the root of the project, importing some module and do some logic, then reload the extension on your browser.

For further guidance, [visit our Documentation](https://docs.plasmo.com/)

## StagehandXPath Tab Page（生成可交互元素 XPath）

本项目新增了一个 Tab Page，用于对**当前活动标签页**扫描可交互元素，并生成 stagehand 风格的绝对 XPath（每段带 `[n]`）。

- 打开方式：Tab Pages 会生成如下地址（参考 [Plasmo Tab Pages](https://docs.plasmo.com/framework/tab-pages)）
  - `chrome-extension://<extension-id>/tabs/stagehand-xpath.html`
- 使用方式：
  - 在任意网页打开后，进入该 Tab Page
  - 在 JSON 配置中填写参数并点击 `Scan + Build XPath`
  - 结果会以 JSON 形式展示（包含 `xpath/tagName/id/className/textSnippet`）
- 协议说明：
  - `docs/StagehandXPath-协议说明.md`

### 配置参数

- `maxItems`: 最大返回条数（默认 200）
- `selector`: 用于选取“可交互元素”的 `querySelectorAll` 选择器（默认包含 `a,button,input,textarea,select,[role='button'],[onclick]`）
- `includeShadow`: 是否遍历 open shadowRoot（默认 false）

## Making production build

Run the following:

```bash
pnpm build
# or
npm run build
```

This should create a production bundle for your extension, ready to be zipped and published to the stores.

## Submit to the webstores

The easiest way to deploy your Plasmo extension is to use the built-in [bpp](https://bpp.browser.market) GitHub action. Prior to using this action however, make sure to build your extension and upload the first version to the store to establish the basic credentials. Then, simply follow [this setup instruction](https://docs.plasmo.com/framework/workflows/submit) and you should be on your way for automated submission!
