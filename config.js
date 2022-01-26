import dotenv from 'dotenv'
import process from 'process';
import readlineSync from "readline-sync";
import {decrypt} from "./aes.js";

function get_mnemonic() {
    dotenv.config();
    const data = process.env.secret;
    let key = readlineSync.question('请输入密码: ', {
        hideEchoBack: true // The typed text on screen is hidden by `*` (default).
    });
    return decrypt(data, key);
}
export const mnemonic = get_mnemonic();
