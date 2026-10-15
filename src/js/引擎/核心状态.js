/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025-2026 Tian
 */
'use strict';

// ====================== 配置加载 ======================
function 等待配置加载() {
    return new Promise((resolve, reject) => {
        if (typeof window.游戏配置 !== 'undefined') {
            resolve(window.游戏配置);
            return;
        }

        const 检查 = setInterval(() => {
            if (typeof window.游戏配置 !== 'undefined') {
                clearInterval(检查);
                resolve(window.游戏配置);
            }
        }, 30);

        // 超时则报错
        setTimeout(() => {
            clearInterval(检查);
            reject(new Error('游戏配置加载超时，请确保 js/游戏配置.js 已正确加载'));
        }, 3000);
    });
}

function 读取配置(键名, 默认值) {
    if (typeof window.游戏配置 === 'undefined') {
        if (默认值 !== undefined) return 默认值;
        throw new Error(`游戏配置未加载，无法读取 ${键名}`);
    }
    if (window.游戏配置[键名] === undefined) {
        if (默认值 !== undefined) return 默认值;
        throw new Error(`配置项 ${键名} 不存在`);
    }
    return window.游戏配置[键名];
}

// ====================== 章节库 ======================
const 章节库 = {};

// ====================== 全局变量 ======================
let 当前状态 = null;
let 全局音效 = [];
let 隐藏模式激活 = false;
let 语言配置表 = null;
let 当前语言 = null;
let 背景切换token = 0;
let 正在切换语言 = false;
let 历史记录 = {
    记录列表: []
};