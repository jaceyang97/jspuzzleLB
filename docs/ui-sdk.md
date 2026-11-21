# 这个项目怎样使用 UI SDK

榜单使用 React 19 和 Vite。UI SDK 管理控件的状态变化、键盘导航、焦点恢复以及 ARIA 属性。排名计算、选手 URL、图表数据和动画仍由原有模块管理。组件直接从各自的入口导入，例如 `@ui-sdk/react/tabs`。

| 在哪里 | SDK 负责什么 | 项目负责什么 |
| --- | --- | --- |
| [榜单](../src/features/leaderboard/page/LeaderboardPage.jsx) | `Tabs` 将每个标签与对应面板关联，方向键、Home 和 End 切换榜单。`TabsIndicator` 提供选中位置 | 根据选中的榜单过滤数据并渲染可见行，保留并列名次和选手档案入口 |
| [搜索](../src/features/leaderboard/page/SolverSearch.jsx) | `Combobox` 支持输入、上下键选人和回车打开档案，`useShortcut` 注册斜杠快捷键 | 榜单按当前标签筛选，候选人从总榜中选取。搜索框为空时可以打开此设备上收藏的档案 |
| [选手档案](../src/features/leaderboard/page/shared.jsx) | `Toggle` 配合 `createLocalStorage` 记住一位选手，`Select` 筛选年份，`Pagination` 管理翻页，`Dialog` 管理焦点 | 打开档案时同步浏览器历史。年份和分页只影响题目列表，名次和解题总数始终取自总榜 |
| [题目公告](../src/features/leaderboard/components/NewSolversBanner.tsx)和[提示](../src/components/Tooltip.tsx) | 核心库的 `bindLayer` 将自定义浮层加入与模态框共用的关闭顺序 | 继续按姓名的实际宽度排布标签，按视口调整位置，处理触摸和悬停。打开档案内的提示后，第一次 Escape 收起提示，第二次关闭档案 |
| [研究图表](../src/features/rising-stars/ParetoChart.tsx) | `SegmentedControl` 切换横轴，`Checkbox` 筛选规则，`stepFromKey` 和 `stepBy` 支持逐点或分页浏览 | 根据指针的二维位置寻找最近数据点，并展示对应规则的指标 |
| [反馈表单](../src/features/leaderboard/page/ProjectInfoCard.jsx) | `Textarea` 的 `onValueChange` 同步草稿，提交按钮反映发送状态 | 服务端接受反馈后才清空草稿；失败保留原文，重试沿用原接口 |

## 扩展控件

先查已安装版本的 `node_modules/@ui-sdk/react/docs/llms.txt`，再读对应控件的组件页。多个部件共享一个根组件，例如一组 `TabsTab` 和 `TabsPanel` 需要相同的 `value`。搜索框的 `onQueryChange` 更新榜内过滤条件，`onValueChange` 打开选中的档案。

需要复用项目现有的几何计算或视觉效果时，可以只引入核心行为。例如图表保留最邻近点算法，只把按键转换为步长交给 SDK。新建自定义组件前，按标题搜索 `docs/core.md` 中的行为，再读同目录的 `rendering.md` 了解如何把这些行为渲染成 React 部件。

## 浏览器代理和验证

在提供 WebMCP 的浏览器中，应用注册 SDK 的快照、查询和操作工具。代理可以按可访问名称找到榜单或搜索框，并使用与读者相同的控件。发送反馈需要读者亲自操作。[代理回归测试](../src/features/leaderboard/page/__tests__/RankingAgent.test.tsx)从快照中找到 Rising stars 和搜索框，再检查页面是否同步更新。

运行 `npm test -- --runInBand` 检查行为，运行 `npm run build` 完成类型检查和生产构建。真实浏览器还应验证浮层的层叠、关闭后焦点的位置、手机布局、滚动窗口以及减少动态效果的偏好。
