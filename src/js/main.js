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

    const entryScript = document.currentScript;
    const baseUrl = new URL('.', entryScript.src);

    function loadScript(path) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = new URL(path, baseUrl).href;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`脚本加载失败：${path}`));
            document.head.appendChild(script);
        });
    }

    function 等待DOM准备完成() {
        if (document.readyState !== 'loading') return Promise.resolve();
        return new Promise(resolve => {
            document.addEventListener('DOMContentLoaded', resolve, { once: true });
        });
    }

    async function 启动Dvnge() {
        await loadScript('游戏配置.js');
        await loadScript('引擎/index.js');
        await window.Dvnge引擎加载完成;
        await loadScript('工具/index.js');
        await window.Dvnge工具加载完成;
        await loadScript('自定义/index.js');
        await window.Dvnge自定义加载完成;
        await 等待DOM准备完成();

        if (typeof window.初始化引擎 !== 'function') {
            throw new Error('找不到 初始化引擎()，请检查 js/引擎/初始化.js 是否加载成功。');
        }

        await window.初始化引擎();
    }

    启动Dvnge().catch(error => {
        console.error('[Dvnge] 启动失败：', error);
    });
})();
