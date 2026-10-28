/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025-2026 Tian
 */
'use strict';

// ====================== 历史记录系统 ======================
function 添加历史记录(节点, 执行前快照) {
    const 配置 = 读取配置('历史记录配置', {});
    if (!配置.启用) return;
    if (当前状态.快进模式) return;
    if (!节点.角色 && !节点.内容) return;

    if (历史记录.记录列表.length > 0) {
        const 最后 = 历史记录.记录列表[历史记录.记录列表.length - 1];
        if (最后.章节 === 当前状态.当前章节 && 最后.索引 === 当前状态.当前索引) {
            return;
        }
    }

    const {
        角色,
        内容
    } = 获取本地化文本(节点);
    const 记录 = {
        时间: new Date().toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }),
        章节: 当前状态.当前章节,
        索引: 当前状态.当前索引,
        角色: 替换变量(角色, ''),
        内容: 替换变量(内容, ''),
        快照: 执行前快照
    };

    历史记录.记录列表.push(记录);

    const 最大条数 = 配置.最大条数 || 100;
    if (历史记录.记录列表.length > 最大条数) {
        历史记录.记录列表.shift();
    }
}

function 清空历史记录() {
    历史记录.记录列表 = [];
}

function 打开历史界面(e) {
    e?.stopPropagation();
    停止快进();
    渲染历史列表();
    const 历史界面 = document.getElementById('历史界面');
    if (历史界面) 历史界面.classList.remove('隐藏');
}

function 关闭历史界面() {
    const 历史界面 = document.getElementById('历史界面');
    if (历史界面) 历史界面.classList.add('隐藏');
}

function 渲染历史列表() {
    const 列表 = document.getElementById('历史列表');
    if (!列表) return;
    列表.innerHTML = '';

    const 配置 = 读取配置('历史记录配置', {});
    const 允许回退 = 配置.允许回退 !== false;

    if (历史记录.记录列表.length === 0) {
        const 空提示 = document.createElement('div');
        空提示.className = '历史空提示';
        空提示.textContent = 获取界面文字('暂无历史记录') || '暂无历史记录';
        列表.appendChild(空提示);
        return;
    }

    历史记录.记录列表.forEach((记录, 索引) => {
        const 项 = document.createElement('div');
        项.className = '历史项';
        if (允许回退) 项.classList.add('可回退');

        const 头部 = document.createElement('div');
        头部.className = '历史项头部';

        if (记录.角色) {
            const 角色 = document.createElement('span');
            角色.className = '历史角色';
            角色.textContent = 记录.角色;
            头部.appendChild(角色);
        } else {
            const 占位 = document.createElement('span');
            头部.appendChild(占位);
        }

        const 时间 = document.createElement('span');
        时间.className = '历史时间';
        时间.textContent = `${记录.章节} · ${记录.时间}`;
        头部.appendChild(时间);

        项.appendChild(头部);

        if (记录.内容) {
            const 内容 = document.createElement('div');
            内容.className = '历史内容';
            内容.textContent = 记录.内容;
            项.appendChild(内容);
        }

        if (允许回退) {
            项.addEventListener('click', () => {
                回退到历史(索引);
            });
        }

        列表.appendChild(项);
    });

    列表.scrollTop = 列表.scrollHeight;
}

function 回退到历史(索引) {
    const 配置 = 读取配置('历史记录配置', {});
    if (!配置.允许回退) return;

    const 记录 = 历史记录.记录列表[索引];
    if (!记录 || !记录.快照) return;

    停止打字效果();
    停止快进();

    if (配置.回退后清除后续 !== false) {
        历史记录.记录列表 = 历史记录.记录列表.slice(0, 索引);
    }

    恢复存档状态(JSON.parse(JSON.stringify(记录.快照)), true);

    const 当前章节数据 = 章节库[当前状态.当前章节];
    if (当前章节数据 && 当前状态.当前索引 < 当前章节数据.length) {
        更新场景(当前章节数据[当前状态.当前索引]);
    }

    关闭历史界面();
    显示提示(获取界面文字('已回退') || '已回退');
}