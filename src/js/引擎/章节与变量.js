/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025-2026 Tian
 */
'use strict';

// ====================== 章节加载 ======================
function 加载章节(章节名) {
    return new Promise(async (resolve, reject) => {
        if (章节库[章节名]) {
            resolve(章节库[章节名]);
            return;
        }

        const 章节列表 = 读取配置('章节文件列表');
        const 章节配置 = 章节列表.find(c => c.名称 === 章节名);
        if (!章节配置) {
            reject(new Error(`章节【${章节名}】未在章节文件列表中定义`));
            return;
        }

        const 路径 = 章节配置.路径;

        let 主节点列表 = [];
        if (路径.endsWith('.dvns')) {
            主节点列表 = await 章节库.加载剧本(路径, 章节名);
        } else {
            const script = document.createElement('script');
            script.src = 路径;
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
            if (window[章节名]) {
                主节点列表 = window[章节名];
            } else {
                reject(new Error(`章节【${章节名}】数据加载失败`));
            }
        }

        if (当前语言 && 语言配置表 && 当前语言 !== 语言配置表.默认语言) {
            const 翻译路径 = `chapter/tl/${当前语言}/${章节名}.dvns`;
            try {
                const 响应 = await fetch(翻译路径);
                if (响应.ok) {
                    const 翻译文本 = await 响应.text();
                    const 翻译节点列表 = 解析剧本(翻译文本);
                    let 翻译索引 = 0;
                    for (let i = 0; i < 主节点列表.length; i++) {
                        const 主节点 = 主节点列表[i];
                        const 需要翻译 = 主节点.角色 !== undefined ||
                            主节点.内容 !== undefined ||
                            主节点.选项 !== undefined ||
                            主节点.输入 !== undefined ||
                            主节点.标题 !== undefined;
                        if (!需要翻译) continue;
                        if (翻译索引 >= 翻译节点列表.length) break;
                        const 翻译节点 = 翻译节点列表[翻译索引];
                        if (主节点.角色 !== undefined && 翻译节点.角色 !== undefined) {
                            主节点._翻译角色 = 翻译节点.角色;
                        }
                        if (主节点.内容 !== undefined && 翻译节点.内容 !== undefined) {
                            主节点._翻译内容 = 翻译节点.内容;
                        }
                        if (主节点.标题 && 翻译节点.标题) {
                            主节点.标题._翻译内容 = 翻译节点.标题.内容;
                        }
                        if (主节点.选项 && 主节点.选项.length > 0 && 翻译节点.选项 && 翻译节点.选项.length > 0) {
                            for (let j = 0; j < 主节点.选项.length && j < 翻译节点.选项.length; j++) {
                                if (翻译节点.选项[j].文本) {
                                    主节点.选项[j]._翻译文本 = 翻译节点.选项[j].文本;
                                }
                            }
                        }
                        if (主节点.输入 && 翻译节点.输入) {
                            if (翻译节点.输入.占位符) {
                                主节点.输入._翻译占位符 = 翻译节点.输入.占位符;
                            }
                            if (翻译节点.输入.提示文字) {
                                主节点.输入._翻译提示文字 = 翻译节点.输入.提示文字;
                            }
                            if (翻译节点.输入.按钮文字) {
                                主节点.输入._翻译按钮文字 = 翻译节点.输入.按钮文字;
                            }
                        }
                        翻译索引++;
                    }
                }
            } catch (e) {}
        }

        章节库[章节名] = 主节点列表;
        resolve(主节点列表);
    });
}

function 加载所有章节() {
    const 章节列表 = 读取配置('章节文件列表', []);
    const 任务列表 = 章节列表.map(c => 加载章节(c.名称));
    return Promise.all(任务列表);
}

// ====================== 标签索引表 ======================
function 建立标签表(章节数据) {
    const 表 = {};
    章节数据.forEach((节点, idx) => {
        if (节点.标签) {
            表[节点.标签] = idx;
        }
    });
    return 表;
}

// ====================== CG收集系统 ======================
function 初始化CG存储() {
    const 存储键名 = 读取配置('存储键名');
    const 键名 = 存储键名.CG;
    if (!localStorage.getItem(键名)) {
        localStorage.setItem(键名, JSON.stringify({}));
    }
}

function 解锁CG(CG名称, CG路径 = "") {
    const 键名 = 读取配置('存储键名').CG;
    const CG库 = JSON.parse(localStorage.getItem(键名)) || {};
    CG库[CG名称] = {
        路径: CG路径,
        解锁时间: new Date().toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        })
    };
    localStorage.setItem(键名, JSON.stringify(CG库));
    return true;
}

function 获取已解锁CG() {
    const 键名 = 读取配置('存储键名').CG;
    return JSON.parse(localStorage.getItem(键名)) || {};
}

function 检查CG解锁状态(CG名称) {
    const 键名 = 读取配置('存储键名').CG;
    const CG库 = JSON.parse(localStorage.getItem(键名)) || {};
    return !!CG库[CG名称];
}

