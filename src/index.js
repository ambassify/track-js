'use strict';

const Fetch = require('isomorphic-unfetch');
const { encodeUrl, decodeUrl } = require('compact-base64');

const shortlinkRe = /^(https?):\/\/([^/]+)\/r\/([0-9a-z]+)(?:\/([0-9a-z-_=]+))?(\/?[\?#].+)?/i;
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

const attempt = (fn) => { try { return fn(); } catch(e) {} };
const encode = (v) => encodeUrl(JSON.stringify(v));
const decode = (v) => attempt(() => JSON.parse(decodeUrl(v)));

const shrink = o => {
    for (var key in o) {
        if (o.hasOwnProperty(key) && longToShort.hasOwnProperty(key)) {
            o[longToShort[key]] = o[key];
            delete o[key];
        }
    }
    return o;
};

const error = (type, status, message, response) => {
    const err = new Error(message);
    err.type = type;
    err.status = status;
    err.message = message;
    err.response = response;
    throw err;
}

const create = (params, options) => Promise.resolve()
.then(() => {
    if (!options.endpoint)
        throw new Error('No endpoint specified in options.');

    const fetch = options.fetch || Fetch;
    const url = `${options.endpoint}/api/r`;
    const headers = { 'Content-Type': 'application/json' };

    if (options.accessToken)
        headers['X-API-KEY'] = options.accessToken;

    return fetch(url, {
        headers,
        method: 'POST',
        body: JSON.stringify(params || {})
    })
    .then(resp => Promise.all([
        resp,
        resp.status,
        resp.text()
    ]))
    .catch(err => {
        return error(responseTypes.UNKNOWN, null,
            err.message || 'Failed to connect to endpoint', null);
    })
    .then(([ resp, status, text ]) => {
        const ok = status === 200 || status === 201;
        let data = attempt(() => JSON.parse(text));

        if (status === 401 || status === 403) {
            return error(responseTypes.UNAUTHORIZED, status,
                'Unauthorized', data || text);
        }

        if (!data || (ok && !data.shortlink) || (!ok && !data.message)) {
            return error(responseTypes.UNKNOWN, status,
                'Invalid response from endpoint', text);
        }

        if (!ok) {
            return error(responseTypes.UNKNOWN, status, data.message, data);
        }

        return data.shortlink;
    });
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
        override: m.length > 4 && m[4] ? decode(m[4]) || {} : {},
        remainder: m[5] || ''
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

        let baseUrl = options.baseUrl;
        let endpoint = options.endpoint;

        baseUrl = typeof baseUrl == 'string' ? baseUrl.replace(/\/+$/, '') : baseUrl;
        endpoint = typeof endpoint == 'string' ? endpoint.replace(/\/+$/, '') : endpoint;
        baseUrl = baseUrl || endpoint;

        this.options = options;
        this.options.strict = options.strict || false;
        this.options.baseUrl = baseUrl;
        this.options.endpoint = endpoint;

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
        let remainder = '';

        if (parsed && !this.options.baseUrl) {
            throw new Error('baseUrl or endpoint not specified in options.');
        } else if (parsed) {
            newUrl = `${this.options.baseUrl}/r/${parsed.shortcode}`;
        } else {
            parsed = this.options.strict ?
                parseShortlink(short, this.options.baseUrl) :
                parseShortlink(short);

            if (parsed) {
                remainder = parsed.remainder;
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

        return newUrl + remainder;
    }

    overrideOnly(params) {
        if (!this.options.baseUrl)
            throw new Error('baseUrl or endpoint not specified in options.');

        return `${this.options.baseUrl}/or/${encode(shrink(params))}`;
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
