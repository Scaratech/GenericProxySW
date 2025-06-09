import { BareClient } from '@mercuryworkshop/bare-mux';

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

declare global {
    interface Window {
        GenericProxySW: typeof GenericProxySW;
    }
}

function template(trace: string, fetchedUrl: string) {
    const script = `
        errorTrace.value = ${JSON.stringify(trace)};
        fetchedURL.textContent = ${JSON.stringify(fetchedUrl)};
        for (const node of document.querySelectorAll("#hostname")) node.textContent = ${JSON.stringify(
        location.hostname,
    )};`;

    return `<!DOCTYPE html>
          <html>
          <head>
          <meta charset="utf-8" />
          <title>Error</title>
          <style>
          * { background-color: white }
          </style>
          </head>
          <body>
          <h1 id="errorTitle">Error processing your request</h1>
          <hr />
          <p>Failed to load <b id="fetchedURL"></b></p>
          <p id="errorMessage">Internal Server Error</p>
          <textarea id="errorTrace" cols="40" rows="10" readonly></textarea>
          <hr />
          <script src="${"data:application/javascript," + encodeURIComponent(script)
        }"></script>
          </body>
          </html>
          `;
}

function renderError(err: string, fetchedUrl: string) {
    return new Response(template(err, fetchedUrl), {
        status: 500,
        headers: {
            "content-type": "text/html",
        },
    });
}

class GenericProxySW {
    opts: Opts;
    client: typeof BareClient.prototype;
    prefix: string;
    rewriteCss: typeof this.opts.rewriter.css;
    rewriteHtml: typeof this.opts.rewriter.html;
    rewriteJs: typeof this.opts.rewriter.js;
    rewriteWorker?: typeof this.opts.rewriter.worker;
    rewriteReqHeaders: typeof this.opts.rewriter.headers.request;
    rewriteResHeaders: typeof this.opts.rewriter.headers.response;
    rewriteUrl: typeof this.opts.url.rewrite;
    unrewriteUrl: typeof this.opts.url.unrewrite;

    constructor(opts: Opts) {
        this.opts = opts;
        this.client = new BareClient();
        this.prefix = opts.prefix;
        this.rewriteCss = opts.rewriter.css;
        this.rewriteHtml = opts.rewriter.html;
        this.rewriteJs = opts.rewriter.js;
        if (opts.rewriter.worker) {
            this.rewriteWorker = opts.rewriter.worker;
        }
        this.rewriteReqHeaders = opts.rewriter.headers.request;
        this.rewriteResHeaders = opts.rewriter.headers.response;
        this.rewriteUrl = opts.url.rewrite;
        this.unrewriteUrl = opts.url.unrewrite;
    }

    route({ request }) {
        return request.url.startsWith(location.origin + this.prefix);
    }

    async fetch({ request }) {
        const requestHeaders = new Headers(await this.rewriteReqHeaders(Object.assign({}, request.headers), request.url));
        const decodedUrl = this.unrewriteUrl(request.url);
        const url = new URL(decodedUrl);

        try {
            const response = await this.client.fetch(url.href, {
                method: request.method,
                body: request.body,
                headers: requestHeaders,
                credentials: 'omit',
                mode: request.mode === 'cors' ? request.mode : 'same-origin',
                cache: request.cache,
                redirect: request.redirect,
                // @ts-expect-error
                duplex: 'half'
            });

            //@ts-ignore
            const responseHeaders = new Headers(await this.rewriteResHeaders(response.rawHeaders, request.url));
            let responseBody: BodyInit | null = null;

            const contentType = responseHeaders.get("content-type") || "";
            const destination = request.destination;

            const shouldRewrite =
                destination === "document" ||
                destination === "iframe" ||
                destination === "frame" ||
                destination === "style" ||
                destination === "script" ||
                destination === "worker" ||
                destination === "sharedworker";

            let bodyText: string | null = null;

            if (response.body && shouldRewrite && contentType.startsWith("text/")) {
                bodyText = await response.text();
            }

            switch (destination) {
                case "document":
                case "iframe":
                case "frame":
                    if (contentType.startsWith("text/html") && bodyText !== null) {
                        responseBody = await this.rewriteHtml(bodyText, url.href);
                    } else {
                        responseBody = response.body;
                    }
                    break;
                case "style":
                    if (bodyText !== null) {
                        responseBody = await this.rewriteCss(bodyText, url.href);
                    }
                    break;
                case "script":
                    if (bodyText !== null) {
                        responseBody = await this.rewriteJs(bodyText, url.href);
                    }
                    break;
                case "worker":
                case "sharedworker":
                    if (bodyText !== null) {
                        responseBody = this.rewriteWorker
                            ? await this.rewriteWorker(bodyText, url.href)
                            : await this.rewriteJs(bodyText, url.href);
                    }
                    break;
                default:
                    responseBody = response.body;
                    break;
            }

            if (["document", "iframe", "frame"].includes(destination)) {
                const header = response.headers.get('content-disposition') || "";
    
                if (!/\s*?((inline|attachment);\s*?)filename=/i.test(header)) {
                    const type = /^\s*?attachment/i.test(header) ? 'attachment' : 'inline';
                    const [filename] = response.finalURL.split('/').reverse();

                    responseHeaders.set('Content-Disposition', `${type}; filename=${JSON.stringify(filename)}`);
                }
            }

            return new Response(responseBody ?? response.body, {
                headers: responseHeaders,
                status: response.status,
                statusText: response.statusText
            });
        } catch (err) {
            console.error('[Sw] Error fetching: ', err);
            return renderError(String(err), request.url);
        }
    }
}

self.GenericProxySW = GenericProxySW;