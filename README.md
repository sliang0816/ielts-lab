# IELTS Learning Lab V3.1

基于剑桥雅思真题的个人阅读练习平台，支持结构化原文、折叠译文、计时、自动批改、逐题解析、DeepSeek 词汇查询及 GitHub 学习记录同步。

当前重点是 Cambridge IELTS 13 Test 1 Passage 1。剑桥 13 共 12 篇结构化文章，首篇有完整的中文译文和逐题解析。

```powershell
python -m http.server 8080 --bind 127.0.0.1
```

在浏览器打开 <http://127.0.0.1:8080/>。macOS 上可使用 `python3`。项目结构、教材进度和验证记录见 [PROJECT.md](PROJECT.md)。

GitHub 同步使用公开的 `data/state.json`。DeepSeek API Key 和 GitHub Token 仅保存在当前浏览器的内存或所选的本机存储内。

[在线学习入口](https://sliang0816.github.io/ielts-lab/)
