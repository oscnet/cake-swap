import {
    ChainId,
    Token,
    Trade,
    Route,
    Router,
    TokenAmount,
    TradeType,
    Pair,
    Percent,
    WETH,
    ETHER
} from "@pancakeswap/sdk";
import {Contract} from "@ethersproject/contracts";
import {Wallet} from "@ethersproject/wallet";
import {JsonRpcProvider} from "@ethersproject/providers"
import {parseUnits,formatUnits} from "@ethersproject/units";
// import {ethers} from "ethers";
import {BigNumber} from "@ethersproject/bignumber";
import readlineSync from 'readline-sync';
import {createRequire} from "module";

const require = createRequire(import.meta.url);
const IPancakePair = require('@pancakeswap-libs/pancake-swap-core/build/IPancakePair.json');
const IUniswapV2Router02 = require('@uniswap/v2-periphery/build/IUniswapV2Router02.json');
const ERC20 = require('@pancakeswap-libs/pancake-swap-core/build/ERC20.json');

const ROUTER_ADDRESS = '0x10ED43C718714eb63d5aA57B78B54704E256024E';

function wrappedCurrency(currency, chainId) {
    return currency === ETHER ? WETH[chainId] : currency;
}

async function fetchPairData(tokenA, tokenB, provider) {
    const address = Pair.getAddress(tokenA, tokenB);
    const [reserves0, reserves1] = await new Contract(
        address, IPancakePair.abi, provider).getReserves()
    const balances = tokenA.sortsBefore(tokenB) ? [reserves0, reserves1] : [reserves1, reserves0]
    return new Pair(new TokenAmount(tokenA, balances[0]), new TokenAmount(tokenB, balances[1]))
}

async function check_router_approve(token, amount, signer, overrides = new Object()) {
    const MAX_AMOUNT = BigNumber.from(2).pow(BigNumber.from(256)).sub(1);
    const token_contract = new Contract(token.address, ERC20.abi, signer);
    const allowed = await token_contract.allowance(signer.address, ROUTER_ADDRESS);
    if (allowed.lt(amount)) {
        console.log('approve....');
        await token_contract.approve(ROUTER_ADDRESS, MAX_AMOUNT, overrides);
        console.log('done!');
    }
}

/**
 * 在当前 gasPrice 的基础上再加多少 gwei. 如原来 gasPrice =5 gwei,  gasPriceAdd(provider,1) 则变成 6 gwei
 * @param provider
 * @param gwei
 * @returns {Promise<*|*>}
 */
async function gasPriceAdd(provider, gwei) {
    const add_gas = parseUnits(gwei, 'gwei');
    let gasPrice = await provider.getGasPrice();
    gasPrice = gasPrice.add(add_gas);
    console.log(`use gas price: ${formatUnits(gasPrice, "gwei")}`);
    return gasPrice;
}

/**
 * use pancakeswap , 注意 tokenA, tokenB 最好有直接的路由！ 如果是 BNB，则使用 ETHER
 * @param wallet : signer = wallet.connect(provider);
 * @param tokenA
 * @param tokenB
 * @param amount
 * @param gas : ethers.utils.parseUnits('1', 'gwei') 在原来价格基础上增加 1gwei.
 * @returns {Promise<void>}
 */
export async function trade(wallet, tokenA, tokenB, amount = null, overrides = new Object()) {
    try {
        const token_contract = new Contract(tokenA.address, ERC20.abi, wallet.provider);
        if (amount === null) {
            amount = await token_contract.balanceOf(wallet.address);
            console.log(`amount = ${formatUnits(amount, tokenA.decimals)}`);
        }

        await check_router_approve(tokenA, amount, wallet, overrides);

        const pair = await fetchPairData(
            wrappedCurrency(tokenA, ChainId.MAINNET),
            wrappedCurrency(tokenB, ChainId.MAINNET),
            wallet);
        const route = new Route([pair], tokenA, tokenB);
        const trade = new Trade(
            route,
            new TokenAmount(tokenA, amount),
            TradeType.EXACT_INPUT
        );

        const slippageTolerance = new Percent('1', '100');

        const amountOutMin = trade.minimumAmountOut(slippageTolerance); // needs to be converted to e.g. hex

        console.log(`价格：${trade.executionPrice.toSignificant()}, 最少能换到 ${amountOutMin.toSignificant()} ${tokenB.symbol}`);
        if (readlineSync.keyInYN('是否提交交易？')) {
            const contract = new Contract(ROUTER_ADDRESS, IUniswapV2Router02.abi, wallet);
            const s_contract = contract.connect(wallet);

            const swapParam = Router.swapCallParameters(
                trade,
                {
                    ttl: 150,
                    recipient: wallet.address,
                    allowedSlippage: slippageTolerance
                });
            overrides.value = swapParam.value;

            const ret = await s_contract[swapParam.methodName](...swapParam.args, overrides);
            console.log(ret.hash);
            return true;
        } else {
            console.log('放弃交易');
            return false;
        }
    } catch (error) {
        console.error(error);
    }
}

/**
 * 从每一个帐号中卖出 token_address
 * @param address
 * @param toSymbol: 只支持 'BUSD', or 'BNB'
 * @returns {Promise<void>}
 */
export async function sell(tokenAddress, toSymbol, gas) {
    let to = null;
    if (toSymbol == 'BUSD') {
        to = new Token(
            ChainId.MAINNET,
            "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
            18,
            'BUSD'
        );
    } else if (toSymbol == 'BNB') {
        to = ETHER;
    } else {
        throw '只能换成 BUSD 或 BNB';
    }

    const provider = new JsonRpcProvider('https://bsc-dataseed1.binance.org');
    // const mnemonic = "助记词......";
    // let wallet = await ethers.Wallet.fromMnemonic(mnemonic);
    let wallet = new Wallet("0x......");
    const signer = wallet.connect(provider);

    const token_contract = new Contract(tokenAddress, ERC20.abi, provider);
    const from = new Token(
        ChainId.MAINNET,
        tokenAddress,
        await token_contract.decimals(),
        await token_contract.symbol()
    );

    let overrides = new Object();
    if (!!gas) {
        overrides.gasPrice = await gasPriceAdd(provider, gas.toString());
    }
    const res = await trade(signer, from, to, null, overrides);
    return res;
}

async function main() {
    const doggy = '0x74926B3d118a63F6958922d3DC05eB9C6E6E00c6';
    const JGN = '0xC13B7a43223BB9Bf4B69BD68Ab20ca1B79d81C75';
    const C98 = '0xaEC945e04baF28b135Fa7c640f624f8D90F1C3a6';
    await sell(C98, 'BNB', 0);
}

main().then(
    () => process.exit(),
    err => {
        console.error(err);
        process.exit(-1);
    }
)