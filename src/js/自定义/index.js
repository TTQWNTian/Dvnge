(function () {
    'use strict';

    const 当前目录 = new URL('.', document.currentScript.src);
    const 文件列表 = ['自定义功能.js'];

    window.Dvnge自定义加载完成 = 文件列表.reduce((队列, 文件名) => {
        return 队列.then(() => new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = new URL(文件名, 当前目录).href;
            script.onload = resolve;
            script.onerror = () => reject(new Error('自定义文件加载失败：' + 文件名));
            document.head.appendChild(script);
        }));
    }, Promise.resolve());
})();
