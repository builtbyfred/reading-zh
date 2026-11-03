---
title: "上下文检索"
title_en: "Contextual Retrieval"
description: "在嵌入和 BM25 之前给每个片段补上文档上下文，使前 20 个片段的检索失败率从 5.7% 降到 2.9%，加上重排序再降到 1.9%。"
source: "Anthropic"
source_url: "https://www.anthropic.com/research/contextual-retrieval"
date: 2024-09-19
status: "译文"
tags:
  - "检索"
---

# 上下文检索

**非官方译文。** 官方原文：[Contextual Retrieval](https://www.anthropic.com/research/contextual-retrieval)（Anthropic · Research）。

## 导读

传统 RAG 把文档切成片段再嵌入，片段里往往不再写明它属于哪篇文档、哪个主体，该召回的内容会取不回来。这篇在嵌入和建立 BM25 索引之前，用 Claude 给每个片段补上通常 50–100 token 的说明，并用提示缓存（prompt caching）把这笔一次性成本算到每百万文档 token 1.02 美元。在 Gemini Text 004、取前 20 个片段时，失败率从 5.7% 降到 2.9%（降 49%），再加上重排序降到 1.9%（降 67%）。适合已经在做知识库检索、想按原文看切分、提示、成本和评测数字的人。原文发表于 2024 年 9 月 19 日。

## 译文

原文页的标题是 Introducing Contextual Retrieval。页上标注发表于 2024 年 9 月 19 日，团队为 Engineering。主题包括上下文工程、Claude Developer Platform 和基准测试。

模型要在具体场景里有用，常常需要背景知识。例如，客服聊天机器人需要它所服务的那家企业的知识，法律分析机器人需要了解大量既往案例。

开发者通常用检索增强生成（Retrieval-Augmented Generation，RAG）来扩充模型的知识。RAG 从知识库取出相关信息，接到用户提示后面，从而明显改善模型的回答。问题在于，传统 RAG 在编码信息时会丢掉上下文，系统因此常常从知识库里取不回真正相关的内容。

本文给出一种大幅改进 RAG 检索这一步的方法，叫做上下文检索（Contextual Retrieval）。它包含两项子技术：上下文嵌入（Contextual Embeddings）和上下文 BM25（Contextual BM25）。这种方法可以把检索失败的次数减少 49%；再配合重排序（reranking），可以减少 67%。这是检索准确率上的显著提升，会直接变成下游任务更好的表现。

用 Claude 部署自己的上下文检索，可以从他们的 [cookbook](https://platform.claude.com/cookbook/capabilities-contextual-embeddings-guide) 开始。

### 关于直接用更长提示的说明

有时最简单的办法最好。如果知识库小于 200,000 token（大约 500 页材料），可以把整份知识库放进给模型的提示里，不必用 RAG 或类似方法。

几周前他们为 Claude 发布了提示缓存。开发者可以在多次 API 调用之间缓存常用提示，延迟降低超过 2 倍，成本最多降低 90%。做法见[提示缓存文档](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)和[提示缓存 cookbook](https://platform.claude.com/cookbook/misc-prompt-caching)。

知识库再变大，就需要更能扩展的办法。上下文检索要解决的就是这件事。

### RAG 入门：扩展到更大的知识库

知识库大到放不进上下文窗口时，通常用 RAG。RAG 按下面的步骤预处理知识库：

1. 把知识库（文档的语料库，corpus）拆成更小的文本片段（chunk），通常不超过几百 token；
2. 用嵌入模型把这些片段变成编码语义的向量嵌入（embedding）；
3. 把这些嵌入存进可以按语义相似度搜索的向量数据库。

运行时，用户向模型提出查询，向量数据库按与查询的语义相似度找出最相关的片段，再把最相关的片段加进送给生成模型的提示。

嵌入模型擅长抓住语义关系，却可能错过关键的精确匹配。好在有一种更老的技术可以在这些情形下帮忙。BM25（Best Matching 25）是一种用词汇匹配寻找精确词或短语的排序函数。它对包含唯一标识符或技术术语的查询特别有效。

BM25 建立在 TF-IDF（词频–逆文档频率，Term Frequency-Inverse Document Frequency）这一概念之上。TF-IDF 衡量一个词对集合中某篇文档有多重要。BM25 在此之上考虑文档长度，并对词频使用饱和函数，避免常见词主导结果。

BM25 能在语义嵌入失败的地方成功，情形是这样的：用户在技术支持数据库里查询 “Error code TS-999”。嵌入模型可能找到泛泛讲错误码的内容，却漏掉精确的 “TS-999”。BM25 会寻找这个具体的文本字符串，从而定位相关文档。

把嵌入和 BM25 合在一起，RAG 可以更准确地取回最适用的片段。步骤如下：

1. 把知识库（文档的语料库）拆成更小的文本片段，通常不超过几百 token；
2. 为这些片段建立 TF-IDF 编码和语义嵌入；
3. 用 BM25 按精确匹配找出靠前的片段；
4. 用嵌入按语义相似度找出靠前的片段；
5. 用排序融合（rank fusion）把第 3 步和第 4 步的结果合并并去重；
6. 把前 K 个片段（top-K）加进提示，生成回答。

同时利用 BM25 和嵌入模型，传统 RAG 可以在精确的词匹配和更广的语义理解之间取得平衡，给出更全面、更准确的结果。

图：同时使用嵌入和 BM25（Best Match 25）的标准 RAG。TF-IDF 衡量词的重要性，也是 BM25 的基础。原图：<https://www-cdn.anthropic.com/images/4zrzovbb/website/45603646e979c62349ce27744a940abf30200d57-3840x2160.png>

这种做法可以把成本可控地扩展到极大的知识库，远超单条提示能装下的规模。但这些传统 RAG 系统有一个重要限制：它们常常毁掉上下文。

#### 传统 RAG 里的上下文困境

传统 RAG 通常把文档切成更小的片段，以便高效检索。很多应用里这样可行，但单个片段缺少足够上下文时就会出问题。

假设知识库里嵌着一批财务信息（例如美国证券交易委员会 SEC 的申报文件），收到的问题是：“ACME Corp 在 2023 年第二季度的收入增长是多少？”

相关片段里的文字可能是：“The company's revenue grew by 3% over the previous quarter.”（公司收入较上一季度增长了 3%。）可是这个片段本身没有写明指的是哪家公司、哪个时间段，因此既难检索到正确信息，也难把信息用好。

### 上下文检索

上下文检索解决这个问题的办法是：在嵌入之前，给每个片段前面加上只针对该片段的解释性上下文（这就是上下文嵌入），并在建立 BM25 索引时同样这样做（这就是上下文 BM25）。

回到 SEC 申报文件的例子。一个片段可以变成这样：

```plaintext
original_chunk = "The company's revenue grew by 3% over the previous quarter."

contextualized_chunk = "This chunk is from an SEC filing on ACME corp's performance in Q2 2023; the previous quarter's revenue was $314 million. The company's revenue grew by 3% over the previous quarter."
```

值得一提的是，过去已经有人提出过用上下文改进检索的其他做法。其中包括：给片段加上笼统的文档摘要（他们试验过，收益非常有限；见 [W02-0405](https://aclanthology.org/W02-0405.pdf)）、假设文档嵌入（hypothetical document embedding，见 [arXiv:2212.10496](https://arxiv.org/abs/2212.10496)），以及基于摘要的索引（他们评估过，表现偏低；见 [LlamaIndex 的说明](https://www.llamaindex.ai/blog/a-new-document-summary-index-for-llm-powered-qa-systems-9a32ece2f9ec)）。这些方法与本文提出的做法不同。

#### 实现上下文检索

手工给知识库里成千上万甚至上百万个片段做标注，工作量太大。为实现上下文检索，他们转向 Claude。他们写了一条提示，让模型利用整篇文档的上下文，给出简短、只针对该片段的说明，用来解释这个片段。下面是他们用来为每个片段生成上下文的 Claude 3 Haiku 提示：

```plaintext
<document> 
{{WHOLE_DOCUMENT}} 
</document> 
Here is the chunk we want to situate within the whole document 
<chunk> 
{{CHUNK_CONTENT}} 
</chunk> 
Please give a short succinct context to situate this chunk within the overall document for the purposes of improving search retrieval of the chunk. Answer only with the succinct context and nothing else. 
```

得到的上下文文本通常是 50–100 token，在嵌入该片段之前、以及建立 BM25 索引之前，加到片段前面。

实践中的预处理流程见原图。图注：上下文检索是一种提高检索准确率的预处理技术。原图：<https://www-cdn.anthropic.com/images/4zrzovbb/website/2496e7c6fedd7ffaa043895c23a4089638b0c21b-3840x2160.png>

要用上下文检索，可以从他们的 [cookbook](https://platform.claude.com/cookbook/capabilities-contextual-embeddings-guide) 开始。

#### 用提示缓存降低上下文检索的成本

上下文检索能在 Claude 上以很低的成本做成，靠的是上面提到的提示缓存。有了提示缓存，不必为每一个片段都把参考文档重新传进去。只要把文档载入缓存一次，之后引用已经缓存的内容即可。按片段 800 token、文档 8k token、上下文指令 50 token、每个片段的上下文 100 token 来算，生成带上下文片段的一次性成本是每百万文档 token 1.02 美元。

##### 方法

他们在多种知识领域（代码库、小说、ArXiv 论文、科学论文）、多种嵌入模型、检索策略和评估指标上做了实验。每个领域所用问答的若干示例放在附录 II。

下面几张图给出的是所有知识领域上的平均表现，使用表现最好的嵌入配置（Gemini Text 004），并检索前 20 个片段。评估指标是 1 减 recall@20，衡量的是相关文档没能被检索进前 20 个片段的比例。完整结果见附录。他们评估过的每一种嵌入来源组合，加上上下文之后表现都有提升。

##### 性能提升

实验表明：

- 上下文嵌入把前 20 个片段的检索失败率降低了 35%（5.7% → 3.7%）。
- 把上下文嵌入和上下文 BM25 合在一起，把前 20 个片段的检索失败率降低了 49%（5.7% → 2.9%）。

图注：上下文嵌入与上下文 BM25 合用，把前 20 个片段的检索失败率降低 49%。原图：<https://www-cdn.anthropic.com/images/4zrzovbb/website/7f8d739e491fe6b3ba0e6a9c74e4083d760b88c9-3840x2160.png>

##### 实现时要考虑的事

实现上下文检索时，有几件事要放在心上：

1. 片段边界：考虑怎样把文档切成片段。片段大小、片段边界和片段重叠都会影响检索表现。原文在这一句末尾有上标 1，当前页面没有给出对应注释正文，译文不补。
2. 嵌入模型：在他们测试过的所有嵌入模型上，上下文检索都提升了表现，有的模型受益更多。他们发现 [Gemini](https://ai.google.dev/gemini-api/docs/embeddings) 和 [Voyage](https://www.voyageai.com/) 的嵌入特别有效。
3. 定制的上下文化提示：他们给出的通用提示已经好用，但针对具体领域或用例再改写提示，结果可能更好。例如加进一份关键术语表，其中有些术语只在知识库的其他文档里定义过。
4. 片段数量：往上下文窗口里放进更多片段，更有机会把相关信息包括进去。不过信息更多也会干扰模型，所以这件事有限度。他们试过送入 5 个、10 个和 20 个片段，发现其中用 20 个表现最好（比较见附录），但仍值得在自己的用例上再做实验。

始终要跑评估（evals）：把带上下文的片段交给生成回答的那一步，并区分哪一部分是上下文、哪一部分是片段本身，回答生成可能会更好。

### 再用重排序把性能往上推

最后一步，可以把上下文检索和另一种技术合在一起，得到更大的性能提升。在传统 RAG 里，AI 系统搜索知识库，找出可能相关的信息片段。知识库很大时，这次初始检索常常返回很多片段——有时是几百个——相关性和重要性参差不齐。

重排序是一种常用的过滤技术，用来保证只有最相关的片段会传给模型。重排序能带来更好的回答，并降低成本和延迟，因为模型要处理的信息更少。关键步骤是：

1. 做初始检索，取出可能相关的靠前片段（他们用的是前 150 个）；
2. 把前 N 个片段连同用户的查询送进重排序模型；
3. 用重排序模型按每个片段与提示的相关性和重要性打分，再选出前 K 个片段（他们用的是前 20 个）；
4. 把前 K 个片段作为上下文送进模型，生成最终结果。

图注原文是 “Combine Contextual Retrieva and Reranking to maximize retrieval accuracy.”（Retrieva 少了一个字母）。意思是：把上下文检索和重排序结合起来，尽量提高检索准确率。原图：<https://www-cdn.anthropic.com/images/4zrzovbb/website/8f82c6175a64442ceff4334b54fac2ab3436a1d1-3840x2160.png>

#### 性能提升

市场上有多种重排序模型。他们的测试用的是 [Cohere 重排序器](https://cohere.com/rerank)。Voyage 也提供[重排序器](https://docs.voyageai.com/docs/reranker)，不过他们没有来得及测试。实验表明，在各个领域加上重排序这一步，会进一步优化检索。

具体来说，他们发现：经过重排序的上下文嵌入加上下文 BM25，把前 20 个片段的检索失败率降低了 67%（5.7% → 1.9%）。

图注：经过重排序的上下文嵌入与上下文 BM25，把前 20 个片段的检索失败率降低 67%。原图：<https://www-cdn.anthropic.com/images/4zrzovbb/website/93a70cfbb7cca35bb8d86ea0a23bdeeb699e8e58-3840x2160.png>

##### 成本与延迟

重排序有一件重要的事要考虑：对延迟和成本的影响，尤其是要重排序的片段很多的时候。因为重排序在运行时多了一步，它不可避免地增加少量延迟，即便重排序器是并行给所有片段打分。这里有一种内在的权衡：为了更好的表现而重排序更多片段，或者为了更低的延迟和成本而重排序更少的片段。他们建议在自己的具体用例上试验不同设置，找到合适的平衡。

### 结论

他们做了大量测试，比较上面所有技术的不同组合（嵌入模型、是否使用 BM25、是否使用上下文检索、是否使用重排序器，以及最终取回的 top-K 结果总数），并覆盖多种不同的数据集类型。他们的发现可以概括为：

1. 嵌入加 BM25，好于只用嵌入；
2. 在他们测试过的嵌入里，Voyage 和 Gemini 最好；
3. 把前 20 个片段传给模型，比只传前 10 个或前 5 个更有效；
4. 给片段加上上下文，会大幅提高检索准确率；
5. 有重排序，好于没有重排序；
6. 这些好处可以叠在一起：要把性能提升拉到最大，可以把来自 Voyage 或 Gemini 的上下文嵌入，与上下文 BM25、加上重排序这一步，以及把 20 个片段加进提示，合在一起使用。

他们鼓励所有在做知识库的开发者用 cookbook 试验这些做法，把表现推到新的水平。

### 附录 I

下面按数据集、嵌入提供方、是否在嵌入之外再使用 BM25、是否使用上下文检索、是否使用重排序，分解 Retrievals @ 20 的结果。

Retrievals @ 10 和 @ 5 的分解，以及每个数据集的问答示例，见附录 II。

图注：各数据集与各嵌入提供方的 1 − recall@20 结果。原图是柱状图，正文没有逐柱的数值表。原图：<https://www-cdn.anthropic.com/images/4zrzovbb/website/646a894ec4e6120cade9951a362f685cd2ec89b2-2458x2983.png>

图中六组系列（按原图图例）是：Embedding、Embedding + BM25、Reranked Embedding + BM25、Contextual Embedding、Contextual Embedding + cBM25、Reranked Contextual Embedding + cBM25。横轴的嵌入提供方是 Voyage-2、Voyage Large-2、Cohere Multilingual v3.0、Cohere English v3.0、Gemini 001、Gemini Text 004。分面数据集是 Codebases、Codebases-Vague、Fiction、ArXiv Papers、Science Papers。纵轴是前 20 个结果中的检索失败百分比。逐柱读数以原图为准，这里不抄写。

### 附录 II

附录 II 是单独的 PDF：<https://assets.anthropic.com/m/1632cded0a125333/original/Contextual-Retrieval-Appendix-2.pdf>。它给出跨数据集、嵌入提供方、top-K 的选择、是否在嵌入之外使用 BM25、是否使用上下文检索、是否使用重排序的结果分解。

PDF 第 2 页是 1 − recall@20（与附录 I 同一类图），第 3 页是 1 − recall@10，第 4 页是 1 − recall@5，第 5 页是 NDCG。图例与附录 I 相同，纵轴分别是对应的失败百分比或 NDCG。这些页是图，不是可复制的数值表，逐柱数字不在这里重抄。第 5 页在 NDCG 图之后接上标题 “Example Question & Answers from Evaluation Sets”。下面按 PDF 译出各评测集的示例问题、答案和上下文说明。代码和 LaTeX 保持原文。

#### 代码库

问题：如果没有提供 layout，`BasicConfigurator` 使用的默认 layout 是什么？

答案：如果没有把 layout 传给 `BasicConfigurator::configure(const LayoutPtr& layoutArg)`，它会默认使用一个 `PatternLayout`，转换模式是 `"%r [%t] %p %c %x - %m%n"`。这由代码里的静态常量 `TTCC_CONVERSION_PATTERN` 定义：

```cpp
static const helpers::WideLife<LogString>
TTCC_CONVERSION_PATTERN(LOG4CXX_STR("%r [%t] %p %c %x - %m%n"));
```

黄金片段：

```cpp
void BasicConfigurator::configure(const LayoutPtr& layoutArg)
{
LogManager::getLoggerRepository()->setConfigured(true);
auto layout = layoutArg;
if (!layout)
{
static const helpers::WideLife<LogString>
TTCC_CONVERSION_PATTERN(LOG4CXX_STR("%r [%t] %p %c %x - %m%n"));
layout = std::make_shared<PatternLayout>(TTCC_CONVERSION_PATTERN);
}
auto appender = std::make_shared<ConsoleAppender>(layout);
Logger::getRootLogger()->addAppender(appender);
}
void BasicConfigurator::configure(const AppenderPtr& appender)
{
LoggerPtr root = Logger::getRootLogger();
root->addAppender(appender);
}
void BasicConfigurator::resetConfiguration()
{
LogManager::resetConfiguration();
}
```

上下文：这段代码是 `BasicConfigurator` 类实现的一部分，该类属于 C++ 的 Log4cxx 日志库。`BasicConfigurator` 提供一种简单方式来配置日志系统，包括为根 logger 设置 layout 和 appender。这段代码里的 `configure()` 方法负责做这项配置，`resetConfiguration()` 方法用来把日志配置重置为默认状态。

#### 带模糊问题的代码库

问题：怎样生成一个 IPv4 地址的 vector？

答案：可以用 `MakeIPv4s()` 生成一个 IPv4 地址的 vector。例如：

```cpp
std::vector<in_addr> ipv4s = MakeIPv4s();
```

这个函数返回一个带有预定义 IPv4 地址的 vector：

```cpp
std::vector<in_addr> MakeIPv4s() {
return {
MakeIPv4(0x12345678), // 255.255.255.255
MakeIPv4(0x0100007f), // 127.0.0.1
MakeIPv4(3585395774),
MakeIPv4(0),
MakeIPv4(0x12345678),
};
}
```

这些 IPv4 地址用 `MakeIPv4` 创建，该函数的输入是一个无符号 32 位整数。

黄金片段：

```cpp
std::vector<in_addr> MakeIPv4s() {
return {
MakeIPv4(0x12345678), // 255.255.255.255
MakeIPv4(0x0100007f), // 127.0.0.1
MakeIPv4(3585395774),
MakeIPv4(0),
MakeIPv4(0x12345678),
};
}

std::vector<in6_addr> MakeIPv6s() {
return {
MakeIPv6(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15), //
1:203:405:607:809:a0b:c0d:e0f
MakeIPv6(0, 0, 0, 0, 0, 1),
// ::1
MakeIPv6(0, 0, 0, 0, 0, 0),
// ::
MakeIPv6(0xff, 0xff, 204, 152, 189, 116),
// ::ffff:204.152.189.116
};
}
```

上下文：这段代码定义了两个函数，`MakeIPv4s()` 和 `MakeIPv6s()`，分别生成 IPv4 和 IPv6 地址的 vector。它们属于定义在 `value_generators.h` 头文件里的一组更大的取值生成函数，该头文件在文档开头被包含。这些取值生成函数的用途，是为 Clickhouse 数据库所用的各种数据类型提供测试数据。

#### 小说

问题：那位与警探督察 Greg Lestrade 见面、提出用 Sherlock Holmes 的情报来换取帮助他取得儿子监护权的神秘男子，姓名首字母是什么？

答案：与警探督察 Greg Lestrade 见面的那位神秘男子，姓名首字母是 MH。这是他留给 Lestrade 的便条末尾的签名透露出来的。

黄金片段：

那人掏出一本小笔记本，翻到做了记号的一页。「Roger，6 岁，喜欢打橄榄球和足球，不过学业上还得再专心一点。还有 Aaron，3 岁，有点害羞，但喜欢画画。」

「你在_监视我们_？」Greg 一想到有人在看着自己的儿子，身子就僵住了。「离我儿子_远点_！」他攥紧拳头。「我的问题我自己承担。你既然这么会监视人，为什么不自己去监视 Sherlock？或者更好，你自己去跟他说。」他压着嗓子，脸气得通红。「现在送我回家。」

那人看着他，像是对这场面既好奇又觉得有趣。「很好。来接你的那辆车会把你送回去。和你谈话很愉快，警探督察。」

Greg 没有回答。他气得发抖，刚刚发生的事还在脑子里。到底_出了什么事_？他是不是刚刚惹怒了一个黑手党头目？一个腐败的政客？会不会有人来取他的命？会不会因为他发了脾气，儿子们就有危险？

开车回家的整段路上他都松不下来，吓得胃里发恶心。

直到打开家门，他才稍稍放松一点。Roger 和 Aaron 在沙发上看电影，保姆正在收拾，看起来是晚饭。他注意到 Sally 不在家。

「对不起，我回来晚了，Claire。」他轻轻笑了一下，又多拿了几张钞票。「谢谢你。希望两个孩子没有太麻烦你。」

Claire 笑着说：「一点也不，Lestrade 先生。你的上司已经来过家里，告诉我你今晚会晚回。」

Greg 眨了眨眼。「我的上司？」他想象不出单位里_有谁_会为了任何理由上门。

保姆点点头。「他在桌上给你留了东西。」

他很快道了谢，送她离开，心里只想着桌上可能是什么。两个孩子看得太入迷，没有察觉他的紧张。Greg 吸了一口气，拿起桌上的信封。

信封上用优雅的手写体写着他的名字。里面是一张素白的卡片，同样的字迹。

_别担心你的妻子，Gregory。这件事算办妥了。~MH_

文件结束。

上下文：这一节写 Greg Lestrade 面对一个神秘而有权势的男人。此人似乎对 Greg 的私生活了如指掌，包括他的婚姻麻烦和他的孩子。男人提出帮 Greg 取得孩子的监护权，交换条件是监视 Sherlock Holmes。Greg 愤怒地拒绝，随后又震惊地发现，这个男人似乎已经插手了他的婚姻问题。这一场把神秘的 “MH” 这个角色引进来。此人看来对 Greg 和 Sherlock 两边的事都有切身利益。

#### 论文

问题：White 关于闭双曲三维流形的内射半径，就基本群的秩而言，证明了什么定理？

答案：White 证明了，对所有 r，存在 R，使得每一个满足 rank(π₁(M)) ≤ r 的闭双曲三维流形 M 都有 inj(M) ≤ R。换句话说，闭双曲三维流形的内射半径（injectivity radius），可以按其基本群的秩给出上界。

黄金片段：

设 M 是 M(F) 对应于 π 的核的那个无穷覆叠；下文始终为 M 配备唯一的双曲度量，使得覆叠 M → M(F) 是黎曼的。继续之前，我们把下面这个事实记在这里，供后文引用：本文的许多论证依赖 M 的基本群里有限生成子群的性质。命题 4.2：π₁(M) π₁(Σ_g) 的每一个秩至多为 2g 的真子群 G，都是自由的，并且是凸余紧的（convex-cocompact）。PDF 在两个群符号之间没有运算符，译文保留这种并列。

证明概要。流形 M 同胚于 Σ_g × ℝ。因此，π₁(M) π₁(Σ_g) 的每一个真子群，要么是自由群，要么同构于某个闭曲面的基本群，而该闭曲面以至少 2 的次数覆叠 Σ_g。任何这样的曲面，亏格都大于 g，因而其基本群的秩大于 2g。于是我们证明了群 G 是自由的。Thurston 在这一情形下的一个结果，以及 Agol [1] 和 Calegari–Gabai [4] 在普遍得多的情形下的结果断言：H³/G 同胚于一个柄体的内部。再由 Canary 对 Thurston 覆叠定理的推广 [5]，G 是凸余紧的。

定理 1.1 的证明。细心的读者或许已经从本节标题推出来，我们在这里证明定理 1.1。不过先做热身，给出引言里提到的 White 的结果：

定理（White [13]）。对所有 r，存在 R，使得每一个满足 rank(π₁(M)) ≤ r 的闭双曲三维流形 M 都有 inj(M) ≤ R。

证明。设 f: X → M 是 π₁(M) 的某个最小生成集所在类里的最短承载图；注意 X 至多有 s = 3(r − 1) 条边。记 X_{<t} 为 X 中长度小于 t 的所有边的并（可能为空）。由引理 2.2，X_{<t} 中每一条简单闭回路都代表 π₁(M) 中的一个非平凡元素，并且长度至多为 3t(r − 1)。因此，只要证明存在只依赖于 r 的 t_r，使得 X_{<t_r} 的某个连通分支 Y 不是树。

设 l₀ 为由引理 3.1 给出的常数。因为 M 是闭的，π₁(M) 不是自由群，特别地 f: X → H³ 不可能是拟等距嵌入。再由引理 2.2 和引理 3，X_{<l₀} 非空。

PDF 原文在 “Lemma 3.” 之后换行，下一句直接以 “is a …” 起头，中间缺了一段，这里不补写。

……是一个 (3(r − 1)l₀, 3(r − 1)l₀)-拟等距嵌入。由命题 3.3，我们得到只依赖于 r 的常数 l₁ = l₁(r)，使得 X_{<l₀} 是 X_{<l₁} 的真子图。如果 X_{<l₁} 的每一个连通分支仍然是树，就再得到只依赖于 r 的 l₂ = l₂(r)，使得 X_{<l₁} 是 X_{<l₂} 的真子图。这个过程最多可以重复 3(r − 1) 次，因为这就是 X 的边数。至此 White 定理的证明结束。

由此可见，White 定理的证明实际上得出：每一个生成集 (g₁, …, g_r) 都 Nielsen 等价于一个生成集 (g₁, …, g_r)，其中 g₁ 的平移长度有一致的界。定理 1.1 的证明思路是：证明 π₁(M(Fⁿ)) 的每一个生成集都 Nielsen 等价于这样一个生成集，其中除一个元素之外，所有元素的平移长度都有一致的界。

上下文：这一节讨论映射环面 M(F) 的无穷覆叠 M 的几何。其中 F 是亏格 g ≥ 2 的闭曲面 Σ_g 上的一个伪 Anosov（pseudo-Anosov）映射类。作者建立的结论是：π₁(M) 的每一个秩至多为 2g 的真子群都是自由的，并且是凸余紧的。对 M 的基本群的这一几何理解，随后被用在定理 1.1 的证明里。该定理确定映射环面 M(Fⁿ) 的基本群的秩。

#### ArXiv

问题：在英语 Penn Treebank 上的聚类算法实验里，每个噪声水平 σ 用了多少个模型？

黄金答案：在英语 Penn Treebank 上的聚类算法实验里，每个噪声水平 σ ∈ {0.05, 0.1, 0.15, 0.2} 使用 20 个模型，一共 80 个模型。

黄金片段（LaTeX 原文）：

```latex
\section{Experiments}
\label{section:experiments}
In this section, we describe parsing experiments with two languages:
English and German.
\subsection{Results for English}
\begin{table*}[htb]
\begin{center}
{\small
\begin{tabular}{|c||c|c|c||c|c|c||c|c|c|}
\hline
& \multicolumn{3}{c||}{Clustering} & \multicolumn{3}{c||}{Spectral (smoothing)} &
\multicolumn{3}{c|}{Spectral (no smoothing)} \\
& MaxTre & MaxMrg & MaxEnt & MaxTre & MaxMrg & MaxEnt & MaxTre & MaxMrg & MaxEnt
\\
\hline
\setupAdd & 88.68 & 88.64 & 89.50 & 88.20 & 88.28 & 88.59 & 86.72 & 86.85 & 87.94 \\
\setupMul & 88.74 & 88.66 & 89.89 & 88.48 & 88.70 & 89.46 & 86.97 & 86.53 & 89.04 \\
\setupDropout & 88.68 & 88.56 & 89.80 & 88.64 & 88.71 & \textbf{89.47} & 88.37 & 88.06 &
89.52 \\
\setupAll & 88.84 & 88.75 & \textbf{89.95} & 88.38 & 88.75 & 89.45 & 87.49 & 87.00 &
\textbf{89.85} \\
\hline
No noise & \multicolumn{3}{c||}{86.48} & \multicolumn{3}{c||}{88.53 (Cohen et al., 2013)} &
\multicolumn{3}{c|}{86.47 (Cohen et al., 2013)} \\
\hline
\end{tabular}
}
\end{center}
\caption{\small Results on section 22 (WSJ). MaxTre denotes decoding
using maximal tree coverage, MaxMrg denotes decoding using maximal
marginal coverage, and MaxEnt denotes the use of a discriminative
reranker. \setupAdd, \setupMul $\,$ and \setupDropout $\,$ denote
the use of additive Gaussian noise, multiplicative Gaussian noise
and dropout noise, respectively. The number of models used in the
first three rows for the clustering algorithm is 80: 20 for each
$\sigma \in \{ 0.05, 0.1, 0.15, 0.2 \}$. For the spectral
algorithm, it is 20, 5 for each $\sigma$ (see footnotes). The
number of latent states is $m=24$. For \setupAll, we use all
models combined from the first three rows. The ``No noise''
baseline for the spectral algorithm is taken from Cohen et
al. (2013). The best figure in each algorithm block is in
boldface.\label{table:results-dev}}
\end{table*}
```

表注的意思：这是第 22 节（WSJ）上的结果。MaxTre 表示用最大树覆盖解码，MaxMrg 表示用最大边缘覆盖解码，MaxEnt 表示使用一个判别式重排序器。`\setupAdd`、`\setupMul` 和 `\setupDropout` 分别表示加性高斯噪声、乘性高斯噪声和 dropout 噪声。聚类算法前三行所用的模型数是 80：每个 σ ∈ {0.05, 0.1, 0.15, 0.2} 用 20 个。谱算法用的是 20 个，每个 σ 用 5 个（见该文脚注）。潜变量状态数是 m = 24。`\setupAll` 把前三行的全部模型合在一起使用。谱算法的 “No noise”（无噪声）基线取自 Cohen 等人（2013）：平滑一栏是 88.53，无平滑一栏是 86.47；聚类的无噪声基线是 86.48。每个算法块里最好的数字用粗体标出。

上下文：这一节描述作者在英语和德语数据上所做的句法分析实验的结果。它给出英语分析任务上的详细结果，包括不同解码技术的比较，以及用带噪声的模型来改进表现所带来的影响。结果表明，作者使用来自多个模型的一组多样预测的做法，超过了此前英语分析上的最高水平。

### 致谢

研究与撰写：Daniel Ford。感谢 Orowa Sikder、Gautam Mittal 和 Kenneth Lien 的关键反馈，Samuel Flamini 实现了 cookbook，Lauren Polansky 负责项目协调，以及 Alex Albert、Susan Payne、Stuart Ritchie 和 Brad Abrams 帮助把这篇博文定稿。

## 笔记

- SEC 例子里单独一句「收入较上一季度增长 3%」没有公司和季度。生成出来的说明把片段放回 ACME、2023 年第二季度，并写上上一季度收入 3.14 亿美元。按文中假设，这段说明大约 50–100 token。
- 知识库小于 200,000 token（大约 500 页）时，原文建议整库放进提示，用提示缓存把延迟降低超过 2 倍、成本最多降低 90%。超过这个规模再做上下文检索。成本按片段 800 token、文档 8k token、指令 50 token、每片段上下文 100 token 估算，一次性是每百万文档 token 1.02 美元。
- 正文里的平均失败率用 Gemini Text 004、取前 20 个片段：只做上下文嵌入是 5.7% → 3.7%（降 35%），再加上上下文 BM25 到 2.9%（降 49%），重排序（先取前 150，再留下前 20，测试用的是 Cohere）到 1.9%（降 67%）。各数据集的柱状图在附录原图和 PDF 里，本页不逐柱抄数。重排序在运行时多一步，片段数要自己权衡延迟。
- 检索在[构建高效的 AI Agent](./building-effective-agents)里是「增强后的 LLM」的一件构件；窗口里到底放什么，见[AI Agent 的有效上下文工程](./effective-context-engineering-for-ai-agents)。原文还比较过笼统文档摘要、假设文档嵌入和基于摘要的索引，并写明那些做法收益有限或表现偏低。

返回 [AI / Agent 阅读清单](./)。
