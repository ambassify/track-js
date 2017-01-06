# track-js

Javascript client-side library for Track service.

- `dist/` has the latest (UMD-build) release for browsers.
- `lib/` has the latest babelified build for use with bundlers.

You can use `https://cdn.rawgit.com/bubobox/track-js/[tag]/dist/track.min.js` in your regular HTML scripts by filling in the desired tag.

Example using `v1.0.0`:

```html
<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8">
        <title></title>
        <script src="https://cdn.rawgit.com/bubobox/track-js/v1.0.0/dist/track.min.js"></script>
    </head>
    <body>
        <script>
            var tracker = new TrackJS({
                /* options */
            });
        </script>
    </body>
</html>
```

## Testing

The included tests can be run in node using `npm test` or in the browser by opening the `test/mocha.html` file with the endpoint and key query parameters set correctly.

```
test/mocha.html?endpoint=https://forwrd.it&key=<api-key>
```

## Release

Use `npm version [patch|minor|major]` to publish new releases. It will automatically build the project, commit the new build and create a git tag.
