#### 把智能合约代码，编译成cwjsr可以执行的js字符串

 - 把从sk-chain import进来的变量替换成全局变量，类型直接写在了TS代码里面，方法替换为从__sk__这个全局变量里拿，__sk__是在cwjsr运行时注入的
 - 把class extends删除，在TS代码里extends只是为了能使用BaseContract的类型定义
 - 把super()替换为向当前class注入BaseContract的属性
 - 把export等模块相关的代码剔除
 - 把js code string生成Uint8Array数据，写入文件