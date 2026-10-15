/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025-2026 Tian
 */
/*
 * v1.10.0-dev
 * 开发者: Tian
 */
(function () {
    'use strict';

    const 当前目录 = new URL('.', document.currentScript.src);
    const 文件列表 = ['导出入存档功能.js'];

    window.Dvnge工具加载完成 = 文件列表.reduce((队列, 文件名) => {
        return 队列.then(() => new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = new URL(文件名, 当前目录).href;
            script.onload = resolve;
            script.onerror = () => reject(new Error('工具文件加载失败：' + 文件名));
            document.head.appendChild(script);
        }));
    }, Promise.resolve());
})();
