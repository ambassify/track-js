function assert(expr, msg) {
    if (!expr) throw new Error(msg || 'assertion failed');
}

describe('# track-js', function() {
    const window = (function() { return this; })();
    const {
        TRACK_ENDPOINT,
        TRACK_API_KEY
    } = window.TrackJS ? window : process.env;

    // Allows tests to run in the browser
    const Track = window.TrackJS || require('../').default;

    describe('#shorten', function() {
        it('Should produce a shortlink', function() {
            const tracker = new Track({
                endpoint: TRACK_ENDPOINT,
                accessToken: TRACK_API_KEY
            });

            return tracker.shorten({
                u: 'https://www.ambassify.com'
            })
            .then(function(link) {
                assert(typeof link === 'string');
            });
        })

        it('Should produce a shortlink with overrides', function() {
            const tracker = new Track({
                endpoint: TRACK_ENDPOINT,
                accessToken: TRACK_API_KEY
            });

            return tracker.shorten({
                u: 'https://www.ambassify.com'
            }, { rf: 'the-user' })
            .then(function(link) {
                assert(typeof link === 'string');

                const m = /[^\/]+$/.exec(link);
                assert(m);
                assert(m[0] === 'eyJyZiI6InRoZS11c2VyIn0');
            });
        })

        it('Should produce the same shortlink for the same links', function() {
            const tracker = new Track({
                endpoint: TRACK_ENDPOINT,
                accessToken: TRACK_API_KEY
            });

            return Promise.all([
                tracker.shorten({ u: 'https://www.ambassify.com' }),
                tracker.shorten({ u: 'https://www.ambassify.com' })
            ])
            .then(function(results) {
                assert(results[0] == results[1]);
            });
        })

        it('Should throw when access token is missing', function() {
            const tracker = new Track({
                endpoint: TRACK_ENDPOINT
            });

            return tracker.shorten({
                u: 'https://www.ambassify.com'
            })
            .then(
                function() { throw new Error('Should not resolve'); },
                function() { /* catch error and ignore */ }
            );
        })

        it('Should throw when endpoint is missing', function() {
            const tracker = new Track({});

            return tracker.shorten({
                u: 'https://www.ambassify.com'
            })
            .then(
                function() { throw new Error('Should not resolve'); },
                function() { /* catch error and ignore */ }
            );
        })

        it('Should throw on invalid response', function() {
            const tracker = new Track({
                endpoint: 'https://httpbin.org/get'
            });

            return tracker.shorten({
                u: 'https://www.ambassify.com'
            })
            .then(
                function() { throw new Error('Should not resolve'); },
                function() { /* catch error and ignore */ }
            );
        })
    })

    describe('#override', function() {
        const baseLink = 'https://forwrd.it/r/Occ';
        const overriddenLink = 'https://forwrd.it/r/Occ/eyJ1IjoiaHR0cHM6Ly93d3cuZ29vZ2xlLmNvbSJ9'

        it('Should append override to url', function() {
            const tracker = new Track({});

            const link = tracker.override(baseLink, {
                u: 'https://www.google.com'
            });

            assert(overriddenLink == link);
        })

        it('Should shrink override parameters', function() {
            const tracker = new Track({});

            const link = tracker.override(baseLink, {
                url: 'https://www.google.com'
            });

            assert(overriddenLink == link);
        })

        it('Should append shortcode to endpoint', function() {
            const tracker = new Track({ endpoint: TRACK_ENDPOINT });

            const link = tracker.override('abcd', {});

            assert(link == TRACK_ENDPOINT + '/' + 'abcd');
        })

        it('Should append to existing overrides in url', function() {
            const tracker = new Track({});

            const link = tracker.override(overriddenLink, {
                rf: 'the-user'
            });

            assert(link === baseLink + '/eyJ1IjoiaHR0cHM6Ly93d3cuZ29vZ2xlLmNvbSIsInJmIjoidGhlLXVzZXIifQ');
        })

        it('Should throw on shortcode when no endpoint is set', function() {
            const tracker = new Track({});

            try {
                tracker.override('invalid', {
                    u: 'https://www.google.com'
                });
            } catch(e) {
                assert(e.message.indexOf('baseUrl or endpoint not specified in options.') === 0);
                return;
            };

            throw new Error('Tracker should throw error');
        })

        it('Should throw on invalid shortcode', function() {
            const tracker = new Track({
                endpoint: TRACK_ENDPOINT
            });

            try {
                tracker.override('invalid*', {
                    u: 'https://www.google.com'
                });
            } catch(e) {
                assert(e.message.indexOf('Not a valid shortlink or shortcode:') === 0);
                return;
            };

            throw new Error('Tracker should throw error');
        })

        it('Should throw on invalid parse url', function() {
            const tracker = new Track({});

            try {
                tracker.override('invalid' + baseLink, {
                    u: 'https://www.google.com'
                });
            } catch(e) {
                assert(e.message.indexOf('Not a valid shortlink or shortcode') === 0);
                return;
            };

            throw new Error('Tracker should throw error');
        })

        it('Should throw on url with other domain when strict', function() {
            const tracker = new Track({
                endpoint: TRACK_ENDPOINT,
                strict: true
            });

            try {
                tracker.override('https://ambassify.com/short', {
                    u: 'https://www.google.com'
                });
            } catch(e) {
                assert(e.message.indexOf('Not a valid shortlink or shortcode') === 0);
                return;
            };

            throw new Error('Tracker should throw error');
        })
    })

    describe('#id', function() {
        it('Should generate the correct link with default gif extension', function() {
            const tracker = new Track({ endpoint: TRACK_ENDPOINT });

            const link = tracker.id('ambassador', 'account');

            assert(link === TRACK_ENDPOINT + '/id/account/ambassador.gif');
        })

        it('Should generate the correct link', function() {
            const tracker = new Track({ endpoint: TRACK_ENDPOINT });

            const link = tracker.id('ambassador', 'account', '.png');

            assert(link === TRACK_ENDPOINT + '/id/account/ambassador.png');
        })

        it('Should throw when endpoint is not set', function() {
            const tracker = new Track({});

            try {
                tracker.id('ambassador', 'account');
            } catch(e) {
                assert(e.message.indexOf('baseUrl or endpoint not specified in options.') === 0);
                return;
            }

            throw new Error('Tracker should throw error');
        })
    })

    describe('#pixel', function() {
        it('Should generate the correct tracking pixel', function() {
            const tracker = new Track({ endpoint: TRACK_ENDPOINT });

            const pixel = tracker.pixel({ ea: 'open', ec: 'mail' });

            assert(pixel === TRACK_ENDPOINT + '/pixel/eyJlYSI6Im9wZW4iLCJlYyI6Im1haWwifQ.gif');
        })

        it('Should generate the correct tracking pixel as png', function() {
            const tracker = new Track({ endpoint: TRACK_ENDPOINT });

            const pixel = tracker.pixel({ ea: 'open', ec: 'mail' }, '.png');

            assert(pixel === TRACK_ENDPOINT + '/pixel/eyJlYSI6Im9wZW4iLCJlYyI6Im1haWwifQ.png');
        })

        it('Should shrink long form parameters', function() {
            const tracker = new Track({ endpoint: TRACK_ENDPOINT });

            const pixel = tracker.pixel({
                eventAction: 'open',
                eventCategory: 'mail'
            }, '.png');

            assert(pixel === TRACK_ENDPOINT + '/pixel/eyJlYSI6Im9wZW4iLCJlYyI6Im1haWwifQ.png');
        })

        it('Should throw when endpoint is not set', function() {
            const tracker = new Track({});

            try {
                tracker.pixel({});
            } catch(e) {
                assert(e.message.indexOf('baseUrl or endpoint not specified in options.') === 0);
                return;
            }

            throw new Error('Tracker should throw error');
        })
    })

})
