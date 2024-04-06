/**
 * 种草脚本， 模拟浏览器插件行为，和服务端建立通信
 * 依赖登录后的用户信息 & 静态代理(支持http代理和socks5代理)
 *
 */
const crypto = require('crypto');
const WebSocket = require('ws');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');

const { GrassApi } = require('./grassApi');
const { generateDeviceId } = require('./generate_deviceid')
const { getLogger } = require('./logUtil');


const WEBSOCKET_URLS = [
    "wss://proxy.wynd.network:4650",
    "wss://proxy.wynd.network:4444",
];
const version = '3.3.2'
const PING_INTERVAL = 20 * 1000;  // Ping 服务器的间隔
const STATUSES = {
    CONNECTED: "CONNECTED",
    DISCONNECTED: "DISCONNECTED",
    DEAD: "DEAD",
    CONNECTING: "CONNECTING",
};
const PENDING_STATES = [
    0, // CONNECTING
    2, // CLOSING
];

function uuidv4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
        (
            c ^
            (crypto.randomFillSync(new Uint8Array(1))[0] & (15 >> (c / 4)))
        ).toString(16)
    );
}

const getUnixTimestamp = () => Math.floor(Date.now() / 1000);
const isUUID = (id) => typeof id === "string" && id.length === 36;

class Instance {
    constructor(username, password, agentUrl, userId=null, groupName='') {
        this.username = username;
        this.password = password;
        this.agentUrl = agentUrl;
        this.userId = userId;
        this.groupName = groupName;
        this.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';
        this.websocket = false;
        this.lastLiveConnectionTimestamp = getUnixTimestamp();
        this.browserId = generateDeviceId(username, agentUrl); // 根据用户名和代理生成一个固定的设备ID
        if (agentUrl.startsWith('socks5')) {
            this.agent = new SocksProxyAgent(agentUrl);
        } else {
            this.agent = new HttpsProxyAgent(agentUrl);
        }
        this.grassApi = new GrassApi(username, password, agentUrl);
        // this.logger = getLogger(this.username + '_' + this.groupName, {toConsole: false});
        this.logger = getLogger(this.username + '_' + this.groupName, {toConsole: true});
        this.retries = 0;  // 重试的次数
        this.checkingTimes = 0; // 检查状态时在连接中的次数
    }

    async run() {
        this.logger.info(`Run Instance: username=${this.username}, password=${this.password}, proxy=${this.agentUrl}`)
        this.logger.info(`UserAgent=${this.userAgent}`);
        this.logger.info(`BrowserId is ${this.browserId}`);

        if (this.userId === null) {
            this.userId = await this.grassApi.getUserId();
        }
        this.logger.info(`User ID is : ${this.userId}`);

        this.connect();

        setInterval(async () => {
            if (this.websocket) {
                if (this.websocket.readyState === 1) {
                    this.websocketStatus = STATUSES.CONNECTED;
                } else if (this.websocket.readyState === 3) {
                    this.websocketStatus = STATUSES.DISCONNECTED;
                }
                // Check WebSocket state and make sure it's appropriate
                if (PENDING_STATES.includes(this.websocket.readyState)) {
                    this.logger.warn(`WebSocket not in appropriate state for liveness check... ${this.checkingTimes}`);
                    this.checkingTimes ++;
                    // 尝试解决持续再连接中的问题
                    if (this.checkingTimes > 100) {
                        this.logger.error('连续100次都在连接中，主动关闭&重连');
                        try {this.websocket.close()}catch(e) {}
                        this.connect();
                    }
                    return;
                } else {
                    this.checkingTimes = 0;
                }
            } else {
                this.logger.error('websocket 还没有准备好');
            }
            let websocketState = this.websocket.readyState;
            // Check if timestamp is older than ~15 seconds. If it
            // is the connection is probably dead and we should restart it.
            const current_timestamp = getUnixTimestamp();
            const seconds_since_last_live_message =
                current_timestamp - this.lastLiveConnectionTimestamp;

            if (seconds_since_last_live_message > 29 || websocketState === 3) {
                this.logger.error("WebSocket does not appear to be live! Restarting the WebSocket connection...");
                try {
                    this.websocket.close();
                } catch (e) {
                    // Do nothing.
                }
                this.connect();
                return;
            }

            // Send PING message down websocket, this will be
            // replied to with a PONG message form the server
            // which will trigger a function to update the
            // lastLiveConnectionTimestamp variable.

            // If this timestamp gets too old, the WebSocket
            // will be severed and started again.
            this.send({
                id: uuidv4(),
                version: "1.0.0",
                action: "PING",
                data: {},
            });
        }, PING_INTERVAL);

    }
    connect() {
        if (this.retries > 1000) {
            this.logger.error(`${this.username} - ${this.password} - ${this.agentUrl} -${this.userId} 连接失败次数超过千次, 毁灭吧`);
        }
        const websocketUrl = WEBSOCKET_URLS[this.retries % WEBSOCKET_URLS.length];
        this.logger.info(`Websocket Url is ${websocketUrl}, retries=${this.retries}`)
        this.websocket = new WebSocket(websocketUrl, {
            agent: this.agent,
            rejectUnauthorized: false, // 忽略服务端证书签名问题
        });
        this.websocket.onopen = this.onopen.bind(this);
        this.websocket.onmessage = this.onmessage.bind(this);
        this.websocket.onerror = this.onerror.bind(this);
        this.websocket.onclose = this.onclose.bind(this);
    }
    async onopen() {
        this.logger.info('Websocket Open')
        this.lastLiveConnectionTimestamp = getUnixTimestamp();
        this.websocketStatus = STATUSES.CONNECTED;
    }
    async onmessage(event) {
        this.logger.info(`Get : ${event.data}`)
        this.lastLiveConnectionTimestamp = getUnixTimestamp();
        let parsedMessage = JSON.parse(event.data);
        let action = parsedMessage.action;
        let result = null;
        if (action === 'AUTH') {
            result = await this.authenticate();
        } else if (action === 'PONG') {
            // 生么也不做
        } else {
            this.logger.error(`服务端发送了不支持的Action: ${action}`);
        }
        this.send({
            // Use same ID so it can be correlated with the response
            id: parsedMessage.id,
            origin_action: parsedMessage.action,
            result: result,
        })
    }
    async onerror(error) {
        this.logger.error(`Websocket Error: ${error.message}`);
    }
    async onclose(event) {
        if (event.wasClean) {
            this.logger.error(`Websocket Close. Connection closed cleanly, code=${event.code} reason=${event.reason}`);
        } else {
            this.logger.error(`Websocket Close. Connection died.`)
            this.websocketStatus = STATUSES.DEAD;
            this.retries ++;
        }
    }
    async authenticate() {
        if (this.userId === null) {
            this.userId =  await this.grassApi.getUserId();
        }
        const authenticationResponse = {
            browser_id: this.browserId,
            user_id: this.userId,
            version,
            user_agent: this.userAgent,
            timestamp: getUnixTimestamp(),
            device_type: "extension",
        };
        this.logger.info(`Generate AuthenticationResponse: ${JSON.stringify(authenticationResponse)}`)
        return authenticationResponse;
    }
    send(data) {
        const sendData = JSON.stringify(data);
        this.logger.info(`Send: ${sendData}`)
        try {
            this.websocket.send(sendData);
        } catch {}
    }
}


module.exports = {
    Instance,
}

