'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Fetch = require('isomorphic-unfetch');

var _require = require('compact-base64'),
    encodeUrl = _require.encodeUrl,
    decodeUrl = _require.decodeUrl;

var shortlinkRe = /^(https?):\/\/([^/]+)\/r\/([0-9a-z]+)(?:\/([0-9a-z-_=]+))?(\/?[\?#].+)?/i;
var shortcodeRe = /^[0-9a-z]+$/i;

var pixelTypes = {
    gif: '.gif',
    empty: ''
};

var responseTypes = {
    OK: 'ok',
    UNAUTHORIZED: 'unauthorized',
    UNKNOWN: 'unknown'
};

var longToShort = {
    'url': 'u',
    'propertyId': 'p',
    'context': 'ct',
    'account': 'ac',
    'object': 'ob',
    'interaction': 'it',
    'actor': 'at',
    'referrer': 'rf',
    'eventCategory': 'ec',
    'eventAction': 'ea'
};

var attempt = function attempt(fn) {
    try {
        return fn();
    } catch (e) {}
};
var encode = function encode(v) {
    return encodeUrl((0, _stringify2.default)(v));
};
var decode = function decode(v) {
    return attempt(function () {
        return JSON.parse(decodeUrl(v));
    });
};

var shrink = function shrink(o) {
    for (var key in o) {
        if (o.hasOwnProperty(key) && longToShort.hasOwnProperty(key)) {
            o[longToShort[key]] = o[key];
            delete o[key];
        }
    }
    return o;
};

var error = function error(type, status, message, response) {
    var err = new Error(message);
    err.type = type;
    err.status = status;
    err.message = message;
    err.response = response;
    throw err;
};

var create = function create(params, options) {
    return _promise2.default.resolve().then(function () {
        if (!options.endpoint) throw new Error('No endpoint specified in options.');

        var fetch = options.fetch || Fetch;
        var url = options.endpoint + '/api/r';
        var headers = { 'Content-Type': 'application/json' };

        if (options.accessToken) headers['X-API-KEY'] = options.accessToken;

        return fetch(url, {
            headers: headers,
            method: 'POST',
            body: (0, _stringify2.default)(params || {})
        }).then(function (resp) {
            return _promise2.default.all([resp, resp.status, resp.text()]);
        }).catch(function (err) {
            return error(responseTypes.UNKNOWN, null, err.message || 'Failed to connect to endpoint', null);
        }).then(function (_ref) {
            var _ref2 = (0, _slicedToArray3.default)(_ref, 3),
                resp = _ref2[0],
                status = _ref2[1],
                text = _ref2[2];

            var ok = status === 200 || status === 201;
            var data = attempt(function () {
                return JSON.parse(text);
            });

            if (status === 401 || status === 403) {
                return error(responseTypes.UNAUTHORIZED, status, 'Unauthorized', data || text);
            }

            if (!data || ok && !data.shortlink || !ok && !data.message) {
                return error(responseTypes.UNKNOWN, status, 'Invalid response from endpoint', text);
            }

            if (!ok) {
                return error(responseTypes.UNKNOWN, status, data.message, data);
            }

            return data.shortlink;
        });
    });
};

var parseShortcode = function parseShortcode(shortcode) {
    return shortcodeRe.test(shortcode) ? { shortcode: shortcode } : false;
};

var parseShortlink = function parseShortlink(url, baseUrl) {
    var m = shortlinkRe.exec(url);

    if (!m || baseUrl && baseUrl.replace(/^(https?:)?\/\//, '') !== m[2]) return false;

    return {
        protocol: m[1],
        domain: m[2],
        shortcode: m[3],
        override: m.length > 4 && m[4] ? decode(m[4]) || {} : {},
        remainder: m[5] || ''
    };
};

var loadImg = function loadImg(url) {
    var image = new Image();
    image.src = url;
};

var TrackJS = function () {
    function TrackJS(options) {
        (0, _classCallCheck3.default)(this, TrackJS);

        options = options || {};

        var baseUrl = options.baseUrl;
        var endpoint = options.endpoint;

        baseUrl = typeof baseUrl == 'string' ? baseUrl.replace(/\/+$/, '') : baseUrl;
        endpoint = typeof endpoint == 'string' ? endpoint.replace(/\/+$/, '') : endpoint;
        baseUrl = baseUrl || endpoint;

        this.options = options;
        this.options.strict = options.strict || false;
        this.options.baseUrl = baseUrl;
        this.options.endpoint = endpoint;

        if (this.options.strict && !this.options.baseUrl) throw new Error('baseUrl or endpoint required in strict mode.');
    }

    (0, _createClass3.default)(TrackJS, [{
        key: 'shorten',
        value: function shorten(params, override) {
            var _this = this;

            params = shrink(params);
            params.p = params.p || this.options.propertyId;

            return create(params, this.options).then(function (link) {
                return override ? _this.override(link, override) : link;
            });
        }
    }, {
        key: 'override',
        value: function override(short, params) {
            var newUrl = '';
            var baseParams = {};
            var parsed = parseShortcode(short);
            var remainder = '';

            if (parsed && !this.options.baseUrl) {
                throw new Error('baseUrl or endpoint not specified in options.');
            } else if (parsed) {
                newUrl = this.options.baseUrl + '/r/' + parsed.shortcode;
            } else {
                parsed = this.options.strict ? parseShortlink(short, this.options.baseUrl) : parseShortlink(short);

                if (parsed) {
                    remainder = parsed.remainder;
                    var _parsed = parsed,
                        protocol = _parsed.protocol,
                        domain = _parsed.domain,
                        shortcode = _parsed.shortcode,
                        override = _parsed.override;

                    newUrl = protocol + '://' + domain + '/r/' + shortcode;
                    baseParams = override;
                } else {
                    throw new Error('Not a valid shortlink or shortcode: ' + short);
                }
            }

            (0, _assign2.default)(shrink(baseParams), shrink(params));

            if ((0, _keys2.default)(baseParams).length) {
                newUrl += '/' + encode(baseParams);
            }

            return newUrl + remainder;
        }
    }, {
        key: 'overrideOnly',
        value: function overrideOnly(params) {
            if (!this.options.baseUrl) throw new Error('baseUrl or endpoint not specified in options.');

            return this.options.baseUrl + '/or/' + encode(shrink(params));
        }
    }, {
        key: 'id',
        value: function id(ambassadorId, accountId) {
            var type = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : pixelTypes.gif;
            var load = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;

            if (!this.options.baseUrl) throw new Error('baseUrl or endpoint not specified in options.');

            var url = this.options.baseUrl + '/id/' + accountId + '/' + ambassadorId + type;

            if (load) loadImg(url);

            return url;
        }
    }, {
        key: 'pixel',
        value: function pixel() {
            var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
            var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : pixelTypes.gif;
            var load = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

            if (!this.options.baseUrl) throw new Error('baseUrl or endpoint not specified in options.');

            shrink(params);
            params.p = params.p || this.options.propertyId;

            var url = this.options.baseUrl + '/pixel/' + encode(params) + type;

            if (load) loadImg(url);

            return url;
        }
    }]);
    return TrackJS;
}();

exports.default = TrackJS;


TrackJS.PIXEL_TYPES = pixelTypes;
TrackJS.RESPONSE_TYPES = responseTypes;