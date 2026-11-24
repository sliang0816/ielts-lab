# IELTS Lab V2.1

在线入口：https://sliang0816.github.io/ielts-lab/

- 导入合法持有的本地 PDF，或使用有权访问的 HTTPS PDF 链接。PDF.js 可提取指定页的文字；扫描版需另行 OCR，远程链接需支持 CORS。
- 按册数、Test、Passage 记录页码，录入官方答案或使用 AI 从官方答案文字中辅助提取；人工核对后保存。
- 支持计时、答题、评分、错题、精读、生词间隔复习和学习统计。
- GitHub 同步使用公开的 data/state.json，令牌只保留在当前页面内存中。原文及 PDF 不自动上传。不要提交未经授权的教材、密钥或敏感信息。
- AI 可使用 ChatGPT 手动模式，或配置 OpenAI 兼容 HTTPS API、模型和 API Key。调用前确认内容发送及费用；浏览器 CORS 可能限制调用。ChatGPT Plus 不等于 API 配额。
- 目前需手动指定 PDF 页码和答案，尚未完成整册自动索引及全部题型评分；听力、写作、口语模块尚未实现。浏览器端联调待完成。
