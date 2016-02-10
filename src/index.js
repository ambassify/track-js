'use strict';

const shortlinkRe = /^(https?:\/\/[^/]+\/[0-9a-z]+)(?:\/([0-9a-z-_=]+))?\/?/i;
const shortcodeRe = /^[0-9a-z]+$/i;

const b64encRe = /[+/=]/g;
const b64decRe = /[-_]/g;

const b64encFunc = (match) => {
    if (match == '=')
        return '';
    else if (match == '+')
        return '-';
    else if (match == '/')
        return '_';
};

const b64decFunc = (match) => {
    if (match == '-')
        return '+';
    else if (match == '_')
        return '/';
};

const longToShort = {
    'url': 'u',
    'propertyId': 'p',
    'context': 'ct',
    'account': 'ac',
    'object': 'ob',
    'interaction': 'it',
    'actor': 'at',
    'referrer': 'rf',
    'eventCategory': 'ec',
    'eventAction': 'ea',
};

const encode = (v) => btoa(JSON.stringify(v)).replace(b64encRe, b64encFunc);
const decode = (str) => {
    try {
        return JSON.parse(atob(str.replace(b64decRe, b64decFunc)));
    } catch (e) { }
}
const shrink = o => {
    for (var key in o) {
        if (o.hasOwnProperty(key) && longToShort.hasOwnProperty(key)) {
            o[longToShort[key]] = o[key];
            delete o[key];
        }
    }
    return o;
};

const create = (params, options) => new Promise((resolve, reject) => {
    if (!options.endpoint)
        reject(new Error('No endpoint specified in options.'));

    const url = `${options.endpoint}/api/r`;

    const request = new XMLHttpRequest();
    request.open('POST', url, true);
    request.setRequestHeader('Content-Type', 'application/json');

    request.onload = function() {
        const text = request.responseText;
        const status = request.status;
        let data = null;

        try {
            data = JSON.parse(text);
        } catch (e) { }

        const ok = status === 200 || status === 201;

        if (!data || (ok && !data.shortlink) || (!ok && !data.message))
            reject(new Error(`Invalid response from endpoint: ${text}`));

        if (ok) {
            resolve(data.shortlink);
        } else {
            reject(new Error(`Endpoint responded [${status}]: ${data.message}`));
        }
    };

    request.onerror = function() {
        reject(new Error('Failed to connect to endpoint.'));
    };

    request.send(JSON.stringify(params));
})

export default
class TrackJS {
    constructor(options) {
        this.options = options;
        this.options.baseUrl = options.baseUrl || options.endpoint;
    }

    shorten(params) {
        params = shrink(params);
        params.p = params.p || this.options.propertyId;
        return create(params, this.options);
    }

    override(url, params) {
        let newUrl = '';
        let baseParams = {};
        let match = shortcodeRe.exec(url);

        if (match) {
            if (!this.options.baseUrl)
                throw new Error('No baseUrl or endpoint specified in options.');
            newUrl = `${this.options.baseUrl}/${url}/`;
        } else if (match = shortlinkRe.exec(url)) {
            newUrl = `${match[1]}/`;
            if (match.length > 2 && match[2])
                baseParams = decode(match[2]) || {};
        } else {
            throw new Error(`Not a valid url or shortcode: ${url}`);
        }

        Object.assign(shrink(baseParams), shrink(params));

        if (Object.keys(baseParams).length) {
            newUrl += `${encode(baseParams)}/`;
        }

        return newUrl;
    }
}
