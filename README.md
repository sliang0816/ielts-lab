# IELTS Learning Lab V3.1

基于剑桥雅思真题的个人阅读练习平台，支持结构化原文、折叠译文、计时、自动批改、逐题解析、DeepSeek 词汇查询及 GitHub 学习记录同步。

当前重点是 Cambridge IELTS 13 Test 1 Passage 1。剑桥 13 共 12 篇结构化文章，首篇有完整的中文译文和逐题解析。

```powershell
python -m http.server 8080 --bind 127.0.0.1
```

在浏览器打开 <http://127.0.0.1:8080/>。macOS 上可使用 `python3`。项目结构、教材进度和验证记录见 [PROJECT.md](PROJECT.md)。

学习数据自动同步到私有仓库 `sliang0816/ielts-lab-study`。每台电脑首次打开 **Settings** 时，填入仅拥有该仓库 **Contents: Read and write** 权限的 GitHub Token，勾选 **Remember token on this device**。此后打开网页即可接续学习。同一枚有效 Token 可用于两台可信电脑。DeepSeek API Key 和 GitHub Token 保存在浏览器内存或本机存储中。

英文界面保留中文译文、释义和解析。阅读工具可调整正文字号。选中原文、题干、选项或解析中的英语可以查词和收藏。**Vocabulary** 支持搜索、每页 20 条、闪卡和手打拼写复习。

[在线学习入口](https://sliang0816.github.io/ielts-lab/)
