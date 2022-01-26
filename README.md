# cake-swap
一个使用 pancakeswap 交易的示例程序。

[https://pancakeswap.finance](https://pancakeswap.finance/ifo) 是币安智能链上的一个主要的去中心化交易平台，类似于（抄） 以太网上的 uniswap。因为我的资金主要在币安智能链上，所以一直想要写一个能自动在 pancakeswap 上交易的程序，这几天在网上狂扫资料，终于把这个功能搞定了。pancakeswap 基本上是抄的 uniswap 的代码，所以它自己的文档基本上为零， uniswap sdk 目前有 V3, 但是 pancakeswap 使用的是 V2 的代码，所以文档要看 V2 的，它的文档说实话写得不太好，很多地方交代得不清不楚的，很容易让人摸不着头脑（也可能是我自己理解能力不好），只有去看了源码才搞明白。

因为大家可能对 node 不太熟，所以我把完整步骤和代码说明一并写出来，供大家参考。

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

### 1.5 建立主程序文件

新建一个文件 index.js，内容如下：

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

这样，一个可运行的 node 程序环境已经建好了，我们现在可以在这个基础上开始编写交易程序了！

## 2、合约交互基础

一般跟以太智能合约交互，主要使用的库有 web3, ethers.js 。web3 出得早，但 ethers.js 比 web3 代码少，接口更为简洁，推荐使用 ethers。

币安的智能链是兼容以太链的，只是 ChainId 配置不一样，所以也是可以使用这些库的。

### 1、ethers 库简要介绍

ethers 封装了跟以太链交互的一些基本功能，很象是我们常用的 ccxt 。 它会帮助我们连接到节点。使用私钥或助记词签署交易。

```bash
# 安装 ethers 库
yarn add ethers
```

### 2、**Provider**

ethers 通过 **Provider** 连接到以太坊网络，并用它查询以太坊网络状态及发送交易。所以使用 ethers 首先要给它一个 **Provider ,** 对于以太坊主网，我们可以直接使用:

```bash
**let** provider = ethers.getDefaultProvider();
```

也可以自己提供公开的第三方节点服务提供商，这样就不需要自己运行节点。币安智能链可以使用如下 **Provider :**

```bash
https://binance.ankr.com
https://bsc-dataseed1.binance.org
https://bsc-dataseed2.binance.org
https://bsc-dataseed3.binance.org
https://bsc-dataseed4.binance.org
https://bsc-dataseed1.ninicoin.io
https://bsc-dataseed2.ninicoin.io
https://bsc-dataseed3.ninicoin.io
https://bsc-dataseed4.ninicoin.io
https://bsc-dataseed1.defibit.io
https://bsc-dataseed2.defibit.io
https://bsc-dataseed3.defibit.io
https://bsc-dataseed4.defibit.io
```

以上的随便选一个速度快的节点就行。例：

```jsx
const provider = new JsonRpcProvider('https://bsc-dataseed1.binance.org');
```

### 3、wallet 钱包

设置好 **Provider** 后，第二步就是要设置好要跟合约交互的帐号。帐号我们可以用助记词导入，也可以导入私钥建立钱包帐户。

- 使用私钥

    ```jsx
    let wallet = new Wallet("0x......");
    ```

- 使用助记词

    ```jsx
    let wallet = await ethers.Wallet.fromMnemonic("助记词......");
    ```

- 由助记词生成多个钱包

  在 fromMnemonic 函数中加一个 path 参数即可，缺省的 path 为 m/44'/60'/0'/0/0 。

    ```jsx
    const wallet2 = ethers.Wallet.fromMnemonic("助记词......","m/44'/60'/0'/0/1");
    ```


将钱包跟 Provider 联系起来，这样以后就可以用 signer 签署交易。

```jsx
const signer = wallet.connect(provider);
```

### 4、调用合约的方法

有了钱包，我们就可以调用区块链上的智能合约了。智能合约函数一般分两种：

- 一种是读取区块链上的数据的，不用花费 gas 费用。
- 另一种是改变区块链上数据的，这种就需要钱包签名，然后通过 **Provider** 发送到网上，最后由矿工确认交易。

首先我们要新建一个 `Contract`  类，这个类的参数有三个：

- 合约地址
- 合约的 abi
- 使用的 provider 或 signer

```jsx
const ERC20 = require('@pancakeswap-libs/pancake-swap-core/build/ERC20.json');

const signer = wallet.connect(provider);
const cake = '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82';

const token_contract = new Contract(cake, ERC20.abi, signer);
# 或
const token_contract = new Contract(cake, ERC20.abi, wallet.provider);
```

address 为合约地址，如 cake 地址为：0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82

合约的 abi , 有些可以在 [bscscan.com](http://bscscan.com/) 查找下载使用。因为 cake 是兼容 ERC20 的代币，所以我们使用 ERC20.abi。

以下是调用合约的 balanceOf 只读方法，读取钱包的 cake 余额。

```jsx
amount = await token_contract.balanceOf(wallet.address);
```

发送 cake 到某地址：

```jsx
to = '0x.....';
await token_contract.transfer(to, amount);
```

### 5、设置交易费

在网络繁忙时，我们一般需要加大 gasPrice , 给点好处，让矿工加快处理。

```jsx
# 取当前 gasPrice
let gasPrice = await provider.getGasPrice();
# 在原来的基础上加 5 gwei
let overrides = new Object();
const add_gas = parseUnits(5, 'gwei');
overrides.gasPrice = gasPrice.add(add_gas);

# 调用合约
await token_contract.transfer(to, amount,overrides);
```

### 6、approve

approve 是智能合约的一个基本操作，当我们 defi 时，通常要授权合约权限，让它有权转移我们的币，这个操作就是 approve 。 不过这个有很大的隐患，黑客如果有了合约的权限，就可以随时转走我们钱包上的币，所以对这个操作还是要小心。比如经常换钱包，或者即时取消过期授权。

```jsx
const MAX_AMOUNT = BigNumber.from(2).pow(BigNumber.from(256)).sub(1);
const token_contract = new Contract(token.address, ERC20.abi, signer);
// 授权
await token_contract.approve(ROUTER_ADDRESS, MAX_AMOUNT, overrides);
// 取得授权值
const allowed = await token_contract.allowance(signer.address, ROUTER_ADDRESS);
```

MAX_AMOUNT 值为32字节的最大 2 进值。第二行建立合约类，然后调用合约授权 ROUTER_ADDRESS 有权使用 token。

要读取授权的值，可以调用 allowance 获得。

## 3、pancakeswap 交易实现

首先加入需要的类库：

```bash
yarn add @pancakeswap/sdk
yarn add @uniswap/v2-periphery
yarn add readline-sync
yarn add @ethersproject/contracts
yarn add @ethersproject/providers
yarn add @ethersproject/solidity
yarn add @ethersproject/bignumber
yarn add @ethersproject/units
yarn add @ethersproject/wallet
```

### 1、Token

pancakeswap 使用 Token 对象标识一个通证，要使用，首先我们需要知道这个币的合约地址，其它的有关这个币的基本可以从合约地址取得。如 decimals, symbol 等。

```jsx
import {ChainId,Token} from "@pancakeswap/sdk";
import {Contract} from "@ethersproject/contracts";

const token_contract = new Contract(tokenAddress, ERC20.abi, provider);

const from = new Token(
        ChainId.MAINNET,
        tokenAddress,
        await token_contract.decimals(),
        await token_contract.symbol()
);
```

### 2、交易对 **Pair**

对要交易的两个币，需要先生成对应的交易对，可以使用库提供的 `fetchPairData` 生成 Pair 对象。

```jsx
const pair = await fetchPairData(tokenA,tokenB,wallet); 
```

其中的  tokenA, tokenB 为前面生成的 Token 对象。

### 3、交易路由 Route

交易前，要指定交易的路由，当没有直接的交易池时，可能需要中转。如 tokenA 要换成 tokenB, 并且 A 和 B 直接有交易池，我们就可以写成如下：

```jsx
const route = new Route([pair], tokenA, tokenB);
```

如果没有直接交易池，比如 A 跟 C 有交易池，B 跟 C 有交易池，则示例如下。

```jsx
const pair1 = await fetchPairData(tokenA,tokenC,wallet);
const pair2 = await fetchPairData(tokenB,tokenC,wallet);

const route = new Route([pair1,pair2], tokenA, tokenB);
```

### 4、交易准备 Trade

在调用合约交易前，我们还需要知道调用的参数，交易执行的价格等信息，这些信息可以用如下方法取得：

```jsx
const trade = new Trade(
            route,
            new TokenAmount(tokenA, amount),
            TradeType.EXACT_INPUT
        );
```

如上代码，就是说使用前面定义的 route 路由，amount 为交易数量，就是用 amount  的 A 换取 B,

根据返回的 trade 变量，预期执行的价格为：

```jsx
trade.executionPrice
```

那么能换回多少 B 币呢？我们先要定一个滑点，`const slippageTolerance = new Percent('1', '100');` 定一个1%的滑点

```jsx
const slippageTolerance = new Percent('1', '100');

const amountOutMin = trade.minimumAmountOut(slippageTolerance);
```

amountOutMin 就是最少能换到的 B 币数量！

### 5、调用合约

经过前面的准备，现在终于可以上垒了。还记得我们前面说的，要调用合约，需要先成生合约对象，pancakeswap 合约地址为：`'0x10ED43C718714eb63d5aA57B78B54704E256024E';`

```jsx
const ROUTER_ADDRESS = '0x10ED43C718714eb63d5aA57B78B54704E256024E';
const contract = new Contract(ROUTER_ADDRESS, IUniswapV2Router02.abi, wallet);
```

因为要签名，所以合约先连一下钱包：

```jsx
const s_contract = contract.connect(wallet);
```

然后调用 swapCallParameters 取得调用合约的各项参数：

```jsx
const swapParam = Router.swapCallParameters(
                trade,
                {
                    ttl: 150,
                    recipient: wallet.address,
                    allowedSlippage: slippageTolerance
                });
```

终于可以上手了，来搞一下：

```jsx
overrides.value = swapParam.value;
const ret = await s_contract[swapParam.methodName](...swapParam.args, overrides);
```

## 4、总结

不 BB 了
