/**
 * 用来生成设备ID，代码是从插件中提取出来的
 * @type {RegExp}
 */
const Cb = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i;
const kb = function (e) {
    return "string" === typeof e && Cb.test(e)
};
const _b = function (e) {
    if (!kb(e)) throw TypeError("Invalid UUID");
    let t;
    const n = new Uint8Array(16);
    return n[0] = (t = parseInt(e.slice(0, 8), 16)) >>> 24, n[1] = t >>> 16 & 255, n[2] = t >>> 8 & 255, n[3] = 255 & t, n[4] = (t = parseInt(e.slice(9, 13), 16)) >>> 8, n[5] = 255 & t, n[6] = (t = parseInt(e.slice(14, 18), 16)) >>> 8, n[7] = 255 & t, n[8] = (t = parseInt(e.slice(19, 23), 16)) >>> 8, n[9] = 255 & t, n[10] = (t = parseInt(e.slice(24, 36), 16)) / 1099511627776 & 255, n[11] = t / 4294967296 & 255, n[12] = t >>> 24 & 255, n[13] = t >>> 16 & 255, n[14] = t >>> 8 & 255, n[15] = 255 & t, n
};
function Eb(e, t, n, r) {
    switch (e) {
        case 0:
            return t & n ^ ~t & r;
        case 1:
        case 3:
            return t ^ n ^ r;
        case 2:
            return t & n ^ t & r ^ n & r
    }
}
const xb = [];
for (let n = 0; n < 256; ++n) xb.push((n + 256).toString(16).slice(1));

function Sb(e) {
    let t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : 0;
    return xb[e[t + 0]] + xb[e[t + 1]] + xb[e[t + 2]] + xb[e[t + 3]] + "-" + xb[e[t + 4]] + xb[e[t + 5]] + "-" + xb[e[t + 6]] + xb[e[t + 7]] + "-" + xb[e[t + 8]] + xb[e[t + 9]] + "-" + xb[e[t + 10]] + xb[e[t + 11]] + xb[e[t + 12]] + xb[e[t + 13]] + xb[e[t + 14]] + xb[e[t + 15]]
}

function Ab(e, t) {
    return e << t | e >>> 32 - t
}

const Pb = function (e) {
    const t = [1518500249, 1859775393, 2400959708, 3395469782],
        n = [1732584193, 4023233417, 2562383102, 271733878, 3285377520];
    if ("string" === typeof e) {
        const t = unescape(encodeURIComponent(e));
        e = [];
        for (let n = 0; n < t.length; ++n) e.push(t.charCodeAt(n))
    } else Array.isArray(e) || (e = Array.prototype.slice.call(e));
    e.push(128);
    const r = e.length / 4 + 2, o = Math.ceil(r / 16), i = new Array(o);
    for (let a = 0; a < o; ++a) {
        const t = new Uint32Array(16);
        for (let n = 0; n < 16; ++n) t[n] = e[64 * a + 4 * n] << 24 | e[64 * a + 4 * n + 1] << 16 | e[64 * a + 4 * n + 2] << 8 | e[64 * a + 4 * n + 3];
        i[a] = t
    }
    i[o - 1][14] = 8 * (e.length - 1) / Math.pow(2, 32), i[o - 1][14] = Math.floor(i[o - 1][14]), i[o - 1][15] = 8 * (e.length - 1) & 4294967295;
    for (let a = 0; a < o; ++a) {
        const e = new Uint32Array(80);
        for (let t = 0; t < 16; ++t) e[t] = i[a][t];
        for (let t = 16; t < 80; ++t) e[t] = Ab(e[t - 3] ^ e[t - 8] ^ e[t - 14] ^ e[t - 16], 1);
        let r = n[0], o = n[1], s = n[2], l = n[3], u = n[4];
        for (let n = 0; n < 80; ++n) {
            const i = Math.floor(n / 20), a = Ab(r, 5) + Eb(i, o, s, l) + u + t[i] + e[n] >>> 0;
            u = l, l = s, s = Ab(o, 30) >>> 0, o = r, r = a
        }
        n[0] = n[0] + r >>> 0, n[1] = n[1] + o >>> 0, n[2] = n[2] + s >>> 0, n[3] = n[3] + l >>> 0, n[4] = n[4] + u >>> 0
    }
    return [n[0] >> 24 & 255, n[0] >> 16 & 255, n[0] >> 8 & 255, 255 & n[0], n[1] >> 24 & 255, n[1] >> 16 & 255, n[1] >> 8 & 255, 255 & n[1], n[2] >> 24 & 255, n[2] >> 16 & 255, n[2] >> 8 & 255, 255 & n[2], n[3] >> 24 & 255, n[3] >> 16 & 255, n[3] >> 8 & 255, 255 & n[3], n[4] >> 24 & 255, n[4] >> 16 & 255, n[4] >> 8 & 255, 255 & n[4]]
}

