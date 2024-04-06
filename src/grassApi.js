const fetch = require('node-fetch')
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');
const querystring = require('querystring');



const headers = {
    "accept": "application/json, text/plain, */*",
    "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
    "sec-ch-ua": "\"Not_A Brand\";v=\"8\", \"Chromium\";v=\"120\", \"Google Chrome\";v=\"120\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"macOS\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "none",
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

class GrassApi {
    constructor(username, password, agentUrl='') {
        this.server = 'https://api.getgrass.io'
        this.username = username;
        this.password = password;
        this.token = null;
        this.userInfo = null;
        this.userId = null;
        this.agent = null;
        if (agentUrl !== '') {
            if (agentUrl.startsWith('socks5')) {
                this.agent = new SocksProxyAgent(agentUrl);
            } else {
                this.agent = new HttpsProxyAgent(agentUrl);
            }
        }
    }

    async login() {
        const body = JSON.stringify({
            username: this.username,
            password: this.password,
        })
        const resp = await fetch("https://api.getgrass.io/login", {
            "headers": headers,
            "referrer": "https://app.getgrass.io/",
            "referrerPolicy": "strict-origin-when-cross-origin",
            "body": body,
            "method": "POST",
            "mode": "cors",
            "credentials": "omit"
        });
        const data = await resp.json();
        return data['result']['data'];
    }
    async get(path, params={}) {
        const url = `${this.server}${path}?${querystring.stringify(params)}`;
        const tokenStr = await this.getToken();
        headers['cookie'] = `token=${tokenStr}`
        const resp = await fetch(url, {
            "headers": headers,
            "referrerPolicy": "strict-origin-when-cross-origin",
            "method": "GET",
            "agent": this.agent,
        })
        const text = await resp.text();
        const data = JSON.parse(text)
        return data['result']['data'];
    }
    async retrieveUser() {
        return this.get('/retrieveUser');
    }

    async dailyEarnings() {
        const path = '/dailyEarnings';
        const params = {
            input: JSON.stringify({limit: 25}),
        }
        const data = await this.get(path, params);
        return data.data;
    }

    async devices() {
        const path = '/devices';
        const params = {
            input: JSON.stringify({"limit":5}),
        }
        const data = await this.get(path, params)
        return data.data;
    }

    async ranks() {
        return this.get('/ranks');
    }

    async retrieveUserSettings() {
        return this.get('/retrieveUserSettings');
    }

    async epochEarnings() {
        const path = '/epochEarnings';
        const params = {
            input: JSON.stringify({"limit":1}),
        }
        return this.get(path, params);
    }
    async activeDevices() {
        const path = '/activeDevices';
        return this.get(path);
    }

    getTokenFromHeader(header) {
        const cookie = header.get('set-cookie');
        return cookie.split('=')[1].split(';')[0].trim()
    }

    async _initUser() {
        const {accessToken, userId} = await this.login(this.username, this.password);
        this.token = accessToken;
        this.userId = userId;
        this.userInfo = await this.retrieveUser();
    }

    async getUserId() {
        if(this.userId === null) {
            await this._initUser();
        }
        return this.userId;
    }

    async getUserInfo() {
        if(this.userInfo === null) {
            await this._initUser();
        }
        return this.userInfo;
    }
    async getToken() {
        if(this.token === null) {
            await this._initUser();
        }
        return this.token;
    }
}

module.exports = {
    GrassApi,
}