# 基于 state 的 actions tools

### 任务开始前准备
首先由 LLM 判断当前任务是否是浏览器操作任务，抽取任务的 url, 判断任务属于 extract or action，若用户描述的是浏览器任务，则开始准备浏览器环境，应检测当前 taskId 下是否存在相对应的 tabId , 若不存在，使用 url
创建 tab 页， 调用大模型生成合适的任务标题给 task 对象， 创建 groupTab ，向插件发送 debuggerAttach to tabId 的指令

task 进入 running 状态， 当检测到页面加载完成 loaded 系统主动发送 截屏 + readability 的读取命令，两个动作获取到的数据均通过接口上传到 server
(系统需要确认发出的指令已完成或超时，来进行下一步的模型调度) 若发生超时 task 状态变为 error
若任务只是打开浏览器操作，则当指令完成后，任务标记完成 completed 若任务还需进一步分析，task 状态为 ongoing

### 页面分析
对于 extract / action 的任务，首先要做的是页面分析，页面状态位于 tab 对象下的 page 对象，页面分析主要需要获取页面的主体内容(above-content) 通过 readability 获取，页面的截图 url , LLM阅读页面图像，确认页面类型，是否符合用户要求，确认导航区域，内容主体区域，表单区域