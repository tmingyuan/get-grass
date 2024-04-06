
const fetch = require('node-fetch');
const { getLogger } = require('./logUtil');

const { yesCaptcha } = require('./config');


const logger = getLogger('yescaptcha', {toConsole: false});

async function createTask(websiteKey) {
    // 创建验证码识别任务
    const body = {
        clientKey: yesCaptcha.key,
        task: {
            websiteURL: 'https://app.getgrass.io/',
            websiteKey: websiteKey,
            type: 'RecaptchaV2TaskProxyless',
        },
        softID: 33901, // 开发者ID,
    };
    logger.info(`Request: ${JSON.stringify(body)}`);
    const resp = await fetch(yesCaptcha.serverUrl + '/createTask', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
            "content-type": "application/json",
        }
    })
    let data = await resp.text();
    logger.info(`Response: ${data}`);
    return JSON.parse(data)['taskId'];
}

async function _getTaskResult(taskId) {
    const url = yesCaptcha.serverUrl + '/getTaskResult';
    const body = {
        clientKey: yesCaptcha.key,
        taskId: taskId,
    }
    const resp = await fetch(url, {
        body: JSON.stringify(body),
        method: 'POST',
    })
    let text = await resp.text();
    logger.info(`Get Task: ${taskId} result: ${text}`);
    return JSON.parse(text);
}

async function getTaskResult(taskId) {
    // 读取验证码识别结果
    for(let i = 0; i < 10; i++) {
        let data = await _getTaskResult(taskId);
        if (data.status === 'processing') {
            await new Promise(resolve => {setTimeout(() => resolve(), 1000 * 10);})
            continue
        }
        if (data.status === 'ready') {
            return data.solution.gRecaptchaResponse;
        }
    }
    return null;
}

module.exports = {
    createTask,
    getTaskResult,
}