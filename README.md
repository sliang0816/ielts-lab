# IELTS Lab

个人雅思学习平台，单仓库架构。网页入口为 index.html，可使用 GitHub Pages 从 main 分支根目录部署。

## 使用方法

导入本地合法持有的 PDF，选择册数、Test 和 Passage，录入官方答案后练习。学习数据保存在浏览器，可导出备份。GitHub 同步使用 data/state.enc.json，AES-GCM 加密，跨设备使用相同口令。访问令牌仅在当前页面内存中使用，不提交仓库。

## 部署

Settings → Pages → Deploy from a branch → main / (root) → Save。

## AI

通过复制学习请求到 ChatGPT 并将分析粘贴回网页使用现有订阅；不直接调用 ChatGPT 订阅额度。PDF 题目和官方答案暂需人工录入。
