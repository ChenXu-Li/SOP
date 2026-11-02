# 对公业务 SOP 知识库

面向银行对公客户经理的流程与要点知识库。PC 与移动端通用，纯静态、无依赖、可离线使用。

## 使用方式

**直接打开**：双击 `index.html` 即可在浏览器中使用（推荐 Chrome / Edge / Safari 新版）。

**本地服务（推荐，搜索与剪贴板功能更完整）**：

```bash
cd kb
python3 -m http.server 8000
# 浏览器访问 http://localhost:8000
```

**部署**：把整个 `kb` 目录上传到任意静态托管（Nginx、对象存储、内网 GitLab Pages 均可），无需后端。

## 功能

| 模块 | 说明 |
|---|---|
| 业务地图 | 获客 → 开户 → 授信 → 放款 → 贷后 → 结算，六阶段串联全部 SOP |
| SOP 总库 | 支持按业务模块筛选，卡片显示风险等级、耗时、步骤数、材料数 |
| SOP 详情 | 适用场景 / 前置条件 / 办理步骤 / 材料清单 / 关键要点 / 风险提示 / FAQ / 术语 |
| 材料清单 | 按流程归集所有材料，可勾选、可一键复制发给客户或同事 |
| 速查卡 | 时限、测算口径、系统路径、合规红线、沟通话术、上报自查 8 问 |
| 新人 30 天 | 四周学习路径，每周有目标、有任务，可打勾记录 |
| 全站搜索 | 覆盖步骤、材料、风险、FAQ、术语，支持键盘 `/` 唤起 |
| 进度记录 | 步骤打勾、材料勾选、学习任务均保存在本机浏览器（localStorage） |
| 深浅色 | 跟随系统，可手动切换 |

## 内容维护

所有内容集中在 `data.js`，按对象增删即可，无需改动页面代码。

### 新增一条 SOP

在 `SOPS` 数组中追加一个对象：

```js
{
  id: 'sop-xxx',            // 唯一标识，用于路由 #/sop/sop-xxx
  code: 'SOP-XX-01',        // 业务编号
  title: '流程名称',
  module: 'acct',           // 见 MODULES 中的 id
  stage: 'open',            // 见 STAGES 中的 id
  risk: '高',               // 高 / 中 / 低
  role: '主办岗位',
  dur: '1–2 个工作日',
  updated: '2026-11-01',
  tags: ['关键词1', '关键词2'],
  hot: true,                // 是否在首页"高频必看"展示（可选）
  scene: '适用场景描述',
  pre: ['前置条件1', '前置条件2'],
  steps: [
    {
      name: '步骤名称',
      owner: '责任岗位',
      sys: '涉及系统',
      time: '时点',
      action: '具体动作',
      tip: '关键要点',
      trap: '常见错误'
    }
  ],
  materials: [{ name: '材料名称', note: '备注' }],
  keys: ['关键要点1'],
  risks: [{ level: '高', text: '风险描述' }],
  faq: [{ q: '问题', a: '答案' }],
  terms: [{ t: '术语', d: '解释' }]
}
```

### 其他内容

- `MODULES`：业务模块（决定 SOP 库的筛选标签）
- `STAGES`：流程阶段（决定业务地图的分段）
- `CARDS`：速查卡内容
- `ONBOARD`：新人学习路径
- `GLOSSARY`：术语表（同时参与全站搜索）

### 图标

模块图标使用内置矢量图标集，`icon` 可取值：
`users` `bank` `search` `file` `coins` `chart` `receipt` `shield` `globe` `card` `map` `book` `list` `bolt` `target`

内置业务模块：获客营销（lead）、开户结算（account）、授信审批（credit）、放款支用（draw）、贷后管理（post）、票据保函（paper）、跨境金融（cross）、普惠科创产品（psci）、内部流程实操（ops）。

如需新增图标，在 `app.js` 的 `MI` 对象中补充对应 SVG path。

## 文件结构

```
kb/
├── index.html   页面骨架
├── style.css    样式（PC 三栏 / 平板抽屉 / 手机单列 + 底部 Tab）
├── app.js       路由、渲染、搜索、进度记录
├── data.js      全部内容
└── README.md
```

## 说明

内容为流程参考与学习材料示例，具体业务办理须以监管规定、总行制度及最新文件为准。
