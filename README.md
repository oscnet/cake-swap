# cake-swap
一个使用 pancakeswap 交易的示例程序。

[https://pancakeswap.finance](https://pancakeswap.finance/ifo) 是币安智能链上的一个主要的去中心化交易平台，类似于（抄） 以太网上的 uniswap。因为我的资金主要放在币安智能链上，所以一直想要写一个能自动在 pancakeswap 上交易的程序，这几天在网上狂扫资料，终于搞定。其实 uniswap sdk 和 pancakeswap 的文档写得不好，很多地方交代得不清不楚的，我去看了源码才搞明白。

下面我把完整步骤和源码写在下边，供大家参考。

## 1、新建一个 node 项目

程序主要使用 javascript 写的，尚不确定可以在 python 上实现，如果以后有空，可能会去搞搞。但现在让我们新建一个 node 项目吧。因为大家可能对 js 不太熟悉，我尽量写详细点。

### 1.1 安装 node

我这里以 macOS 为例，如果是 windows 平台，请到官网 ([https://nodejs.org/zh-cn/](https://nodejs.org/zh-cn/))下载安装即可。

```bash
brew install node
```

### 1.2 安装包管理程序 yarn

```bash
brew install yarn
```

### 1.3 新建项目目录

```bash
# 新建一个目录 cake-swap
mkdir cake-swap
cd cake-swap
```

### 1.4 初始化项目

```bash
oscar@mbp cake-swap % yarn init 
yarn init v1.22.15
question name (cake-swap): 
question version (1.0.0): 
question description: 
question entry point (index.js): 
question repository url: 
question author: 
question license (MIT): 
question private: 
success Saved package.json
✨  Done in 7.72s.
oscar@mbp cake-swap %
```

在 package.json 中加入红色部分：

```bash
{
  "name": "cake-swap",
  "version": "1.0.0",
  "main": "index.js",
  "license": "MIT",
  "type": "module",
	"scripts": {
    "start": "node index.js"
  }
}
```

### 1.5 建立程序文件 index.js，内容如下

```bash
console.log('hello world!');
```

看一下能不能运行：

```bash
oscar@mbp cake-swap % yarn start     
yarn run v1.22.15
$ node index.js
hello world!
✨  Done in 2.00s.
```

好了，一个 node 程序已经建好，我们现在可以开始编写交易程序了！

## 2、安装所需要的程序依赖包

```bash
yarn add @pancakeswap/sdk
yarn add @uniswap/v2-periphery
yarn add readline-sync
yarn add @ethersproject/contracts
yarn add @ethersproject/providers
yarn add @ethersproject/solidity
yarn add @ethersproject/bignumber
yarn add @ethersproject/units
yarn add @ethersproject/units
```
