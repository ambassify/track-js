'use strict';

const XMLHttpRequest = XMLHttpRequest || require('xhr2' + '');
const { encodeUrl, decodeUrl } = require('compact-base64');

const shortlinkRe = /^(https?):\/\/([^/]+)\/r\/([0-9a-z]+)(?:\/([0-9a-z-_=]+))?/i;
const shortcodeRe = /^[0-9a-z]+$/i;

const pixelTypes = {
    gif: '.gif',
    empty: ''
}

const responseTypes = {
    OK: 'ok',
    UNAUTHORIZED: 'unauthorized',
    UNKNOWN: 'unknown'
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

const encode = (v) => encodeUrl(JSON.stringify(v));
const decode = (v) => { try { return JSON.parse(decodeUrl(v)); } catch(e) {}; };

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

    if (options.accessToken)
        request.setRequestHeader('X-API-KEY', options.accessToken);

    request.onload = function() {
        const text = request.responseText;
        const status = request.status;
        let data = null;

        try {
            data = JSON.parse(text);
        } catch (e) { }

        const ok = status === 200 || status === 201;

        if (status === 401 || status === 403)
            return reject({
                type: responseTypes.UNAUTHORIZED,
                status: status,
                message: 'Unauthorized',
                response: data || text
            });

        if (!data || (ok && !data.shortlink) || (!ok && !data.message))
            return reject({
                type: responseTypes.UNKNOWN,
                status: status,
                message: 'Invalid response from endpoint',
                response: text
            });

        if (!ok)
            return reject({
                type: responseTypes.UNKNOWN,
                status: status,
                message: data.message,
                response: data
            });

        resolve(data.shortlink);
    };

    request.onerror = function() {
        reject({
            type: responseTypes.UNKNOWN,
            status: null,
            message: 'Failed to connect to endpoint',
            response: null
        });
    };

    request.send(JSON.stringify(params));
})

const parseShortcode = (shortcode) => {
    return shortcodeRe.test(shortcode) ? { shortcode } : false;
}

const parseShortlink = (url, baseUrl) => {
    const m = shortlinkRe.exec(url);

    if (!m || (baseUrl && baseUrl.replace(/^(https?:)?\/\//, '') !== m[2]))
        return false;

    return {
        protocol: m[1],
        domain: m[2],
        shortcode: m[3],
        override: m.length > 4 && m[4] ? decode(m[4]) || {} : {}
    };
}

const loadImg = (url) => {
    const image = new Image();
    image.src = url;
}

export default
class TrackJS {
    constructor(options) {
        options = options || {};
        const baseUrl = options.baseUrl || options.endpoint;

        this.options = options;
        this.options.strict = options.strict || false;
        this.options.baseUrl = baseUrl.replace(/\/+$/, '');

        if (this.options.strict && !this.options.baseUrl)
            throw new Error('baseUrl or endpoint required in strict mode.');
    }

    shorten(params, override) {
        params = shrink(params);
        params.p = params.p || this.options.propertyId;

        return create(params, this.options)
            .then(link => override ? this.override(link, override) : link);
    }

    override(short, params) {
        let newUrl = '';
        let baseParams = {};
        let parsed = parseShortcode(short);

        if (parsed && !this.options.baseUrl) {
            throw new Error('baseUrl or endpoint not specified in options.');
        } else if (parsed) {
            newUrl = `${this.options.baseUrl}/r/${parsed.shortcode}`;
        } else {
            parsed = this.options.strict ?
                parseShortlink(short, this.options.baseUrl) :
                parseShortlink(short);

            if (parsed) {
                const { protocol, domain, shortcode, override } = parsed;
                newUrl = `${protocol}://${domain}/r/${shortcode}`;
                baseParams = override;
            } else {
                throw new Error(`Not a valid shortlink or shortcode: ${short}`);
            }
        }

        Object.assign(shrink(baseParams), shrink(params));

        if (Object.keys(baseParams).length) {
            newUrl += `/${encode(baseParams)}`;
        }

        return newUrl;
    }

    id(ambassadorId, accountId, type = pixelTypes.gif, load = false) {
        if (!this.options.baseUrl)
            throw new Error('baseUrl or endpoint not specified in options.');

        const url =
            `${this.options.baseUrl}/id/${accountId}/${ambassadorId}${type}`;

        if (load)
            loadImg(url);

        return url;
    }

    pixel(params = {}, type = pixelTypes.gif, load = false) {
        if (!this.options.baseUrl)
            throw new Error('baseUrl or endpoint not specified in options.');

        shrink(params);
        params.p = params.p || this.options.propertyId;

        const url = `${this.options.baseUrl}/pixel/${encode(params)}${type}`;

        if (load)
            loadImg(url);

        return url;
    }
}

TrackJS.PIXEL_TYPES = pixelTypes;
TrackJS.RESPONSE_TYPES = responseTypes;
