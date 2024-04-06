const fs = require('fs').promises;
const path = require('path');
const { program } = require('commander');

const { Instance } = require('./src/instance');
const { getLogger } = require('./src/logUtil');
const { GrassApi } = require('./src/grassApi');


let logger = getLogger('default');

async function loadAccountList(accountFilePath) {
    const content = await fs.readFile(accountFilePath);
    const accountList = content.toString()
        .split('\n')
        .map(line => line.trim())
        .filter(line => line !== '')
        .map(line => {
            if (line.includes(';')) {
                let infos = line.split(';');
                if (infos.length === 2) {
                    return {
                        username: infos[0].trim(),
                        password: infos[1].trim(),
                    }
                } else if (infos.length === 4) {
                    return {
                        username: infos[0].trim(),
                        // email: infos[1].trim(),
                        password: infos[2].trim(),
                        // referralLink: infos[3].trim(),
                    }
                }
            } else if (line.includes('----')) {
                let infos = line.split('----');
                return {
                    username: infos[0],
                    password: infos[3],
                    userid: infos[5],
                }
            } else if (line.includes('\t')) {
                let infos = line.split('\t');
                return {
                    username: infos[0].trim(),
                    password: infos[1].trim(),
                    email: infos[2].trim(),
                    userid: infos[3].trim(),
                }
            }
            logger.error(`账号文件: ${accountFilePath} 中含有不支持的行: ${line}`)
            return null;
        })
    return accountList.filter(account => account !== null);
}


async function loadProxylist(proxyFilePath) {
    const content = await fs.readFile(proxyFilePath);
    return content.toString()
        .split('\n')
        .map(line => {
            return line.trim();
        }).filter(url => {
            return url !== '';
        }).map(url => {
            if (url.startsWith('http://')) {
                return url
            } else if (url.startsWith('socks5')) {
                if (url.includes('@')) {
                    return url
                } else {
                    let [ip, port, username, password] = url.split('//') [1] .split(':')
                    return `socks5://${username}:${password}@${ip}:${port}`;
                }
            } else if (url.includes(' ')) {
                let [ipPort, username, password] = url.split(' ');
                return `socks5://${username}:${password}@${ipPort}`;
            }
            let [ip, port, username, password] = url.split(':');
            return `http://${username}:${password}@${ip}:${port}`;
        })
}

async function waitThreeSecondsAsync(s = 3 * 1000) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, s);
    });
}

async function runInstanceWithRestart(username, password, userid, proxy, groupName) {
    logger.info(`Run: ${username} ${password} ${proxy} ${groupName}`);
    try {
        const instance = new Instance(username, password, proxy, userid, groupName);
        await instance.run();
    } catch (error) {
        logger.error(`Run User:${username} - ${password} , Proxy:${proxy} - ${groupName} Fail: ${error.message}`);
        // 重启逻辑
        setTimeout(() =>
            runInstanceWithRestart(username, password, proxy, userid, groupName),
            1000
        );
    }
}


program
    .name('index.js')
    .description('启动 Grass 赚积分进程')

program.command('one2one')
    .description('1账号1IP模式')
    .argument('<string>', '账号文件名称')
    .argument('<string>', '代理文件名称')
    .argument('<string>', '分组名称')
    .action(async (accountFileName, proxyFileName, groupName) => {
        const accountList = await loadAccountList(path.join(__dirname, 'file', accountFileName));
        const proxyList = await loadProxylist(path.join(__dirname, 'file', proxyFileName));
        logger.info(`读取账号文件: ${accountFileName}, 账号数量: ${accountList.length}`);
        logger.info(`读取地址文件: ${proxyFileName}, 地址数量: ${proxyList.length}`);
        for(let i = 0; i < accountList.length; i++) {
            const account = accountList[i];
            const proxyUrl = proxyList[i % proxyList.length];
            runInstanceWithRestart(account.username, account.password, account.userid, proxyUrl, groupName)
                .catch(error => {
                    logger.error(`Run: ${account.username}-${account.password}-${proxyUrl} error: ${error}`);
                })
            await waitThreeSecondsAsync(100)
        }
    });


program.command('one2many')
    .description('1账号下挂多个IP模式')
    .argument('<string>', '账号文件路径')
    .argument('<string>', '代理文件路径')
    .argument('<number>', '每个账号下挂的IP数量')
    .argument('<string>', '分组名称')
    .action(async (accountFileName, proxyFileName, ipNumber, groupName) => {
        ipNumber = parseInt(ipNumber);
        const accountList = await loadAccountList(path.join(__dirname, 'file', accountFileName));
        const proxyList = await loadProxylist(path.join(__dirname, 'file', proxyFileName));
        logger.info(`读取账号文件: ${accountFileName}, 账号数量: ${accountList.length}`);
        logger.info(`读取地址文件: ${proxyFileName}, 地址数量: ${proxyList.length}`);
        for(let i = 0; i < accountList.length; i++) {
            const account = accountList[i];
            for(let j = 0; j < ipNumber; j++) {
                let proxyIndex = (i * ipNumber + j) % proxyList.length
                const proxyUrl = proxyList[proxyIndex];
                runInstanceWithRestart(account.username, account.password, account.userid, proxyUrl, `${groupName}_${j}`)
                    .catch(error => {
                        logger.error(`Run: ${account.username}-${account.password}-${proxyUrl} error: ${error}`);
                    })
                await waitThreeSecondsAsync(100)
            }
        }
    });

program.command('superman')
    .description('一个账号挂完所有IP')
    .argument('<string>', '用户名')
    .argument('<string>', '密码')
    .argument('<string>', '代理文件路径')
    .action(async (username, password, proxyFileName) => {
        const proxyList = await loadProxylist(path.join(__dirname, '../../data', proxyFileName));
        logger.info(`用户名: ${username} , 密码: ${password}`);
        logger.info(`读取地址文件: ${proxyFileName}, 地址数量: ${proxyList.length}`);
        const grassApi = new GrassApi(username, password, proxyList[0]);
        const userid = await grassApi.getUserId();
        logger.info(`Get User ID: ${userid}`);
        for(let i = 0; i < proxyList.length; i++) {
            const proxyUrl = proxyList[i];
            runInstanceWithRestart(username, password, userid, proxyUrl, `${username}_${i}`)
                .catch(error => {
                    logger.error(`Run: ${username}-${password}-${proxyUrl} ${i} error: ${error}`);
                })
            await waitThreeSecondsAsync(100)
        }
    });


program.parse();


