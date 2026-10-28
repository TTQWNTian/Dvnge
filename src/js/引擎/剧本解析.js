/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025-2026 Tian
 */
'use strict';

// ====================== 剧本解析器 ======================
function 解析参数(文本) {
    const 参数 = {
        _原始: []
    };
    if (!文本) return new Proxy(参数, {
        get(t, p) {
            return p in t ? t[p] : (isNaN(p) ? undefined : t._原始[p]);
        }
    });

    const 部分列表 = 文本.split(',').map(s => s.trim());

    for (const 部分 of 部分列表) {
        if (!部分) continue;

        if (部分.includes('=')) {
            const 等号位置 = 部分.indexOf('=');
            const 键 = 部分.slice(0, 等号位置).trim();
            const 值 = 部分.slice(等号位置 + 1).trim();
            if (值 === '') continue;
            参数[键] = 值;
        } else if (部分.includes('->')) {
            参数._目标 = 部分.split('->')[1].trim();
        } else {
            参数._原始.push(部分);
        }
    }

    return new Proxy(参数, {
        get(t, p) {
            if (p in t) return t[p];
            const i = parseInt(p);
            return isNaN(i) ? undefined : t._原始[i];
        }
    });
}

function 解析指令行(行) {
    const 匹配 = 行.match(/^@(\S+)\s*(.*)/);
    if (!匹配) return null;

    const 指令名 = 匹配[1];
    const 参数 = 解析参数(匹配[2]);
    const 结果 = {};

    switch (指令名) {
        case '背景':
            结果.背景 = 参数[0];
            break;

        case '音乐':
            结果.音乐 = {
                路径: 参数[0],
                循环: 参数.循环 !== 'false',
                音量: parseFloat(参数.音量),
                淡出: parseInt(参数.淡出)
            };
            break;

        case '音效':
            结果.音效 = 参数[0];
            break;

        case '立绘': {
            结果.立绘 = 结果.立绘 || {};
            const 位置映射 = {
                '左': '左立绘',
                '中': '中立绘',
                '右': '右立绘'
            };
            const 位置 = 位置映射[参数[0]] || 参数[0];
            const 角色名 = 参数[1];
            const 预设名 = 参数[2];
            const 实际路径 = 解析立绘预设(角色名, 预设名) || 角色名;

            if (角色名 === 'false') {
                结果.立绘[位置] = {
                    隐藏: true
                };
            } else {
                结果.立绘[位置] = {
                    路径: 实际路径,
                    淡入: parseInt(参数.淡入),
                    循环: 参数.循环 === 'true',
                    次数: parseInt(参数.次数),
                    间隔: parseFloat(参数.间隔),
                    音量: parseFloat(参数.音量)
                };
            }
            break;
        }

        case '立绘媒体': {
            结果.立绘 = 结果.立绘 || {};
            const 位置映射 = {
                '左': '左立绘',
                '中': '中立绘',
                '右': '右立绘'
            };
            const 位置 = 位置映射[参数[0]] || 参数[0];
            结果.立绘[位置] = 结果.立绘[位置] || {};
            结果.立绘[位置].媒体 = {
                循环: 参数.循环 !== 'false',
                播放次数: parseInt(参数.播放次数),
                播放间隔: parseFloat(参数.播放间隔),
                音量: parseFloat(参数.音量)
            };
            break;
        }

        case '头像':
            结果.头像 = {
                路径: 参数[0],
                位置: 参数.位置
            };
            break;

        case '标题':
            if (参数[0] === 'false') {
                结果.标题 = {
                    显示: false
                };
            } else {
                let 样式 = 参数.样式 || '';
                if (样式.includes(':')) {
                    const 样式对象 = {};
                    样式.split(';').forEach(s => {
                        const [k, val] = s.split(':').map(s => s.trim());
                        if (k && val) 样式对象[k] = val;
                    });
                    样式 = 样式对象;
                }

                结果.标题 = {
                    显示: true,
                    内容: 参数[0],
                    位置: 参数.位置,
                    样式: 样式
                };
            }
            break;

        case '目标': {
            const 目标 = 参数[0];
            const 章节 = 参数.章节 || 参数[1];
            if (章节) {
                结果.目标 = {
                    章节
                };
                if (!isNaN(目标) && 目标 !== '') 结果.目标.索引 = parseInt(目标);
                else if (目标) 结果.目标.标签 = 目标;
            } else if (!isNaN(目标) && 目标 !== '') {
                结果.目标 = parseInt(目标);
            } else {
                结果.目标 = 目标;
            }
            break;
        }

        case '标签':
            结果.标签 = 参数[0];
            break;

        case '设置变量': {
            const 设置 = {};
            解析设置变量(设置, 匹配[2]);
            if (Object.keys(设置).length > 0) 结果.设置变量 = 设置;
            break;
        }

        case '读档时设置变量': {
            const 设置 = {};
            解析设置变量(设置, 匹配[2]);
            if (Object.keys(设置).length > 0) 结果.读档时设置变量 = 设置;
            break;
        }

        case '输入': {
            const 原始参数 = 匹配[2];
            const 第一段 = 原始参数.split(',')[0].trim();
            let 变量名 = '';
            let 参数文本 = '';
            if (!第一段.includes('=')) {
                const 分割符位置 = 原始参数.search(/[ ,]/);
                if (分割符位置 !== -1) {
                    变量名 = 原始参数.slice(0, 分割符位置).trim();
                    参数文本 = 原始参数.slice(分割符位置 + 1).trim();
                } else {
                    变量名 = 原始参数.trim();
                    参数文本 = '';
                }
            } else {
                参数文本 = 原始参数;
            }
            const 参数 = 解析参数(参数文本);
            结果.输入 = {
                变量名: 变量名,
                占位符: 参数.占位符,
                提示文字: 参数.提示文字,
                按钮文字: 参数.按钮文字,
                最大长度: parseInt(参数.最大长度),
                必填: 参数.必填 === 'true'
            };
            break;
        }

        case '自动存档':
            结果.自动存档 = 参数[0] !== 'false';
            break;

        case '自动节点':
            结果.自动节点 = parseFloat(参数[0]);
            break;

        case '解锁CG':
            结果.解锁CG = {
                名称: 参数[0],
                路径: 参数[1]
            };
            break;

        case '调查':
            结果.调查 = {
                光标: 参数.光标,
                返回: 参数.返回,
                区域: []
            };
            break;

        case '跳转HTML':
            结果.跳转HTML = {
                路径: 参数[0]
            };
            if (参数.参数) 结果.跳转HTML.参数 = 参数.参数;
            if (参数.传递变量) 结果.跳转HTML.传递变量 = 参数.传递变量.split(',').map(s => s.trim());
            break;

        case '条件':
            结果.条件 = {
                表达式: 参数[0],
                真目标: 参数.真,
                假目标: 参数.假
            };
            break;

        case '逐字显示':
            if (参数[0] === 'false') {
                结果.逐字显示 = {
                    启用: false
                };
            } else {
                结果.逐字显示 = {
                    启用: true,
                    速度: parseFloat(参数[0])
                };
            }
            break;

        case '打字音效':
            if (参数[0] === 'false') {
                结果.打字音效 = {
                    启用: false
                };
            } else {
                结果.打字音效 = {
                    启用: true,
                    路径: 参数[0],
                    音量: parseFloat(参数.音量),
                    间隔字符数: parseInt(参数.间隔)
                };
            }
            break;

        case '快进':
            结果.快进模式 = 参数[0] === 'true';
            break;

        case '自定义功能':
            结果.自定义功能 = 参数[0];
            break;

        case '动画': {
            结果.动画 = {};
            const 位置列表 = ['左立绘', '中立绘', '右立绘', '背景', '对话框', '角色', '内容', '头像'];
            for (const 位置 of 位置列表) {
                if (参数[位置]) 结果.动画[位置] = 参数[位置];
            }
            break;
        }

        case '背景媒体':
            结果.背景媒体 = {
                循环: 参数[0] !== 'false',
                播放次数: parseInt(参数[1]),
                播放间隔: parseFloat(参数[2]),
                音量: parseFloat(参数[3])
            };
            break;
    }

    return Object.keys(结果).length > 0 ? 结果 : null;
}

