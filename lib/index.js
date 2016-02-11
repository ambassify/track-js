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

var shortlinkRe = /^(https?:\/\/[^/]+\/r\/[0-9a-z]+)(?:\/([0-9a-z-_=]+))?\/?/i;
var shortcodeRe = /^[0-9a-z]+$/i;

var b64encRe = /[+/=]/g;
var b64decRe = /[-_]/g;

var b64encFunc = function b64encFunc(match) {
    if (match == '=') return '';else if (match == '+') return '-';else if (match == '/') return '_';
};

var b64decFunc = function b64decFunc(match) {
    if (match == '-') return '+';else if (match == '_') return '/';
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
    return btoa((0, _stringify2.default)(v)).replace(b64encRe, b64encFunc);
};
var decode = function decode(str) {
    try {
        return JSON.parse(atob(str.replace(b64decRe, b64decFunc)));
    } catch (e) {}
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

            if (!data || ok && !data.shortlink || !ok && !data.message) reject(new Error('Invalid response from endpoint: ' + text));

            if (ok) {
                resolve(data.shortlink);
            } else {
                reject(new Error('Endpoint responded [' + status + ']: ' + data.message));
            }
        };

        request.onerror = function () {
            reject(new Error('Failed to connect to endpoint.'));
        };

        request.send((0, _stringify2.default)(params));
    });
};

var TrackJS = function () {
    function TrackJS(options) {
        (0, _classCallCheck3.default)(this, TrackJS);

        this.options = options;
        this.options.baseUrl = options.baseUrl || options.endpoint;
    }

    (0, _createClass3.default)(TrackJS, [{
        key: 'shorten',
        value: function shorten(params) {
            params = shrink(params);
            params.p = params.p || this.options.propertyId;
            return create(params, this.options);
        }
    }, {
        key: 'override',
        value: function override(url, params) {
            var newUrl = '';
            var baseParams = {};
            var match = shortcodeRe.exec(url);

            if (match) {
                if (!this.options.baseUrl) throw new Error('No baseUrl or endpoint specified in options.');
                newUrl = this.options.baseUrl + '/' + url;
            } else if (match = shortlinkRe.exec(url)) {
                newUrl = '' + match[1];
                if (match.length > 2 && match[2]) baseParams = decode(match[2]) || {};
            } else {
                throw new Error('Not a valid url or shortcode: ' + url);
            }

            (0, _assign2.default)(shrink(baseParams), shrink(params));

            if ((0, _keys2.default)(baseParams).length) {
                newUrl += '/' + encode(baseParams);
            }

            return newUrl;
        }
    }]);
    return TrackJS;
}();

exports.default = TrackJS;