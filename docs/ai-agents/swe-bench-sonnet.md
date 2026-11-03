---
title: "Claude 与 SWE-Bench"
title_en: "Claude SWE-Bench"
description: "升级版 Claude 3.5 Sonnet 用薄脚手架在 SWE-Bench Verified 上做到 49%。"
source: "Anthropic"
source_url: "https://www.anthropic.com/engineering/swe-bench-sonnet"
date: 2025-01-06
status: "译文"
tags:
  - "评测"
---

# Claude 与 SWE-Bench

**非官方译文。** 官方原文：[Raising the bar on SWE-bench Verified with Claude 3.5 Sonnet](https://www.anthropic.com/engineering/swe-bench-sonnet)（Anthropic · Engineering）。

## 导读

升级版 Claude 3.5 Sonnet 在 SWE-Bench Verified 上做到 49%，超过当时最高的 45%。这篇把包在模型外面的 Agent 拆开：一份不算长的提示，加上 Bash 和编辑两个工具，然后一直采样，直到模型自己停，或上下文超过 200k。适合要在真实仓库任务上把分数做上去、又不确定该把步骤写死还是留给模型的人。原文发表于 2025 年 1 月 6 日，成文时还没有模型在这项评测上超过 50%。

## 译文

他们当时最新的模型、升级版 [Claude 3.5 Sonnet](https://www.anthropic.com/news/3-5-models-and-computer-use)，在 SWE-bench Verified 这项软件工程评测上拿到 49%，超过此前最高水平模型的 45%。这篇解释他们围绕该模型搭的 Agent，目的是帮开发者把 Claude 3.5 Sonnet 的表现尽量做满。

[SWE-bench](https://www.swebench.com/)（本站写作 SWE-Bench）是一套 AI 评测基准，看模型能不能完成真实的软件工程 task（任务）。具体说，它测的是模型能否解决流行开源 Python 仓库里的 GitHub issue。对基准里的每一个 task，模型会拿到一套已经配好的 Python 环境，以及该 issue 被解决之前的仓库 checkout（一份本地工作副本）。模型要先理解代码、再修改、再测试，然后提交它提出的解法。

每份解法都用关闭原始 GitHub issue 的那份 pull request 里的真实单元测试来评分。这是在测：模型能否做出和该 PR 的人类作者相同的功能。

SWE-Bench 评的是一整套 Agent，而不只是孤立的模型。这里的 Agent，指模型加上包在它外面的软件。这层软件是脚手架（scaffolding），本站称作 harness（任务脚手架）：负责生成送进模型的提示、解析模型输出并采取动作，以及管理交互循环——上一步动作的结果会写进下一步的提示。即使用同一个底层模型，Agent 在 SWE-Bench 上的表现也可以因这层脚手架差很多。

测大语言模型（LLM）编程能力的基准还有很多，SWE-Bench 变流行有几条原因：

1. 它用的是真实项目里的工程 task，而不是竞赛题或面试题。
2. 它还没有饱和，往上走的空间还大。成文时还没有模型在 SWE-Bench Verified 上超过 50% 的完成率（升级版 Claude 3.5 Sonnet 当时是 49%）。
3. 它测的是整套 Agent，而不只是孤立的模型。开源开发者和创业公司在优化脚手架上成绩很大，同一个模型外面换一层，表现可以好很多。

需要说明：原始 SWE-Bench 数据集里，有些 task 如果没有 GitHub issue 以外的额外上下文就解不出来（例如要返回哪些具体的错误信息）。[SWE-bench Verified](https://openai.com/index/introducing-swe-bench-verified/)（下文写作 SWE-Bench Verified）是 SWE-Bench 里 500 道题的子集，经过人工复核，确认这些题可以解出，因此能更清楚地衡量编程 Agent 的表现。这篇之后说的都是这项基准。

### 达到当时的最高水平

#### 使用工具的 Agent

为升级版 Claude 3.5 Sonnet 做这套 Agent 脚手架时，他们的设计原则是：尽量把控制权交给语言模型本身，把脚手架保持在最小。Agent 有一份提示、一个用来执行 bash 命令的 Bash 工具，以及一个用来查看和编辑文件与目录的编辑工具。他们会一直采样，直到模型决定自己做完了，或者超过 200k 的上下文长度。这套脚手架让模型自己判断该怎么推进问题，而不是被写死进某一种固定模式或工作流（workflow）。

提示里给了模型一套建议步骤，但对这个 task 来说并不特别长，也不过分细。模型可以自己决定怎么从一步走到下一步，没有严格、离散的状态切换。如果不在意 token，明确鼓励模型把回复写长会有帮助。

下面是这套 Agent 脚手架里的提示：

```text
<uploaded_files>
{location}
</uploaded_files>
I've uploaded a python code repository in the directory {location} (not in /tmp/inputs). Consider the following PR description:

<pr_description>
{pr_description}
</pr_description>

Can you help me implement the necessary changes to the repository so that the requirements specified in the <pr_description> are met?
I've already taken care of all changes to any of the test files described in the <pr_description>. This means you DON'T have to modify the testing logic or any of the tests in any way!

Your task is to make the minimal changes to non-tests files in the {location} directory to ensure the <pr_description> is satisfied.

Follow these steps to resolve the issue:
1. As a first step, it might be a good idea to explore the repo to familiarize yourself with its structure.
2. Create a script to reproduce the error and execute it with `python <filename.py>` using the BashTool, to confirm the error
3. Edit the sourcecode of the repo to resolve the issue
4. Rerun your reproduce script and confirm that the error is fixed!
5. Think about edgecases and make sure your fix handles them as well

Your thinking should be thorough and so it's fine if it's very long.
```

模型的第一个工具执行 Bash 命令。模式很简单，只接收要在环境里运行的那条命令。真正更有分量的是工具描述。里面有更细的说明，包括输入不用转义、没有网络，以及怎样在后台跑命令。

下面是 Bash 工具的规格：

```text
{
   "name": "bash",
   "description": "Run commands in a bash shell\n
* When invoking this tool, the contents of the \"command\" parameter does NOT need to be XML-escaped.\n
* You don't have access to the internet via this tool.\n
* You do have access to a mirror of common linux and python packages via apt and pip.\n
* State is persistent across command calls and discussions with the user.\n
* To inspect a particular line range of a file, e.g. lines 10-25, try 'sed -n 10,25p /path/to/the/file'.\n
* Please avoid commands that may produce a very large amount of output.\n
* Please run long lived commands in the background, e.g. 'sleep 10 &' or start a server in the background.",
   "input_schema": {
       "type": "object",
       "properties": {
           "command": {
               "type": "string",
               "description": "The bash command to run."
           }
       },
       "required": ["command"]
   }
}
```

模型的第二个工具（编辑工具）复杂得多，查看、创建和编辑文件所需要的东西都在里面。工具描述同样写清了模型该怎么用它。

他们在各种各样的 Agent 式 task 上，为这些工具的描述和规格花了很多功夫。他们会去测：模型可能在哪些地方误解规格，使用工具时有哪些坑，然后改描述，提前堵住这些问题。他们相信，给模型设计工具界面，值得投入和给人设计工具界面同样多的注意力。

下面是编辑工具的描述。原文页面在这里用 `...` 截断，译文保持原样：

```text
{
   "name": "str_replace_editor",
   "description": "Custom editing tool for viewing, creating and editing files\n
* State is persistent across command calls and discussions with the user\n
* If `path` is a file, `view` displays the result of applying `cat -n`. If `path` is a directory, `view` lists non-hidden files and directories up to 2 levels deep\n
* The `create` command cannot be used if the specified `path` already exists as a file\n
* If a `command` generates a long output, it will be truncated and marked with `<response clipped>` \n
* The `undo_edit` command will revert the last edit made to the file at `path`\n
\n
Notes for using the `str_replace` command:\n
* The `old_str` parameter should match EXACTLY one or more consecutive lines from the original file. Be mindful of whitespaces!\n
* If the `old_str` parameter is not unique in the file, the replacement will not be performed. Make sure to include enough context in `old_str` to make it unique\n
* The `new_str` parameter should contain the edited lines that should replace the `old_str`",
...
```

他们提高表现的办法之一，是给工具做防错（error-proof）。例如，Agent 离开根目录之后，模型有时会把相对路径弄错。为了挡住这件事，他们让工具始终要求绝对路径。

他们对「怎么描述对已有文件的编辑」试了好几种策略，可靠性最高的是字符串替换：模型指定用 `new_str` 替换给定文件里的 `old_str`。只有 `old_str` 恰好匹配一次时才会替换。匹配多于一次或少于一次，就把相应的错误信息给模型，让它重试。

编辑工具的规格如下。原文同样以 `...` 起头，只给出了 `input_schema` 这一段：

```text
...
   "input_schema": {
       "type": "object",
       "properties": {
           "command": {
               "type": "string",
               "enum": ["view", "create", "str_replace", "insert", "undo_edit"],
               "description": "The commands to run. Allowed options are: `view`, `create`, `str_replace`, `insert`, `undo_edit`."
           },
           "file_text": {
               "description": "Required parameter of `create` command, with the content of the file to be created.",
               "type": "string"
           },
           "insert_line": {
               "description": "Required parameter of `insert` command. The `new_str` will be inserted AFTER the line `insert_line` of `path`.",
               "type": "integer"
           },
           "new_str": {
               "description": "Required parameter of `str_replace` command containing the new string. Required parameter of `insert` command containing the string to insert.",
               "type": "string"
           },
           "old_str": {
               "description": "Required parameter of `str_replace` command containing the string in `path` to replace.",
               "type": "string"
           },
           "path": {
               "description": "Absolute path to file or directory, e.g. `/repo/file.py` or `/repo`.",
               "type": "string"
           },
           "view_range": {
               "description": "Optional parameter of `view` command when `path` points to a file. If none is given, the full file is shown. If provided, the file will be shown in the indicated line number range, e.g. [11, 12] will show lines 11 and 12. Indexing at 1 to start. Setting `[start_line, -1]` shows all lines from `start_line` to the end of the file.",
               "items": {
                   "type": "integer"
               },
               "type": "array"
           }
       },
       "required": ["command", "path"]
   }
}
```

### 结果

总的来说，升级版 Claude 3.5 Sonnet 在推理、编程和数学上高于他们此前的模型，也高于[此前最高水平的那一个模型](https://solverai.com/)。它的 Agent 能力也更强：工具和脚手架把这些变强的能力用到了更合适的地方。

| 模型 | 升级版 Claude 3.5 Sonnet | 此前最高水平 | 旧版 Claude 3.5 Sonnet | Claude 3 Opus |
| --- | --- | --- | --- | --- |
| SWE-Bench Verified 分数 | 49% | 45% | 33% | 22% |

上表是他们一部分模型在 SWE-Bench Verified 上的分数，用的都是这套 Agent 脚手架。

### Agent 行为示例

跑这个基准时，他们以 [SWE-Agent](https://swe-agent.com/) 框架作为 Agent 代码的底子。下面的日志里，他们把 Agent 的文字输出、工具调用和工具返回画成 THOUGHT、ACTION 和 OBSERVATION，但并没有强迫模型按这个固定顺序输出。

下面几段代码走一遍升级版 Sonnet 3.5 解决一道 SWE-Bench 题的典型过程。日志保持原文。

第一段是给模型的初始提示的一部分，`{pr_description}` 已填进一道 SWE-Bench task 的真实内容。这道 task 里有复现问题的步骤，模型因此有一个值得动手查的起点。issue 本身是：`sklearn.linear_model.RidgeClassifierCV` 的构造函数不接受 `store_cv_values`，调用时会报 `TypeError`，但有些属性又依赖这个参数。

```text
<uploaded_files>
/repo
</uploaded_files>
I've uploaded a python code repository in the directory /repo (not in /tmp/inputs). Consider the following PR description:

<pr_description>
linear_model.RidgeClassifierCV's Parameter store_cv_values issue
#### Description
Parameter store_cv_values error on sklearn.linear_model.RidgeClassifierCV

#### Steps/Code to Reproduce
import numpy as np
from sklearn import linear_model as lm

#test database
n = 100
x = np.random.randn(n, 30)
y = np.random.normal(size = n)

rr = lm.RidgeClassifierCV(alphas = np.arange(0.1, 1000, 0.1), normalize = True, 
                                         store_cv_values = True).fit(x, y)

#### Expected Results
Expected to get the usual ridge regression model output, keeping the cross validation predictions as attribute.

#### Actual Results
TypeError: __init__() got an unexpected keyword argument 'store_cv_values'

lm.RidgeClassifierCV actually has no parameter store_cv_values, even though some attributes depends on it.
```

模型先回应，并用编辑工具查看仓库结构。模型的文字和工具参数在 THOUGHT、ACTION 下面，工具输出的一部分在 OBSERVATION 下面。原文目录列表在末尾省略：

```text
THOUGHT:
I'll help you implement the changes to satisfy the PR description. Let's follow the steps you outlined.

1. First, let's explore the repo structure:
ACTION (str_replace_editor):
command:
view

path:
/repo

OBSERVATION:
Here's the files and directories up to 2 levels deep in /repo, excluding hidden items:
/repo
/repo/PULL_REQUEST_TEMPLATE.md
/repo/ISSUE_TEMPLATE.md
/repo/sklearn
/repo/sklearn/decomposition
/repo/sklearn/kernel_ridge.py
/repo/sklearn/model_selection
/repo/sklearn/covariance
/repo/sklearn/cluster
/repo/sklearn/base.py
/repo/sklearn/dummy.py
/repo/sklearn/naive_bayes.py
...
```

对仓库结构更清楚之后，模型用编辑工具新建一个脚本，用来复现问题，并在后面测试自己的修复：

```text
THOUGHT:
Based on the repository structure, we'll need to modify the Ridge Classifier in the `sklearn/linear_model` directory.

Let's create a script to reproduce the error:
ACTION (str_replace_editor):
command:
create

path:
/repo/reproduce_error.py

file_text:
import numpy as np
from sklearn import linear_model as lm

#test database
n = 100
x = np.random.randn(n, 30)
y = np.random.normal(size = n)

rr = lm.RidgeClassifierCV(alphas=np.arange(0.1, 1000, 0.1), normalize=True, 
                         store_cv_values=True).fit(x, y)

OBSERVATION:
File created successfully at: /repo/reproduce_error.py
```

接着模型用 Bash 工具执行自己写的脚本，成功复现了 task 里的问题：

```text
THOUGHT:
Let's verify that we can reproduce the error:
ACTION (bash):
command:
python3 /repo/reproduce_error.py

OBSERVATION:
Traceback (most recent call last):
  File "/repo/reproduce_error.py", line 10, in <module>
    store_cv_values=True).fit(x, y)
TypeError: __init__() got an unexpected keyword argument 'store_cv_values'
```

从这里起，模型用编辑工具改仓库里的源码，并重新跑脚本，看改动有没有把问题解决。它的判断是：`RidgeClassifierCV` 继承自 `_BaseRidgeCV`，但没有把构造函数里的 `store_cv_values` 传给基类构造函数。修复就是补上这个参数，默认 `False`，并在 `super().__init__` 里传下去：

```text
THOUGHT:
The error is reproducible. Looking at the code, I can see that the issue is that while the `RidgeClassifierCV` class inherits from `_BaseRidgeCV`, it fails to pass the `store_cv_values` parameter from its constructor through to the base class constructor.

Let's fix this:
ACTION (str_replace_editor):
command:
str_replace

path:
/repo/sklearn/linear_model/ridge.py

old_str:
    def __init__(self, alphas=(0.1, 1.0, 10.0), fit_intercept=True,
                 normalize=False, scoring=None, cv=None, class_weight=None):
        super(RidgeClassifierCV, self).__init__(
            alphas=alphas, fit_intercept=fit_intercept, normalize=normalize,
            scoring=scoring, cv=cv)
        self.class_weight = class_weight

new_str:
    def __init__(self, alphas=(0.1, 1.0, 10.0), fit_intercept=True,
                 normalize=False, scoring=None, cv=None, class_weight=None,
                 store_cv_values=False):
        super(RidgeClassifierCV, self).__init__(
            alphas=alphas, fit_intercept=fit_intercept, normalize=normalize,
            scoring=scoring, cv=cv, store_cv_values=store_cv_values)
        self.class_weight = class_weight
```

这个具体例子里，模型做了 12 步才决定可以提交。随后这道 task 的测试跑通了，说明模型的解法对上了问题。有的 task 要超过 100 轮，模型才提交解法；也有的 task 里，模型一直试，直到上下文用完。

对照升级版 Claude 3.5 Sonnet 和更早模型的尝试可以看到：升级版 3.5 Sonnet 更常自己改错。它也会试好几种不同的解法，而不是卡在同一个错误上反复犯。

### 挑战

SWE-Bench Verified 是很有力的评测，但跑起来比简单的单轮评测复杂。下面是他们用它时碰到的一些困难，其他做 AI 的人可能也会遇到。

1. 耗时长，token 成本高。上面的例子 12 步就成功做完。但很多成功的 trial（一次运行）要花几百轮模型才解出来，并且超过 10 万 token。升级版 Claude 3.5 Sonnet 很执着：给够时间，它常常能绕过问题，但这会很贵。
2. 评分（grader，评分器）。查看失败的 task 时，他们发现有些情况下模型的行为是对的，但环境搭建有问题，或者安装用的补丁被打了两次。把这些系统问题理清，才能准确看见一个 AI Agent 的表现。
3. 隐藏测试。模型看不到用来给自己打分的测试，所以它常常「以为」自己成功了，而这道 task 实际上失败了。有些失败是因为模型在错误的抽象层次上解决问题（贴了一块创可贴，而不是做更深层的重构）。另一些失败显得不那么公平：问题本身解决了，但对不上原 task 的单元测试。
4. 多模态。升级版 Claude 3.5 Sonnet 的视觉和多模态能力很好，但他们没有做一条路，让它查看存进文件系统的文件，或查看以 URL 引用的文件。这让某些 task 的调试特别难（尤其是来自 Matplotlib 的），也容易让模型幻觉。这里对开发者来说确实有够得着的改进空间。SWE-Bench 也已经推出了一项针对多模态 task 的新评测。他们期待开发者在不久的将来，用 Claude 在这项评测上拿到更高的分数。

升级版 Claude 3.5 Sonnet 在 SWE-Bench Verified 上做到 49%，超过此前最高的 45%，用的是一份简单提示和两个通用工具。他们有信心：用新的 Claude 3.5 Sonnet 做开发的人，会很快找到新的、更好的办法，把 SWE-Bench 分数做到比这里最初展示的更高。

### 致谢

Erik Schluntz 优化了 SWE-Bench Agent，并写了这篇。Simon Biggs、Dawn Drain 和 Eric Christiansen 帮忙实现了这项基准。Shauna Kravec、Dawn Drain、Felipe Rosso、Nova DasSarma、Ven Chandrasekaran 以及其他许多人，参与把 Claude 3.5 Sonnet 训练成擅长 Agent 式编程。

## 笔记

- 分数是整套 Agent 的分数。同一套 harness 下，升级版 Claude 3.5 Sonnet 是 49%，旧版是 33%，Claude 3 Opus 是 22%；此前最高水平是 45%。
- 工具描述比参数表更要紧。离开根目录后相对路径会错，修法是工具一律要绝对路径。同一处例子也写在[构建高效的 AI Agent](./building-effective-agents)的工具附录里，后面[为 AI Agent 编写有效工具](./writing-tools-for-agents)把这件事展开成一整篇。
- 隐藏测试会让模型以为自己已经成功。成功的 trial 常常要几百轮、超过 10 万 token；安装补丁打两次会把 grader 弄脏。成文时 SWE-Bench Verified 还没有模型超过 50%，子集是人工复核过的 500 题。
- 当时没有让模型看文件系统里的图或 URL 指向的文件，Matplotlib 一类 task 更容易幻觉。日志里的 THOUGHT / ACTION / OBSERVATION 只是给人看的画法，模型本身不被固定成这个顺序。

返回 [AI / Agent 阅读清单](./)。