function 解析剧本(剧本文本) {
    const 块列表 = 剧本文本.split('$').map(s => s.trim()).filter(s => s.length > 0);
    const 节点列表 = [];

    for (const 块 of 块列表) {
        const 行列表 = 块.split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('//'));
        if (!行列表.length) continue;

        const 节点 = {};
        let 当前调查节点 = null;
        let 在选项中 = false;
        let 选项列表 = [];

        for (let i = 0; i < 行列表.length; i++) {
            const 行 = 行列表[i];

            const 对话匹配 = 行.match(/^"([^"]+)"\s*:\s*(.*)/);
            if (对话匹配) {
                节点.角色 = 对话匹配[1].trim();
                节点.内容 = 对话匹配[2].trim();
                continue;
            }

            if (行.startsWith('@')) {
                if (在选项中) {
                    if (选项列表.length > 0) 节点.选项 = 选项列表;
                    在选项中 = false;
                }

                if (行.startsWith('@选项')) {
                    在选项中 = true;
                    选项列表 = [];
                    continue;
                }

                const 结果 = 解析指令行(行);
                if (!结果) continue;

                if (结果.调查) {
                    当前调查节点 = 结果;
                    Object.assign(节点, 结果);
                    continue;
                }

                Object.assign(节点, 结果);
                continue;
            }

            if (在选项中) {
                const 跳转匹配 = 行.match(/^(.+?)\s*->\s*(.+)$/);
                if (跳转匹配) {
                    const 选项文本 = 跳转匹配[1].trim();
                    let 目标部分 = 跳转匹配[2].trim();
                    let 设置变量 = {};
                    let 条件 = null;
                    let 否则目标 = null;
                    let 解锁CG = null;
                    let 样式 = {};

                    const 属性匹配 = 目标部分.match(/^(.*?)\s*,\s*(.+)$/);
                    if (属性匹配) {
                        目标部分 = 属性匹配[1].trim();
                        const 属性字符串 = 属性匹配[2].trim();

                        const 属性项列表 = [];
                        let 当前项 = '';
                        let 在引号内 = false;
                        for (const 字符 of 属性字符串) {
                            if (字符 === '"') 在引号内 = !在引号内;
                            if (字符 === ',' && !在引号内) {
                                属性项列表.push(当前项.trim());
                                当前项 = '';
                            } else {
                                当前项 += 字符;
                            }
                        }
                        if (当前项.trim()) 属性项列表.push(当前项.trim());

                        for (const 项 of 属性项列表) {
                            const 等号位置 = 项.indexOf('=');
                            if (等号位置 === -1) continue;
                            const 键 = 项.slice(0, 等号位置).trim();
                            const 值 = 项.slice(等号位置 + 1).trim();

                            switch (键) {
                                case '设置变量':
                                    if (值) {
                                        解析设置变量(设置变量, 值);
                                    }
                                    break;
                                case '条件':
                                    条件 = 值;
                                    break;
                                case '否则':
                                    否则目标 = 值;
                                    break;
                                case '解锁CG':
                                    解锁CG = {
                                        名称: 值,
                                        路径: ''
                                    };
                                    break;
                                case '样式':
                                    if (值.includes(':')) {
                                        值.split(';').forEach(s => {
                                            const [k, val] = s.split(':').map(s => s.trim());
                                            if (k && val) 样式[k] = val;
                                        });
                                    } else {
                                        样式 = 值;
                                    }
                                    break;
                            }
                        }
                    }

                    const 选项对象 = {
                        文本: 选项文本,
                        目标: 目标部分 || null
                    };
                    if (Object.keys(设置变量).length > 0) 选项对象.设置变量 = 设置变量;
                    if (条件) 选项对象.条件 = 条件;
                    if (否则目标) 选项对象.否则目标 = 否则目标;
                    if (解锁CG) 选项对象.解锁CG = 解锁CG;
                    if (Object.keys(样式).length > 0) 选项对象.样式 = 样式;

                    选项列表.push(选项对象);
                } else {
                    const 属性匹配 = 行.match(/^(.+?)\s*,\s*(.+)$/);
                    if (属性匹配) {
                        const 选项文本 = 属性匹配[1].trim();
                        const 属性字符串 = 属性匹配[2].trim();
                        let 设置变量 = {};
                        let 条件 = null;
                        let 解锁CG = null;
                        let 样式 = {};

                        const 属性项列表 = [];
                        let 当前项 = '';
                        let 在引号内 = false;
                        for (const 字符 of 属性字符串) {
                            if (字符 === '"') 在引号内 = !在引号内;
                            if (字符 === ',' && !在引号内) {
                                属性项列表.push(当前项.trim());
                                当前项 = '';
                            } else {
                                当前项 += 字符;
                            }
                        }
                        if (当前项.trim()) 属性项列表.push(当前项.trim());

                        for (const 项 of 属性项列表) {
                            const 等号位置 = 项.indexOf('=');
                            if (等号位置 === -1) continue;
                            const 键 = 项.slice(0, 等号位置).trim();
                            const 值 = 项.slice(等号位置 + 1).trim();

                            switch (键) {
                                case '设置变量':
                                    if (值) {
                                        解析设置变量(设置变量, 值);
                                    }
                                    break;
                                case '条件':
                                    条件 = 值;
                                    break;
                                case '解锁CG':
                                    解锁CG = {
                                        名称: 值,
                                        路径: ''
                                    };
                                    break;
                                case '样式':
                                    if (值.includes(':')) {
                                        值.split(';').forEach(s => {
                                            const [k, val] = s.split(':').map(s => s.trim());
                                            if (k && val) 样式[k] = val;
                                        });
                                    } else {
                                        样式 = 值;
                                    }
                                    break;
                            }
                        }

                        const 选项对象 = {
                            文本: 选项文本,
                            目标: null
                        };
                        if (Object.keys(设置变量).length > 0) 选项对象.设置变量 = 设置变量;
                        if (条件) 选项对象.条件 = 条件;
                        if (解锁CG) 选项对象.解锁CG = 解锁CG;
                        if (Object.keys(样式).length > 0) 选项对象.样式 = 样式;

                        选项列表.push(选项对象);
                    } else {
                        选项列表.push({
                            文本: 行,
                            目标: null
                        });
                    }
                }
                continue;
            }

            if (当前调查节点 && 行.startsWith('区域 ')) {
                const 区域参数 = 解析参数(行.replace('区域 ', ''));
                当前调查节点.调查.区域.push({
                    x: parseInt(区域参数.x) || parseInt(区域参数[0]),
                    y: parseInt(区域参数.y) || parseInt(区域参数[1]),
                    宽度: parseInt(区域参数.宽) || parseInt(区域参数[2]),
                    高度: parseInt(区域参数.高) || parseInt(区域参数[3]),
                    目标: 区域参数.目标 || '',
                    贴图: 区域参数.贴图 || ''
                });
                continue;
            }

            节点.内容 = 行;
        }

        if (在选项中 && 选项列表.length > 0) {
            节点.选项 = 选项列表;
        }

        节点列表.push(节点);
    }

    return 节点列表;
}

章节库.加载剧本 = async function(路径, 章节名) {
    const 响应 = await fetch(路径);
    if (!响应.ok) throw new Error('无法加载剧本: ' + 路径);
    const 文本 = await 响应.text();
    const 节点列表 = 解析剧本(文本);
    this[章节名] = 节点列表;
    return 节点列表;
};