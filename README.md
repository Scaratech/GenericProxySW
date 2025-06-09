# GenericProxySW
Standardized interception proxy SW (Made for fun do not use for real projects lol)

## Building
```sh
$ git clone https://github.com/scaratech/genericproxysw
$ cd genericproxysw
$ pnpm i
$ pnpm build
$ pnpm start # Test server
```

## Usage
### Server
See `server.js`
### Client
See: `public/`

## Implementation
```ts
interface Opts {
    prefix: string;
    rewriter: {
        css: (css: string, origin: string) => string | Promise<string>;
        html: (html: string, origin: string) => string | Promise<string>;
        js: (js: string, origin: string) => string | Promise<string>;
        worker?: (js: string, origin: string) => string | Promise<string>;
        headers: {
            request: (headers: Headers, origin: string) => Headers | Promise<Headers>;
            response: (headers: Headers, origin: string) => Headers | Promise<Headers>;
        };
    };
    url: {
        rewrite: (url: string, origin: string) => string;
        unrewrite: (url: string) => string;
    }
};
```
