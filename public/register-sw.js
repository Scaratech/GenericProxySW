if ('serviceWorker' in navigator) {
    navigator.serviceWorker
        .register('/sw.js', {
            scope: '/test/'
        })
        .then(reg => {
            reg.update();
        })
        .catch(err => {
            console.error('SW Reg Failed:', err);
        });
}