// ====================== 变量设置工具 ======================
function 安全获取变量(变量路径, 默认值 = '') {
    if (!变量路径) return 默认值;
    const 路径段 = 变量路径.trim().split('.');
    let 值 = 当前状态?.用户变量;
    for (let 段 of 路径段) {
        if (值 === undefined || 值 === null) break;
        值 = 值[段];
    }
    return (值 !== undefined && 值 !== null) ? 值 : 默认值;
}

function 替换变量(文本, 默认值 = '') {
    if (!文本) return 文本;
    return 文本.replace(/{([^}]+)}/g, (匹配, 变量路径) => {
        return 安全获取变量(变量路径, 默认值);
    });
}

function 解析变量设置值(值) {
    if (typeof 值 === 'string') {
        let 原始值 = 值;

        if (原始值.startsWith('=')) {
            原始值 = 原始值.slice(1).trim();
        }

        const 操作符匹配 = 原始值.match(/^(\+|\-|\*|\/)=(-?\d+\.?\d*)/);
        if (操作符匹配) {
            return {
                操作符: 操作符匹配[1],
                数值: parseFloat(操作符匹配[2])
            };
        }

        const 数字值 = parseFloat(原始值);
        if (!isNaN(数字值) && 原始值.trim() !== '') {
            return 数字值;
        }

        return 原始值;
    }
    return 值;
}

function 应用变量设置(变量路径, 值) {
    const 路径数组 = 变量路径.split('.');
    let 当前对象 = 当前状态.用户变量;
    路径数组.slice(0, -1).forEach(段 => {
        if (!当前对象[段]) 当前对象[段] = {};
        当前对象 = 当前对象[段];
    });
    const 最后字段 = 路径数组[路径数组.length - 1];

    if (typeof 值 === 'object' && 值.操作符) {
        const 当前值 = parseFloat(当前对象[最后字段] || 0);
        const 数值 = 值.数值;
        switch (值.操作符) {
            case '+':
                当前对象[最后字段] = 当前值 + 数值;
                break;
            case '-':
                当前对象[最后字段] = 当前值 - 数值;
                break;
            case '*':
                当前对象[最后字段] = 当前值 * 数值;
                break;
            case '/':
                当前对象[最后字段] = 当前值 / 数值;
                break;
        }
    } else {
        当前对象[最后字段] = 值;
    }
    保存用户变量到本地存储();
}

function 解析设置变量(设置变量对象, 值字符串) {
    if (!值字符串) return;
    值字符串.split(',').forEach(v => {
        const 匹配 = v.match(/^"([^"]+)"\s*(.+)$/);
        if (匹配) {
            const 变量名 = 匹配[1].trim();
            const 值 = 匹配[2].trim();
            设置变量对象[变量名] = 解析变量设置值(值);
        }
    });
}

// ====================== 用户变量持久化 ======================
function 保存用户变量到本地存储() {
    const 存储键名 = 读取配置('存储键名');
    const 键名 = 存储键名.用户变量;
    localStorage.setItem(键名, JSON.stringify(当前状态.用户变量));
}

function 从本地存储加载用户变量() {
    const 存储键名 = 读取配置('存储键名');
    const 键名 = 存储键名.用户变量;
    const 存储数据 = localStorage.getItem(键名);
    if (存储数据) {
        try {
            当前状态.用户变量 = JSON.parse(存储数据);
            return true;
        } catch (e) {
            console.error('用户变量解析失败:', e);
        }
    }
    return false;
}

function 显示提示(消息) {
    const 提示 = document.createElement('div');
    提示.className = '存档提示';
    提示.textContent = 消息;
    document.body.appendChild(提示);
    setTimeout(() => {
        提示.style.opacity = '0';
        setTimeout(() => 提示.remove(), 500);
    }, 2000);
}

function 自动存档(存档位 = 0) {
    const 存储键名 = 读取配置('存储键名');
    const 存档数据 = 生成存档快照();
    localStorage.setItem(存储键名.自动存档, JSON.stringify(存档数据));
    显示提示(获取界面文字('已保存') || '游戏已自动存档');
}

// ====================== 自定义预设解析应用 ======================
function 应用角色样式() {
    const 角色元素 = document.querySelector('.角色');
    if (!角色元素) return;
    const 样式表 = 读取配置('角色样式表', {});
    if (!样式表 || Object.keys(样式表).length === 0) return;
    const 角色名 = 角色元素.textContent.trim();
    const 样式 = 样式表[角色名];
    if (样式) {
        Object.assign(角色元素.style, 样式);
    } else {
        角色元素.style = '';
    }
}

function 解析立绘预设(角色名, 预设名) {
    const 预设表 = 读取配置('立绘预设', {});
    if (!预设表[角色名]) return null;
    const 预设 = 预设表[角色名];
    if (typeof 预设 === 'string') return 预设;
    if (预设[预设名]) return 预设[预设名];
    return null;
}