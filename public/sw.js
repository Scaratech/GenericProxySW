importScripts('/dist/worker.js');
importScripts('/test.js');

const TestSW = {
    prefix: '/test/',
    rewriter: {
        css: (body, url) => body,
        html: self.$rw,
        js: (body, url) => body,
        worker: (body, url) => body,
        headers: {
            request: (headers, url) => headers,
            response: (headers, url) => headers
        }
    },
    url: {
        rewrite: (url, origin) => {
            return (location.origin + '/test/') + (new URL(url, origin).href);
        },
        unrewrite: (url) => {
            return (url.split('/test/')[1]);
        }
    }
};

const sw = new GenericProxySW(TestSW);

async function handleRequest(event) {
    if (sw.route(event)) {
        return sw.fetch(event);
    }
    
    return fetch(event.request);
}

self.addEventListener('fetch', event => {
    event.respondWith(handleRequest(event));
});