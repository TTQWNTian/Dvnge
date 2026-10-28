/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025-2026 Tian
 */
'use strict';

// ====================== 游戏视口尺寸 ======================
function 转换尺寸值(值) {
    if (typeof 值 === 'number') return 值 + 'px';
    if (typeof 值 === 'string') {
        const 去空格 = 值.trim();
        if (/^\d+(\.\d+)?$/.test(去空格)) return 去空格 + 'px';
        return 去空格;
    }
    return 值;
}

function 应用游戏视口配置() {
    const 视口 = document.getElementById('游戏视口');
    if (!视口) return;
    const 配置 = 读取配置('限制游戏视口', {});
    if (!配置.启用) {
        视口.classList.remove('固定尺寸');
        视口.style.width = '';
        视口.style.height = '';
        return;
    }
    视口.classList.add('固定尺寸');
    视口.style.width = 转换尺寸值(配置.宽 || '1280px');
    视口.style.height = 转换尺寸值(配置.高 || '720px');
}

// ====================== 引擎初始化 ======================
async function 初始化引擎() {
    await 等待配置加载();

    应用游戏视口配置();

    const 存储键名 = 读取配置('存储键名');
    const 初始状态配置 = 读取配置('初始状态');
    const 语言配置数据 = 读取配置('语言配置');

    当前语言 = localStorage.getItem(存储键名.语言) || null;
    语言配置表 = 语言配置数据;

    if (!当前语言 || !语言配置表.语言列表[当前语言]) {
        当前语言 = 语言配置表.默认语言;
    }

    当前状态 = JSON.parse(JSON.stringify(初始状态配置));

    初始化CG存储();
    从本地存储加载用户变量();
    await 加载所有章节();
    刷新界面文字();

    const url参数 = new URLSearchParams(window.location.search);
    const 存档标识 = url参数.get('存档');

    if (存档标识 === 'auto') {
        加载自动存档();
    } else if (存档标识) {
        加载指定存档(parseInt(存档标识));
    }

    if (!存档标识 && 章节库.序章?.length) {
        切换章节('序章', 0);
    }

    document.addEventListener("click", 处理全局点击);
}
// ====================== 隐藏对话框点击空白恢复显示 ======================
document.addEventListener('click', function(e) {
    if (!隐藏模式激活) return;

    if (e.target.closest && e.target.closest('#隐藏对话按钮')) return;
    if (e.target.closest && e.target.closest('.输入容器')) return;

    const 存档界面 = document.getElementById('存档界面');
    if (存档界面 && !存档界面.classList.contains('隐藏')) return;

    切换对话框隐藏();
    e.stopPropagation();
}, true);