Ob = function (e, t, n) {
    function r(e, r, o, i) {
        var a;
        if ("string" === typeof e && (e = function (e) {
            e = unescape(encodeURIComponent(e));
            const t = [];
            for (let n = 0; n < e.length; ++n) t.push(e.charCodeAt(n));
            return t
        }(e)), "string" === typeof r && (r = _b(r)), 16 !== (null === (a = r) || void 0 === a ? void 0 : a.length)) throw TypeError("Namespace must be array-like (16 iterable integer values, 0-255)");
        let s = new Uint8Array(16 + e.length);
        if (s.set(r), s.set(e, r.length), s = n(s), s[6] = 15 & s[6] | t, s[8] = 63 & s[8] | 128, o) {
            i = i || 0;
            for (let e = 0; e < 16; ++e) o[i + e] = s[e];
            return o
        }
        return Sb(s)
    }

    try {
        r.name = e
    } catch (o) {
    }
    return r.DNS = "6ba7b810-9dad-11d1-80b4-00c04fd430c8", r.URL = "6ba7b811-9dad-11d1-80b4-00c04fd430c8", r
}("v5", 80, Pb);
Tb = Ob;

function browserInfo2Int(e, t) {
    var n, r, o, i, a, s, l, u;
    for (n = 3 & e.length, r = e.length - n, o = t, a = 3432918353, s = 461845907, u = 0; u < r;) l = 255 & e.charCodeAt(u) | (255 & e.charCodeAt(++u)) << 8 | (255 & e.charCodeAt(++u)) << 16 | (255 & e.charCodeAt(++u)) << 24, ++u, o = 27492 + (65535 & (i = 5 * (65535 & (o = (o ^= l = (65535 & (l = (l = (65535 & l) * a + (((l >>> 16) * a & 65535) << 16) & 4294967295) << 15 | l >>> 17)) * s + (((l >>> 16) * s & 65535) << 16) & 4294967295) << 13 | o >>> 19)) + ((5 * (o >>> 16) & 65535) << 16) & 4294967295)) + ((58964 + (i >>> 16) & 65535) << 16);
    switch (l = 0, n) {
        case 3:
            l ^= (255 & e.charCodeAt(u + 2)) << 16;
        case 2:
            l ^= (255 & e.charCodeAt(u + 1)) << 8;
        case 1:
            o ^= l = (65535 & (l = (l = (65535 & (l ^= 255 & e.charCodeAt(u))) * a + (((l >>> 16) * a & 65535) << 16) & 4294967295) << 15 | l >>> 17)) * s + (((l >>> 16) * s & 65535) << 16) & 4294967295
    }
    return o ^= e.length, o = 2246822507 * (65535 & (o ^= o >>> 16)) + ((2246822507 * (o >>> 16) & 65535) << 16) & 4294967295, o = 3266489909 * (65535 & (o ^= o >>> 13)) + ((3266489909 * (o >>> 16) & 65535) << 16) & 4294967295, (o ^= o >>> 16) >>> 0
}

function generateDeviceId(userName, agentUrl) {
    let tmp = []
    for (let i = 0 ; i < 11; i ++) {
        tmp.push(userName.concat(agentUrl))
    }
    let browserInfo = tmp.join('|');
    let i = browserInfo2Int(browserInfo, 256);
    let r = Tb(i.toString(), "bed9e870-4e94-4260-a1fa-815514adfce1");
    return r
}

module.exports = {
    generateDeviceId,
}
