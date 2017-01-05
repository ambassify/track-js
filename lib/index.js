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

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var XMLHttpRequest = XMLHttpRequest || require('xhr2' + '');

var _require = require('compact-base64');

var encodeUrl = _require.encodeUrl;
var decodeUrl = _require.decodeUrl;


var shortlinkRe = /^(https?):\/\/([^/]+)\/r\/([0-9a-z]+)(?:\/([0-9a-z-_=]+))?/i;
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

var encode = function encode(v) {
    return encodeUrl((0, _stringify2.default)(v));
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

var create = function create(params, options) {
    return new _promise2.default(function (resolve, reject) {
        if (!options.endpoint) reject(new Error('No endpoint specified in options.'));

        var url = options.endpoint + '/api/r';

        var request = new XMLHttpRequest();
        request.open('POST', url, true);
        request.setRequestHeader('Content-Type', 'application/json');

        if (options.accessToken) request.setRequestHeader('X-API-KEY', options.accessToken);

        request.onload = function () {
            var text = request.responseText;
            var status = request.status;
            var data = null;

            try {
                data = JSON.parse(text);
            } catch (e) {}

            var ok = status === 200 || status === 201;

            if (status === 401 || status === 403) return reject({
                type: responseTypes.UNAUTHORIZED,
                status: status,
                message: 'Unauthorized',
                response: data || text
            });

            if (!data || ok && !data.shortlink || !ok && !data.message) return reject({
                type: responseTypes.UNKNOWN,
                status: status,
                message: 'Invalid response from endpoint',
                response: text
            });

            if (!ok) return reject({
                type: responseTypes.UNKNOWN,
                status: status,
                message: data.message,
                response: data
            });

            resolve(data.shortlink);
        };

        request.onerror = function () {
            reject({
                type: responseTypes.UNKNOWN,
                status: null,
                message: 'Failed to connect to endpoint',
                response: null
            });
        };

        request.send((0, _stringify2.default)(params));
    });
};

var parseShortcode = function parseShortcode(shortcode) {
    return shortcodeRe.test(shortcode) ? { shortcode: shortcode } : false;
};

var parseShortlink = function parseShortlink(url, baseUrl) {
    var m = shortlinkRe.exec(url);

    if (!m || baseUrl && baseUrl.replace(/(https?:)?\/\//, '') !== m[2]) return false;

    return {
        protocol: m[1],
        domain: m[2],
        shortcode: m[3],
        override: m.length > 4 && m[4] ? decodeUrl(m[4]) || {} : {}
    };
};

var loadImg = function loadImg(url) {
    var image = new Image();
    image.src = url;
};

var TrackJS = function () {
    function TrackJS(options) {
        (0, _classCallCheck3.default)(this, TrackJS);

        this.options = options || {};
        this.options.strict = options.strict || false;
        this.options.baseUrl = options.baseUrl || options.endpoint;

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

            if (parsed && !this.options.baseUrl) {
                throw new Error('baseUrl or endpoint not specified in options.');
            } else if (parsed) {
                newUrl = this.options.baseUrl + '/' + parsed.shortcode;
            } else {
                parsed = this.options.strict ? parseShortlink(short, this.options.baseUrl) : parseShortlink(short);

                if (parsed) {
                    var _parsed = parsed;
                    var protocol = _parsed.protocol;
                    var domain = _parsed.domain;
                    var shortcode = _parsed.shortcode;
                    var override = _parsed.override;

                    newUrl = protocol + '://' + domain + '/r/' + shortcode;
                    baseParams = override;
                } else {
                    throw new Error('Not a valid shortlink or shortcode: ' + url);
                }
            }

            (0, _assign2.default)(shrink(baseParams), shrink(params));

            if ((0, _keys2.default)(baseParams).length) {
                newUrl += '/' + encode(baseParams);
            }

            return newUrl;
        }
    }, {
        key: 'id',
        value: function id(ambassadorId, accountId) {
            var type = arguments.length <= 2 || arguments[2] === undefined ? pixelTypes.gif : arguments[2];
            var load = arguments.length <= 3 || arguments[3] === undefined ? false : arguments[3];

            if (!this.options.baseUrl) throw new Error('baseUrl or endpoint not specified in options.');

            var url = this.options.baseUrl + '/id/' + accountId + '/' + ambassadorId + type;

            if (load) loadImg(url);

            return url;
        }
    }, {
        key: 'pixel',
        value: function pixel() {
            var params = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
            var type = arguments.length <= 1 || arguments[1] === undefined ? pixelTypes.gif : arguments[1];
            var load = arguments.length <= 2 || arguments[2] === undefined ? false : arguments[2];

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