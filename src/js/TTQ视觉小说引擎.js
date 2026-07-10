/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025-2026 Tian
 */
// js/TTQ视觉小说引擎.js
// 版本: v1.9.1
// 开发者: Tian
// ⚠️ 对js不熟的不要动这个文件

'use strict';

// ====================== 等待配置加载 ======================
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

// ====================== 剧本解析器 ======================
function 解析立绘预设(角色名) {
    const 预设表 = 读取配置('立绘预设', {});
    if (!预设表[角色名]) return null;
    const 预设 = 预设表[角色名];
    if (typeof 预设 === 'string') return 预设;
    const 键名 = Object.keys(预设)[0];
    return 预设[键名] || null;
}

function 解析参数(文本) {
    const 参数 = { _原始: [] };
    if (!文本) return new Proxy(参数, {
        get(t, p) { return p in t ? t[p] : (isNaN(p) ? undefined : t._原始[p]); }
    });
    
    const 部分列表 = 文本.split(',').map(s => s.trim());
    
    for (const 部分 of 部分列表) {
        if (!部分) continue; // 空逗号跳过，使用默认值
        
        if (部分.includes('=')) {
            const 等号位置 = 部分.indexOf('=');
            const 键 = 部分.slice(0, 等号位置).trim();
            const 值 = 部分.slice(等号位置 + 1).trim();
            if (值 === '') continue; // 值为空，使用默认值
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
                音量: parseFloat(参数.音量) || 1,
                淡出: parseInt(参数.淡出) || 0
            };
            break;
            
        case '音效':
            结果.音效 = 参数[0];
            break;
            
        case '立绘': {
            结果.立绘 = 结果.立绘 || {};
            const 位置映射 = { '左': '左立绘', '中': '中立绘', '右': '右立绘' };
            const 位置 = 位置映射[参数[0]] || 参数[0];
            const 值 = 参数[1];
            const 实际路径 = 解析立绘预设(值) || 值;
            
            if (值 === 'false') {
                结果.立绘[位置] = { 隐藏: true };
            } else {
                结果.立绘[位置] = {
                    路径: 实际路径,
                    淡入: parseInt(参数.淡入) || 0,
                    循环: 参数.循环 === 'true',
                    次数: parseInt(参数.次数) || -1,
                    间隔: parseFloat(参数.间隔) || 0,
                    音量: parseFloat(参数.音量) || 1
                };
            }
            break;
        }
            
        case '立绘媒体': {
            结果.立绘 = 结果.立绘 || {};
            const 位置映射 = { '左': '左立绘', '中': '中立绘', '右': '右立绘' };
            const 位置 = 位置映射[参数[0]] || 参数[0];
            结果.立绘[位置] = 结果.立绘[位置] || {};
            结果.立绘[位置].媒体 = {
                循环: 参数.循环 !== 'false',
                播放次数: parseInt(参数.播放次数) || -1,
                播放间隔: parseFloat(参数.播放间隔) || 0,
                音量: parseFloat(参数.音量) || 1
            };
            break;
        }
            
        case '头像':
            结果.头像 = {
                路径: 参数[0],
                位置: 参数.位置 || '左'
            };
            break;
            
        case '标题':
            if (参数[0] === 'false') {
                结果.标题 = { 显示: false };
            } else {
                结果.标题 = {
                    显示: true,
                    内容: 参数[0] || '',
                    位置: 参数.位置 || '上',
                    样式: 参数.样式 || ''
                };
            }
            break;
            
        case '目标': {
            const 目标 = 参数[0];
            const 章节 = 参数.章节 || 参数[1];
            if (章节) {
                结果.目标 = { 章节 };
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
            const [键, 值] = (参数[0] || '').split('=');
            if (键 && 值 !== undefined) {
                结果.设置变量 = { [键.trim()]: 值.trim() };
            }
            break;
        }
            
        case '读档时设置变量': {
            const [键, 值] = (参数[0] || '').split('=');
            if (键 && 值 !== undefined) {
                结果.读档时设置变量 = { [键.trim()]: 值.trim() };
            }
            break;
        }
            
        case '输入':
            结果.输入 = {
                变量名: 参数[0] || '',
                占位符: 参数.占位符 || '',
                提示文字: 参数.提示文字 || '',
                按钮文字: 参数.按钮文字 || '确定',
                最大长度: parseInt(参数.最大长度) || 20,
                必填: 参数.必填 === 'true'
            };
            if (!结果.输入.提示文字) 结果.输入.提示文字 = 结果.输入.占位符;
            break;
            
        case '自动存档':
            结果.自动存档 = 参数[0] !== 'false';
            break;
            
        case '自动节点':
            结果.自动节点 = parseFloat(参数[0]) || 0;
            break;
            
        case '解锁CG':
            结果.解锁CG = { 名称: 参数[0], 路径: 参数[1] || '' };
            break;
            
        case '调查':
            结果.调查 = {
                光标: 参数.光标 || 'default',
                返回: 参数.返回 || '',
                区域: []
            };
            break;
            
        case '跳转HTML':
            结果.跳转HTML = { 路径: 参数[0] || 'index.html' };
            if (参数.参数) 结果.跳转HTML.参数 = 参数.参数;
            if (参数.传递变量) 结果.跳转HTML.传递变量 = 参数.传递变量.split(',').map(s => s.trim());
            break;
            
        case '条件':
            结果.条件 = {
                表达式: 参数[0] || '',
                真目标: 参数.真 || null,
                假目标: 参数.假 || null
            };
            break;
            
        case '逐字显示':
            if (参数[0] === 'false') {
                结果.逐字显示 = { 启用: false };
            } else {
                结果.逐字显示 = { 启用: true, 速度: parseFloat(参数[0]) || 0.05 };
            }
            break;
            
        case '打字音效':
            if (参数[0] === 'false') {
                结果.打字音效 = { 启用: false };
            } else {
                结果.打字音效 = {
                    启用: true,
                    路径: 参数[0] || '',
                    音量: parseFloat(参数.音量) || 1,
                    间隔字符数: parseInt(参数.间隔) || 1
                };
            }
            break;
            
        case '快进':
            结果.快进模式 = 参数[0] === 'true';
            break;
            
        case '音乐淡出':
            结果.音乐淡出时间 = parseInt(参数[0]) || 1000;
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
                播放次数: parseInt(参数[1]) || -1,
                播放间隔: parseFloat(参数[2]) || 0,
                音量: parseFloat(参数[3]) || 1
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
                选项列表.push({
                    文本: 跳转匹配 ? 跳转匹配[1].trim() : 行,
                    目标: 跳转匹配 ? 跳转匹配[2].trim() : null
                });
                continue;
            }
            
            if (当前调查节点 && 行.startsWith('区域 ')) {
                const 区域参数 = 解析参数(行.replace('区域 ', ''));
                当前调查节点.调查.区域.push({
                    x: parseInt(区域参数.x) || parseInt(区域参数[0]) || 0,
                    y: parseInt(区域参数.y) || parseInt(区域参数[1]) || 0,
                    宽度: parseInt(区域参数.宽) || parseInt(区域参数[2]) || 100,
                    高度: parseInt(区域参数.高) || parseInt(区域参数[3]) || 100,
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
// ====================== 全局变量 ======================
let 当前状态 = null;
let 全局音效 = [];
let 用户已交互 = false;
let 隐藏模式激活 = false;
let 语言配置表 = null;
let 当前语言 = null;
// ====================== 多语言系统 ======================
function 切换语言(新语言代码) {
    if (!语言配置表 || !语言配置表.语言列表[新语言代码]) return;
    if (当前语言 === 新语言代码) return;
    
    当前语言 = 新语言代码;
    const 存储键名 = 读取配置('存储键名');
    localStorage.setItem(存储键名.语言, 当前语言);
    
    if (当前状态.逐字显示 && 当前状态.逐字显示.打字定时器) {
        clearTimeout(当前状态.逐字显示.打字定时器);
        当前状态.逐字显示.打字定时器 = null;
    }
    const 内容元素 = document.querySelector('.内容');
    if (内容元素) 内容元素.dataset.正在打字 = 'false';
    
    const 当前章节 = 当前状态.当前章节;
    const 当前索引 = 当前状态.当前索引;
    if (当前章节) {
        delete 章节库[当前章节];
        加载章节(当前章节).then(() => {
            切换章节(当前章节, 当前索引);
        });
    }
    
    刷新界面文字();
}

function 刷新界面文字() {
    if (!语言配置表) return;
    
    const 映射 = {
        '快进按钮': '快进',
        '隐藏对话按钮': '隐藏',
        '导出存档按钮': '导出存档',
        '导入存档按钮': '导入存档'
    };
    
    for (const [id, key] of Object.entries(映射)) {
        const el = document.getElementById(id);
        if (el) el.textContent = 获取界面文字(key);
    }
    
    const 存档标题 = document.querySelector('#存档界面 .标题');
    if (存档标题) 存档标题.textContent = 获取界面文字('存档管理');
}

function 获取界面文字(标识) {
    if (!语言配置表 || !当前语言) return 标识;
    if (当前语言 === 语言配置表.默认语言) return 标识;
    
    const 文字项 = 语言配置表.界面文字?.[标识];
    if (!文字项) return 标识;
    return 文字项[当前语言] || 标识;
}

function 获取本地化文本(节点) {
    if (!节点) return { 角色: '', 内容: '' };
    if (!语言配置表) return { 角色: 节点.角色 || '', 内容: 节点.内容 || '' };
    
    if (节点._翻译内容 !== undefined) {
        return {
            角色: 节点._翻译角色 || 节点.角色 || '',
            内容: 节点._翻译内容 || ''
        };
    }
    
    if (当前语言 !== 语言配置表.默认语言) {
        const 角色字段 = `角色_${当前语言}`;
        const 内容字段 = `内容_${当前语言}`;
        if (节点[内容字段]) {
            return {
                角色: 节点[角色字段] || 节点.角色 || '',
                内容: 节点[内容字段] || ''
            };
        }
    }
    
    return {
        角色: 节点.角色 || '',
        内容: 节点.内容 || ''
    };
}

function 刷新当前对话() {
    if (!当前状态 || !当前状态.当前章节) return;
    const 当前章节数据 = 章节库[当前状态.当前章节];
    if (!当前章节数据) return;
    const 当前节点 = 当前章节数据[当前状态.当前索引];
    if (!当前节点) return;
    
    const 容器 = document.getElementById('对话框容器');
    if (!容器) return;
    
    const 角色元素 = 容器.querySelector('.角色');
    const 内容元素 = 容器.querySelector('.内容');
    const 选项容器 = 容器.querySelector('.选项容器');
    
    const { 角色, 内容 } = 获取本地化文本(当前节点);
    
    if (角色元素) {
        let 处理后的角色 = 角色.replace(/{([^}]+)}/g, (match, 变量路径) => {
            let val = 当前状态.用户变量;
            const 路径段 = 变量路径.trim().split('.');
            for (let 段 of 路径段) {
                if (val === undefined || val === null) break;
                val = val[段];
            }
            return (val !== undefined && val !== null) ? val : '';
        });
        角色元素.innerHTML = 处理后的角色;
        角色元素.style.display = 处理后的角色 ? 'block' : 'none';
        if (typeof 应用角色样式 === 'function') 应用角色样式();
    }
    
    if (内容元素) {
        let 处理后的内容 = 内容.replace(/{([^}]+)}/g, (match, 变量路径) => {
            let val = 当前状态.用户变量;
            const 路径段 = 变量路径.trim().split('.');
            for (let 段 of 路径段) {
                if (val === undefined || val === null) break;
                val = val[段];
            }
            return (val !== undefined && val !== null) ? val : '';
        });
        内容元素.innerHTML = 处理后的内容;
        内容元素.dataset.正在打字 = 'false';
        if (当前状态.逐字显示 && 当前状态.逐字显示.打字定时器) {
            clearTimeout(当前状态.逐字显示.打字定时器);
            当前状态.逐字显示.打字定时器 = null;
        }
        if (当前状态.逐字显示) {
            当前状态.逐字显示.打字已完成 = true;
        }
    }
    
    if (当前节点.选项 && 当前节点.选项.length > 0) {
        if (!选项容器) return;
        const 按钮列表 = 选项容器.querySelectorAll('.选项按钮');
        当前节点.选项.forEach((opt, idx) => {
            if (按钮列表[idx]) {
                let 选项文本 = '';
                if (当前语言 !== 语言配置表.默认语言) {
                    const 选项字段 = `文本_${当前语言}`;
                    选项文本 = opt[选项字段] || opt[`文本_${语言配置表.默认语言}`] || opt.文本 || '';
                } else {
                    选项文本 = opt.文本 || '';
                }
                选项文本 = 选项文本.replace(/{([^}]+)}/g, (match, 变量路径) => {
                    let val = 当前状态.用户变量;
                    const 路径段 = 变量路径.trim().split('.');
                    for (let 段 of 路径段) {
                        if (val === undefined || val === null) break;
                        val = val[段];
                    }
                    return (val !== undefined && val !== null) ? val : '';
                });
                按钮列表[idx].textContent = 选项文本;
            }
        });
    }
    
    if (当前节点.输入) {
        const 输入容器 = 容器.querySelector('.输入容器');
        if (输入容器) {
            const 提示元素 = 输入容器.querySelector('.输入提示文字');
            if (提示元素 && 当前节点.输入.提示文字) {
                let 提示文本 = '';
                if (当前语言 !== 语言配置表.默认语言) {
                    const 提示字段 = `提示文字_${当前语言}`;
                    提示文本 = 当前节点.输入[提示字段] || 当前节点.输入[`提示文字_${语言配置表.默认语言}`] || 当前节点.输入.提示文字;
                } else {
                    提示文本 = 当前节点.输入.提示文字;
                }
                提示元素.textContent = 提示文本;
            }
            const 输入框 = 输入容器.querySelector('.输入框');
            if (输入框 && 当前节点.输入.占位符) {
                let 占位符文本 = '';
                if (当前语言 !== 语言配置表.默认语言) {
                    const 占位符字段 = `占位符_${当前语言}`;
                    占位符文本 = 当前节点.输入[占位符字段] || 当前节点.输入[`占位符_${语言配置表.默认语言}`] || 当前节点.输入.占位符;
                } else {
                    占位符文本 = 当前节点.输入.占位符;
                }
                输入框.placeholder = 占位符文本;
            }
            const 确认按钮 = 输入容器.querySelector('.输入确认按钮');
            if (确认按钮 && 当前节点.输入.按钮文字) {
                let 按钮文本 = '';
                if (当前语言 !== 语言配置表.默认语言) {
                    const 按钮字段 = `按钮文字_${当前语言}`;
                    按钮文本 = 当前节点.输入[按钮字段] || 当前节点.输入[`按钮文字_${语言配置表.默认语言}`] || 当前节点.输入.按钮文字;
                } else {
                    按钮文本 = 当前节点.输入.按钮文字;
                }
                确认按钮.textContent = 按钮文本;
            }
        }
    }
    
    if (当前节点.标题) {
        const 标题容器 = document.getElementById('标题容器');
        if (标题容器 && 当前节点.标题.内容) {
            let 标题内容 = 当前节点.标题.内容;
            if (当前语言 !== 语言配置表.默认语言) {
                const 标题字段 = `标题_${当前语言}`;
                标题内容 = 当前节点.标题[标题字段] || 当前节点.标题[`标题_${语言配置表.默认语言}`] || 当前节点.标题.内容;
            }
            标题容器.textContent = 标题内容;
        }
    }
}

function 切换对话框隐藏() {
    const 对话包装容器 = document.getElementById('对话包装容器');
    if (!对话包装容器) return;
    
    if (隐藏模式激活) {
        对话包装容器.style.display = '';
        隐藏模式激活 = false;
    } else {
        对话包装容器.style.display = 'none';
        隐藏模式激活 = true;
    }
}

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
    const 键名 = 读取配置('CG存储键名', "Dvnge视觉小说引擎_CG收集库");
    const CG库 = JSON.parse(localStorage.getItem(键名)) || {};
    CG库[CG名称] = { 路径: CG路径, 解锁时间: new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) };
    localStorage.setItem(键名, JSON.stringify(CG库));
    return true;
}

function 获取已解锁CG() {
    const 键名 = 读取配置('CG存储键名', "Dvnge视觉小说引擎_CG收集库");
    return JSON.parse(localStorage.getItem(键名)) || {};
}

function 检查CG解锁状态(CG名称) {
    const 键名 = 读取配置('CG存储键名', "Dvnge视觉小说引擎_CG收集库");
    const CG库 = JSON.parse(localStorage.getItem(键名)) || {};
    return !!CG库[CG名称];
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
    const 存档数据 = 生成存档快照();
    localStorage.setItem(`自动存档`, JSON.stringify(存档数据));
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

// ====================== 动画辅助 ======================
function 清除所有动画() {
    ['左立绘', '中立绘', '右立绘'].forEach(位置 => {
        const 元素 = document.getElementById(位置);
        if (元素) 元素.style.animation = '';
    });
    const 对话框 = document.getElementById('对话框容器');
    if (对话框) 对话框.style.animation = '';
    const 角色元素 = document.querySelector('.角色');
    if (角色元素) 角色元素.style.animation = '';
    const 内容元素 = document.querySelector('.内容');
    if (内容元素) 内容元素.style.animation = '';
    const 背景容器 = document.getElementById('背景容器');
    if (背景容器) 背景容器.style.animation = '';
    const 左边头像 = document.getElementById('左边头像容器');
    const 右边头像 = document.getElementById('右边头像容器');
    if (左边头像) {
        左边头像.style.animation = '';
        左边头像.querySelectorAll('img').forEach(img => img.style.animation = '');
    }
    if (右边头像) {
        右边头像.style.animation = '';
        右边头像.querySelectorAll('img').forEach(img => img.style.animation = '');
    }
}

function 应用动画(元素, animation值) {
    if (!元素 || !animation值) return;
    元素.style.animation = animation值;
}

// ====================== 核心引擎 ======================
function 切换章节(新章节名称, 起始索引 = 0, 选项 = {}) {
    if (typeof 起始索引 === 'string') {
        const 目标章节数据 = 章节库[新章节名称];
        if (目标章节数据) {
            const 标签表 = 建立标签表(目标章节数据);
            起始索引 = 标签表[起始索引] ?? 0;
        } else {
            起始索引 = 0;
        }
    }
    
    const 播放器 = document.getElementById('背景音乐');
    if (当前状态.音乐) {
        播放器.pause();
        播放器.src = '';
    }
    
    const 已有调查层 = document.getElementById('调查层');
    if (已有调查层) 已有调查层.remove();
    document.body.style.cursor = 'default';
    
    const 存档按钮 = document.getElementById('存档按钮');
    const 返回按钮 = document.getElementById('返回按钮');
    if (存档按钮) 存档按钮.classList.remove('隐藏');
    if (返回按钮) 返回按钮.classList.add('隐藏');
    
    const 已有头像容器 = document.getElementById('对话框头像容器');
    if (已有头像容器) {
        已有头像容器.remove();
    }
    
    const 初始 = 读取配置('初始状态');
    当前状态 = {
        ...JSON.parse(JSON.stringify(初始)),
        当前章节: 新章节名称,
        当前索引: 起始索引,
        用户变量: 从本地存储加载用户变量() ? 当前状态.用户变量 : {}
    };
    
    ['左立绘', '中立绘', '右立绘'].forEach(位置 => {
        const 元素 = document.getElementById(位置);
        if (元素) {
            元素.style.opacity = 0;
            元素.src = "";
        }
    });
    
    const 新章节数据 = 章节库[新章节名称];
    if (!新章节数据?.length) {
        console.error(`章节【${新章节名称}】数据加载失败`);
        return;
    }
    更新场景(新章节数据[起始索引]);
    const 当前章节数据 = 章节库[新章节名称];
    当前状态.标签表 = 建立标签表(当前章节数据);
}

// ====================== 视频播放控制 ======================
function 控制视频播放(视频元素, 配置) {
    if (!视频元素 || 视频元素.tagName !== 'VIDEO') return;
    const 循环 = 配置.循环 ?? true;
    const 播放次数 = 配置.播放次数 ?? -1;
    const 播放间隔 = (配置.播放间隔 ?? 0) * 1000;
    视频元素.loop = (循环 && 播放次数 === -1);
    if (!循环 || (循环 && 播放次数 > 0)) {
        let 当前计数 = 0;
        const 播放结束处理 = () => {
            当前计数++;
            if (当前计数 < 播放次数) {
                if (播放间隔 > 0) {
                    setTimeout(() => { 视频元素.play(); }, 播放间隔);
                } else {
                    视频元素.play();
                }
            }
        };
        视频元素.addEventListener('ended', 播放结束处理);
    }
}

// ====================== 打字效果 ======================
function 开始逐字显示(内容元素, 完整文本, 速度, 当前节点) {
    if (当前状态.逐字显示 && 当前状态.逐字显示.打字定时器) {
        clearTimeout(当前状态.逐字显示.打字定时器);
        当前状态.逐字显示.打字定时器 = null;
    }
    if (当前状态.逐字显示) {
        当前状态.逐字显示.打字已完成 = false;
    }
    内容元素.dataset.正在打字 = 'true';
    document.removeEventListener('click', 处理全局点击);
    
    let 打字音效对象 = null;
    if (当前状态.打字音效 && 当前状态.打字音效.启用 && 当前状态.打字音效.路径) {
        if (!当前状态.打字音效.当前音效对象) {
            当前状态.打字音效.当前音效对象 = new Audio(当前状态.打字音效.路径);
            当前状态.打字音效.当前音效对象.volume = 当前状态.打字音效.音量;
            当前状态.打字音效.当前音效对象.load();
        }
        打字音效对象 = 当前状态.打字音效.当前音效对象;
        打字音效对象.volume = 当前状态.打字音效.音量;
    }
    
    const 临时容器 = document.createElement('div');
    临时容器.style.position = 'absolute';
    临时容器.style.visibility = 'hidden';
    临时容器.innerHTML = 完整文本;
    document.body.appendChild(临时容器);
    
    const 文本节点列表 = [];
    
    function 收集文本节点(节点) {
        if (节点.nodeType === Node.TEXT_NODE) {
            const 文本 = 节点.textContent;
            if (文本.trim()) 文本节点列表.push(节点);
        } else if (节点.nodeType === Node.ELEMENT_NODE) {
            const 标签名 = 节点.tagName.toLowerCase();
            const 自闭合标签 = ['br', 'hr', 'img', 'input', 'meta', 'link'];
            if (!自闭合标签.includes(标签名)) {
                for (const 子节点 of 节点.childNodes) {
                    收集文本节点(子节点);
                }
            }
        }
    }
    收集文本节点(临时容器);
    document.body.removeChild(临时容器);
    
    const 显示结构 = [];
    
    function 构建显示结构(节点, 父标签 = '') {
        if (节点.nodeType === Node.TEXT_NODE) {
            const 文本 = 节点.textContent;
            for (const 字符 of 文本) {
                显示结构.push({ 类型: '字符', 内容: 字符, 父标签: 父标签 });
            }
        } else if (节点.nodeType === Node.ELEMENT_NODE) {
            const 标签名 = 节点.tagName.toLowerCase();
            const 自闭合标签 = ['br', 'hr', 'img', 'input', 'meta', 'link'];
            if (自闭合标签.includes(标签名)) {
                显示结构.push({ 类型: '标签', 内容: 节点.outerHTML, 父标签: 父标签 });
            } else {
                显示结构.push({ 类型: '开始标签', 内容: `<${标签名}${获取属性字符串(节点)}>`, 父标签: 父标签 });
                for (const 子节点 of 节点.childNodes) {
                    构建显示结构(子节点, 标签名);
                }
                显示结构.push({ 类型: '结束标签', 内容: `</${标签名}>`, 父标签: 父标签 });
            }
        }
    }
    
    function 获取属性字符串(元素) {
        let 属性字符串 = '';
        for (const 属性 of 元素.attributes) {
            属性字符串 += ` ${属性.name}="${属性.value}"`;
        }
        return 属性字符串;
    }
    const 临时解析器 = document.createElement('div');
    临时解析器.innerHTML = 完整文本;
    for (const 子节点 of 临时解析器.childNodes) {
        构建显示结构(子节点);
    }
    
    let 当前索引 = 0;
    let 当前HTML = '';
    const 标签堆栈 = [];
    let 字符计数 = 1;
    
    const 打字函数 = () => {
        if (当前索引 >= 显示结构.length) {
            内容元素.innerHTML = 完整文本;
            内容元素.dataset.正在打字 = 'false';
            if (当前状态.逐字显示) {
                当前状态.逐字显示.打字已完成 = true;
            }
            if (当前状态.打字音效 && 当前状态.打字音效.当前音效对象) {
                当前状态.打字音效.当前音效对象.pause();
                当前状态.打字音效.当前音效对象.currentTime = 0;
            }
            if (当前状态.逐字显示 && 当前状态.逐字显示.打字定时器) {
                clearTimeout(当前状态.逐字显示.打字定时器);
                当前状态.逐字显示.打字定时器 = null;
            }
            if (!当前节点.选项?.length && !当前节点.输入) {
                if (!当前节点.自动节点 || 当前节点.自动节点 <= 0) {
                    setTimeout(() => { document.addEventListener('click', 处理全局点击); }, 0);
                }
            }
            return;
        }
        const 当前单元 = 显示结构[当前索引];
        if (当前单元.类型 === '开始标签' && 当前单元.内容.startsWith('<wait')) {
            let 秒数 = 0.5;
            const 匹配 = 当前单元.内容.match(/<wait=(\d+\.?\d*)>/);
            if (匹配) 秒数 = parseFloat(匹配[1]);
            当前索引++;
            当前状态.逐字显示.打字定时器 = setTimeout(打字函数, 秒数 * 1000);
            return;
        }
        if (当前单元.类型 === '字符') {
            if (当前单元.内容 === '\n') {
                当前HTML += '<br>';
            } else {
                当前HTML += 当前单元.内容;
                if (当前状态.打字音效 && 当前状态.打字音效.启用 && 打字音效对象) {
                    const 间隔 = Math.max(1, 当前状态.打字音效.间隔字符数);
                    if ((字符计数 - 1) % 间隔 === 0) {
                        打字音效对象.pause();
                        打字音效对象.currentTime = 0;
                        打字音效对象.play().catch(e => console.log('打字音效播放失败:', e));
                    }
                }
                字符计数++;
            }
        } else if (当前单元.类型 === '标签') {
            当前HTML += 当前单元.内容;
        } else if (当前单元.类型 === '开始标签') {
            当前HTML += 当前单元.内容;
            标签堆栈.push(当前单元);
        } else if (当前单元.类型 === '结束标签') {
            当前HTML += 当前单元.内容;
            标签堆栈.pop();
        }
        内容元素.innerHTML = 当前HTML;
        if (当前节点 && 当前节点.动画?.内容) {
            内容元素.style.animation = 当前节点.动画.内容;
        }
        当前索引++;
        当前状态.逐字显示.打字定时器 = setTimeout(打字函数, 速度 * 1000);
    };
    打字函数();
}

function 停止打字效果() {
    if (当前状态.逐字显示 && 当前状态.逐字显示.打字定时器) {
        clearTimeout(当前状态.逐字显示.打字定时器);
        当前状态.逐字显示.打字定时器 = null;
    }
    if (当前状态.逐字显示) {
        当前状态.逐字显示.打字已完成 = false;
    }
    const 内容元素 = document.querySelector('.内容');
    if (内容元素 && 内容元素.dataset.正在打字 === 'true') {
        const 完整内容 = 内容元素.dataset.完整内容 || '';
        内容元素.innerHTML = 完整内容;
        内容元素.dataset.正在打字 = 'false';
    }
}

let 节点 = null;

// ====================== 快进控制 ======================
function 停止快进() {
    if (当前状态.快进定时器) {
        clearTimeout(当前状态.快进定时器);
        当前状态.快进定时器 = null;
    }
    当前状态.快进模式 = false;
}

function 开始快进() {
    if (!当前状态.快进模式) return;
    
    const 当前章节数据 = 章节库[当前状态.当前章节];
    if (!当前章节数据) return;
    if (当前状态.当前索引 >= 当前章节数据.length) {
        停止快进();
        return;
    }
    
    const 当前节点 = 当前章节数据[当前状态.当前索引];
    const 有交互 = !!(当前节点?.选项?.length) || !!(当前节点?.输入) || !!(当前节点?.调查);
    
    更新场景(当前节点);
    
    if (有交互) {
        停止快进();
        const 快进按钮 = document.getElementById('快进按钮');
        if (快进按钮) 快进按钮.classList.remove('激活');
        return;
    }
    const 下一个索引 = 当前状态.当前索引 + 1;
    if (下一个索引 >= 当前章节数据.length) {
        停止快进();
        return;
    }
    
    const 下一个节点 = 当前章节数据[下一个索引];
    const 下一个有交互 = !!(下一个节点?.选项?.length) || !!(下一个节点?.输入) || !!(下一个节点?.调查);
    
    if (下一个有交互) {
        当前状态.当前索引 = 下一个索引;
        开始快进();
        return;
    }
    
    当前状态.快进定时器 = setTimeout(() => {
        当前状态.快进定时器 = null;
        if (!当前状态.快进模式) return;
        当前状态.当前索引++;
        开始快进();
    }, 200);
}

function 切换快进模式(e) {
    if (e) e.stopPropagation();
    if (当前状态.快进模式) {
        停止快进();
        const 快进按钮 = document.getElementById('快进按钮');
        if (快进按钮) 快进按钮.classList.remove('激活');
        return;
    }
    当前状态.快进模式 = true;
    const 快进按钮 = document.getElementById('快进按钮');
    if (快进按钮) 快进按钮.classList.add('激活');
    开始快进();
}

function 切换快进模式(e) {
    if (e) e.stopPropagation();
    if (当前状态.快进模式) {
        停止快进();
        const 快进按钮 = document.getElementById('快进按钮');
        if (快进按钮) 快进按钮.classList.remove('激活');
        return;
    }
    当前状态.快进模式 = true;
    const 快进按钮 = document.getElementById('快进按钮');
    if (快进按钮) 快进按钮.classList.add('激活');
    开始快进();
}

function 停止当前音效() {
    当前状态.音效.forEach(音效 => {
        try {
            音效.pause();
            音效.currentTime = 0;
            const 索引 = 全局音效.indexOf(音效);
            if (索引 !== -1) 全局音效.splice(索引, 1);
        } catch (错误) { console.error('停止音效时出错:', 错误); }
    });
    当前状态.音效 = [];
}

// ====================== 条件解析 ======================
function 解析条件表达式(表达式) {
    try {
        return new Function('vars', `try { return ${表达式}; } catch { return false; }`)(当前状态.用户变量);
    } catch (e) {
        console.error('条件解析错误:', e);
        return false;
    }
}

// ====================== 选项处理 ======================
function 处理选项点击(选项) {
    停止快进();
    let 条件满足 = true;
    if (选项.条件) {
        const 用户变量 = 当前状态.用户变量;
        const 安全作用域 = {
            vars: 用户变量,
            Math: Math,
            getVar: function(path) {
                return path.split('.').reduce((obj, key) => obj?.[key], 用户变量);
            }
        };
        try {
            条件满足 = new Function('vars', 'getVar', 'Math', `return ${选项.条件};`)(
                安全作用域.vars, 安全作用域.getVar, 安全作用域.Math
            );
        } catch (e) {
            console.error('条件解析错误:', e);
            条件满足 = false;
        }
    }
    if (条件满足 && 选项.设置变量) {
        Object.entries(选项.设置变量).forEach(([变量路径, 值]) => {
            const 路径数组 = 变量路径.split('.');
            let 当前对象 = 当前状态.用户变量;
            路径数组.slice(0, -1).forEach(段 => {
                if (!当前对象[段]) 当前对象[段] = {};
                当前对象 = 当前对象[段];
            });
            const 最后字段 = 路径数组[路径数组.length - 1];
            当前对象[最后字段] = 值;
            保存用户变量到本地存储();
        });
    }
    if (条件满足 && 选项.解锁CG) {
        解锁CG(选项.解锁CG.名称, 选项.解锁CG.路径);
    }
    const 跳转目标 = 条件满足 ? 选项.目标 : 选项.否则目标;
    if (typeof 跳转目标 === 'number') {
        当前状态.当前索引 = 跳转目标;
        继续剧情();
    } else if (跳转目标?.章节) {
        切换章节(跳转目标.章节, 跳转目标.索引 || 0);
    } else if (typeof 跳转目标 === 'string') {
        当前状态.当前索引 = 当前状态.标签表[跳转目标] ?? 当前状态.当前索引 + 1;
        继续剧情();
    } else if (!跳转目标) {
        当前状态.当前索引++;
        继续剧情();
    }
}

// ====================== 继续剧情 ======================
function 继续剧情() {
    停止当前音效();
    停止打字效果();
    if (当前状态.自动节点定时器) {
        clearTimeout(当前状态.自动节点定时器);
        当前状态.自动节点定时器 = null;
    }
    if (当前状态.快进定时器) {
        clearTimeout(当前状态.快进定时器);
        当前状态.快进定时器 = null;
    }
    
    const 当前章节数据 = 章节库[当前状态.当前章节];
    if (!当前章节数据) return;
    if (当前状态.当前索引 >= 当前章节数据.length) return;
    
    const 当前节点 = 当前章节数据[当前状态.当前索引];
    
    if (当前状态.快进模式) {
        开始快进();
        return;
    }
    
    更新场景(当前节点);
}

// ====================== 场景更新 ======================
function 更新场景(当前节点) {
    节点 = 当前节点;
    if (!节点) return;
    停止当前音效();
    停止打字效果();
    清除所有动画();
    if (当前状态.自动节点定时器) {
        clearTimeout(当前状态.自动节点定时器);
        当前状态.自动节点定时器 = null;
    }
    
    if (节点.跳转HTML) {
        const 跳转路径 = 节点.跳转HTML.路径 || 'index.html';
        let 参数部分 = 节点.跳转HTML.参数 ? `?${节点.跳转HTML.参数}` : '';
        if (参数部分) {
            参数部分 += `&来自章节=${encodeURIComponent(当前状态.当前章节)}&来自索引=${当前状态.当前索引}`;
        } else {
            参数部分 = `?来自章节=${encodeURIComponent(当前状态.当前章节)}&来自索引=${当前状态.当前索引}`;
        }
        if (节点.跳转HTML.传递变量) {
            const 变量列表 = Array.isArray(节点.跳转HTML.传递变量) ? 节点.跳转HTML.传递变量 : [节点.跳转HTML.传递变量];
            变量列表.forEach(变量名 => {
                const 变量值 = 当前状态.用户变量[变量名];
                if (变量值 !== undefined) {
                    参数部分 += `&${encodeURIComponent(变量名)}=${encodeURIComponent(变量值)}`;
                }
            });
        }
        window.location.href = 跳转路径 + 参数部分;
        return;
    }
    
    if (节点.目标) {
        if (typeof 节点.目标 === 'number') {
            当前状态.当前索引 = 节点.目标;
            继续剧情();
            return;
        } else if (typeof 节点.目标 === 'string') {
            当前状态.当前索引 = 当前状态.标签表[节点.目标] ?? 当前状态.当前索引 + 1;
            继续剧情();
            return;
        } else if (节点.目标 && typeof 节点.目标 === 'object') {
            if (节点.目标.章节) {
                切换章节(节点.目标.章节, 节点.目标.索引 || 0);
                return;
            }
        }
        当前状态.当前索引++;
        继续剧情();
        return;
    }
    
    if (节点.自动节点 && 节点.自动节点 > 0) {
        当前状态.自动节点 = 节点.自动节点;
        document.removeEventListener('click', 处理全局点击);
        当前状态.自动节点定时器 = setTimeout(() => {
            当前状态.当前索引++;
            继续剧情();
        }, 节点.自动节点 * 1000);
    } else {
        if (!节点.选项?.length && !节点.输入) {
            document.addEventListener('click', 处理全局点击);
        }
        当前状态.自动节点 = 0;
    }
    
    if (节点.设置变量) {
        Object.entries(节点.设置变量).forEach(([变量路径, 值]) => {
            const 路径数组 = 变量路径.split('.');
            let 当前对象 = 当前状态.用户变量;
            路径数组.slice(0, -1).forEach(段 => {
                if (!当前对象[段]) 当前对象[段] = {};
                当前对象 = 当前对象[段];
            });
            const 最后字段 = 路径数组[路径数组.length - 1];
            if (typeof 值 === 'string') {
                const 操作符匹配 = 值.match(/^(\+|\-|\*|\/)=(-?\d+\.?\d*)/);
                if (操作符匹配) {
                    const [_, 操作符, 数字] = 操作符匹配;
                    const 当前值 = parseFloat(当前对象[最后字段] || 0);
                    const 数值 = parseFloat(数字);
                    switch (操作符) {
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
                    保存用户变量到本地存储();
                    return;
                }
            }
            当前对象[最后字段] = 值;
            保存用户变量到本地存储();
        });
    }
    
    if (节点.打字音效 !== undefined) {
        const 打字音效设置 = 节点.打字音效;
        if (打字音效设置 === null) {
            当前状态.打字音效 = { 启用: false, 路径: "", 音量: 0.5, 间隔字符数: 1, 当前音效对象: null };
        } else {
            let 音效路径 = 打字音效设置.路径 || 当前状态.打字音效.路径;
            if (音效路径) {
                音效路径 = 音效路径.replace(/{([^}]+)}/g, (匹配, 变量名) => {
                    const 变量路径 = 变量名.trim().split('.');
                    let 值 = 当前状态.用户变量;
                    try { 变量路径.forEach(段 => 值 = 值[段]); return 值 || ''; } catch { return ''; }
                });
            }
            当前状态.打字音效 = {
                启用: 打字音效设置.启用 !== undefined ? 打字音效设置.启用 : 当前状态.打字音效.启用,
                路径: 音效路径 !== undefined ? 音效路径 : 当前状态.打字音效.路径,
                音量: 打字音效设置.音量 !== undefined ? 打字音效设置.音量 : 当前状态.打字音效.音量,
                间隔字符数: 打字音效设置.间隔字符数 !== undefined ? 打字音效设置.间隔字符数 : 当前状态.打字音效.间隔字符数,
                当前音效对象: null
            };
        }
    }
    
    if (节点.背景 !== undefined) {
        if (节点.背景 === null) {
            const 背景视频元素 = document.getElementById('背景视频');
            if (背景视频元素) 背景视频元素.remove();
            const 背景容器 = document.getElementById('背景容器');
            if (背景容器) {
                背景容器.style.opacity = '0';
                背景容器.style.background = '#000';
            }
            document.body.style.background = '#000';
            当前状态.背景 = '#000';
        } else {
            let 背景值 = 节点.背景;
            背景值 = 背景值.replace(/{([^}]+)}/g, (匹配, 变量名) => {
                const 变量路径 = 变量名.trim().split('.');
                let 值 = 当前状态.用户变量;
                try { 变量路径.forEach(段 => 值 = 值[段]); return 值 || ''; } catch { return ''; }
            });
            if (节点.背景媒体) {
                当前状态.背景媒体 = { ...当前状态.背景媒体, ...节点.背景媒体 };
            }
            const 视频扩展名 = ['mp4', 'webm', 'ogg', 'mov'];
            const 文件扩展名 = 背景值.split('.').pop().toLowerCase();
            if (视频扩展名.includes(文件扩展名)) {
                const 已有背景视频 = document.getElementById('背景视频');
                if (已有背景视频) 已有背景视频.remove();
                const 视频元素 = document.createElement('video');
                视频元素.id = '背景视频';
                视频元素.src = 背景值;
                视频元素.poster = '你的视频封面图片.png';
                视频元素.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:-1';
                const 目标音量 = 当前状态.背景媒体.音量 ?? 1;
                视频元素.dataset.目标音量 = 目标音量;
                if (用户已交互) {
                    视频元素.volume = 目标音量;
                    视频元素.muted = (目标音量 === 0);
                } else {
                    视频元素.volume = 0;
                    视频元素.muted = true;
                }
                视频元素.playsInline = true;
                视频元素.autoplay = true;
                document.body.appendChild(视频元素);
                视频元素.play().catch(e => console.log('视频播放失败:', e));
                控制视频播放(视频元素, 当前状态.背景媒体);
                const 背景容器 = document.getElementById('背景容器');
                if (背景容器) 背景容器.style.opacity = '0';
                document.body.style.background = '#000';
                当前状态.背景 = '#000';
            } else {
                const 背景容器 = document.getElementById('背景容器');
                if (!背景容器) return;
                let 背景图 = 背景值;
                if (背景值.includes('.') || 背景值.includes('/')) {
                    背景图 = `url('${背景值}') center/cover`;
                }
                const 当前背景 = 背景容器.style.background;
                if (当前背景 === 背景图) return;
                const 已有背景视频 = document.getElementById('背景视频');
                if (已有背景视频) 已有背景视频.remove();
                背景容器.style.opacity = '0';
                setTimeout(() => {
                    背景容器.style.background = 背景图;
                    void 背景容器.offsetHeight;
                    背景容器.style.opacity = '1';
                }, 300);
                当前状态.背景 = 背景图;
                document.body.style.background = '#000';
            }
        }
    }
    
    if (节点.标题) {
        const 标题容器 = document.getElementById('标题容器');
        const 标题设置 = 节点.标题;
        if (标题设置.显示 === false) {
            标题容器.classList.add('标题退出');
            setTimeout(() => {
                标题容器.classList.add('隐藏');
                标题容器.classList.remove('标题退出');
            }, 600);
            当前状态.标题.显示 = false;
        } else {
            let 标题内容 = 标题设置._翻译内容 || 标题设置.内容 || '';
            标题内容 = 标题内容.replace(/{([^}]+)}/g, (匹配, 变量名) => {
                const 变量路径 = 变量名.trim().split('.');
                let 值 = 当前状态.用户变量;
                try { 变量路径.forEach(段 => { 值 = 值[段]; }); return 值 || ''; } catch { return '无效变量'; }
            });
            const 位置类列表 = ['标题位置-上', '标题位置-下', '标题位置-左', '标题位置-右',
                '标题位置-左上', '标题位置-左下', '标题位置-右上', '标题位置-右下', '标题位置-中'
            ];
            位置类列表.forEach(类名 => 标题容器.classList.remove(类名));
            const 位置 = 标题设置.位置 || '中';
            标题容器.classList.add(`标题位置-${位置}`);
            标题容器.textContent = 标题内容;
            if (标题设置.样式) {
                if (typeof 标题设置.样式 === 'string') {
                    标题容器.style.cssText = 标题设置.样式;
                } else {
                    Object.entries(标题设置.样式).forEach(([属性, 值]) => {
                        标题容器.style[属性] = 值;
                    });
                }
            } else {
                标题容器.style.cssText = '';
            }
            标题容器.classList.remove('隐藏');
            标题容器.classList.add('标题进入');
            当前状态.标题 = {
                显示: true,
                内容: 标题设置.内容,
                位置: 位置,
                样式: 标题设置.样式 || {},
                _翻译内容: 标题设置._翻译内容 || null
            };
        }
    }
    
    ['左立绘', '中立绘', '右立绘'].forEach(位置 => {
        let 元素 = document.getElementById(位置);
        if (!元素) return;
        const 节点立绘 = 节点.立绘?.[位置] || {};
        if (节点立绘.路径) {
            let 解析路径 = 节点立绘.路径;
            解析路径 = 解析路径.replace(/{([^}]+)}/g, (匹配, 变量名) => {
                const 变量路径 = 变量名.trim().split('.');
                let 值 = 当前状态.用户变量;
                try { 变量路径.forEach(段 => 值 = 值[段]); return 值 || ''; } catch { return ''; }
            });
            if (节点立绘.媒体) {
                当前状态[位置].媒体 = { ...当前状态[位置].媒体, ...节点立绘.媒体 };
            }
            const 视频扩展名 = ['mp4', 'webm', 'ogg', 'mov'];
            const 文件扩展名 = 解析路径.split('.').pop().toLowerCase();
            if (视频扩展名.includes(文件扩展名)) {
                if (元素.tagName !== 'VIDEO') {
                    const 视频元素 = document.createElement('video');
                    视频元素.id = 位置;
                    视频元素.className = 元素.className;
                    视频元素.style.cssText = 元素.style.cssText;
                    视频元素.poster = '你的视频封面图片.png';
                    const 目标音量 = 当前状态[位置].媒体.音量 ?? 1;
                    视频元素.dataset.目标音量 = 目标音量;
                    if (用户已交互) {
                        视频元素.volume = 目标音量;
                        视频元素.muted = (目标音量 === 0);
                    } else {
                        视频元素.volume = 0;
                        视频元素.muted = true;
                    }
                    视频元素.playsInline = true;
                    视频元素.autoplay = true;
                    元素.parentNode.replaceChild(视频元素, 元素);
                    元素 = 视频元素;
                }
            } else {
                if (元素.tagName !== 'IMG') {
                    const 图片元素 = document.createElement('img');
                    图片元素.id = 位置;
                    图片元素.className = 元素.className;
                    图片元素.style.cssText = 元素.style.cssText;
                    元素.parentNode.replaceChild(图片元素, 元素);
                    元素 = 图片元素;
                }
            }
            元素.src = 解析路径;
            if (元素.tagName === 'VIDEO') {
                元素.play().catch(e => console.log('视频播放失败:', e));
                控制视频播放(元素, 当前状态[位置].媒体);
            }
            元素.style.opacity = 1;
            当前状态[位置].显示 = true;
            当前状态[位置].路径 = 节点立绘.路径;
        } else if (节点立绘.隐藏) {
            元素.style.opacity = 0;
            当前状态[位置] = { ...当前状态[位置], 显示: false, 路径: "" };
        }
    });
    
    if (节点.动画?.左立绘) 应用动画(document.getElementById('左立绘'), 节点.动画.左立绘);
    if (节点.动画?.中立绘) 应用动画(document.getElementById('中立绘'), 节点.动画.中立绘);
    if (节点.动画?.右立绘) 应用动画(document.getElementById('右立绘'), 节点.动画.右立绘);
    
    const 音乐播放器 = document.getElementById('背景音乐');
    if (节点.hasOwnProperty('音乐')) {
        let 音乐路径 = 节点.音乐;
        if (typeof 音乐路径 === 'string') {
            音乐路径 = 音乐路径.replace(/{([^}]+)}/g, (匹配, 变量名) => {
                const 变量路径 = 变量名.trim().split('.');
                let 值 = 当前状态.用户变量;
                try { 变量路径.forEach(段 => { 值 = 值?.[段]; }); return 值 || ''; } catch { return '[无效路径]'; }
            });
        }
        if (音乐路径) {
            if (音乐播放器.src !== 音乐路径) {
                const 淡出开始时间 = Date.now();
                const 淡出间隔 = setInterval(() => {
                    const 进度 = (Date.now() - 淡出开始时间) / 当前状态.音乐淡出时间;
                    if (进度 >= 1) {
                        音乐播放器.pause();
                        音乐播放器.src = 音乐路径;
                        音乐播放器.volume = 1;
                        音乐播放器.play();
                        clearInterval(淡出间隔);
                    } else {
                        音乐播放器.volume = 1 - 进度;
                    }
                }, 50);
            }
            当前状态.音乐 = 音乐路径;
        } else {
            音乐播放器.pause();
            音乐播放器.currentTime = 0;
            音乐播放器.removeAttribute('src');
            当前状态.音乐 = null;
        }
    }
    
    if (节点.音效) {
        let 音效路径 = 节点.音效;
        音效路径 = 音效路径.replace(/{([^}]+)}/g, (匹配, 变量名) => {
            const 变量路径 = 变量名.trim().split('.');
            let 值 = 当前状态.用户变量;
            try { 变量路径.forEach(段 => 值 = 值?.[段]); return 值 || ''; } catch { return '[无效路径]'; }
        });
        if (音效路径) {
            const 音效元素 = new Audio(音效路径);
            音效元素.addEventListener('loadeddata', () => {
                try { 音效元素.play().catch(e => console.log('音效播放失败，可能需要用户交互:', e)); } catch (错误) { console.error('音效播放错误:', 错误); }
            });
            音效元素.addEventListener('error', (e) => { console.error('音效加载失败:', 音效路径, e); });
            音效元素.addEventListener('ended', () => {
                const 索引 = 全局音效.indexOf(音效元素);
                if (索引 !== -1) 全局音效.splice(索引, 1);
            });
            全局音效.push(音效元素);
            当前状态.音效.push(音效元素);
        }
    }
    
    if (节点.条件) {
        const 条件结果 = 解析条件表达式(节点.条件.表达式);
        const 跳转目标 = 条件结果 ? 节点.条件.真目标 : 节点.条件.假目标;
        if (typeof 跳转目标 === 'number') {
            当前状态.当前索引 = 跳转目标;
            继续剧情();
        } else if (typeof 跳转目标 === 'string') {
            当前状态.当前索引 = 当前状态.标签表[跳转目标] ?? 当前状态.当前索引 + 1;
            继续剧情();
        } else if (跳转目标?.章节) {
            切换章节(跳转目标.章节, 跳转目标.索引 || 0);
        } else {
            当前状态.当前索引++;
            继续剧情();
        }
        return;
    }
    
    if (节点.自动存档) 自动存档();
    if (节点.解锁CG) 解锁CG(节点.解锁CG.名称, 节点.解锁CG.路径);
    
    const 已有调查层 = document.getElementById('调查层');
    if (已有调查层) 已有调查层.remove();
    document.body.style.cursor = 'default';
    const 存档按钮 = document.getElementById('存档按钮');
    const 返回按钮 = document.getElementById('返回按钮');
    
    if (节点.调查) {
        const 调查设置 = 节点.调查;
        document.removeEventListener('click', 处理全局点击);
        if (存档按钮) 存档按钮.classList.add('隐藏');
        if (返回按钮) 返回按钮.classList.remove('隐藏');
        if (返回按钮) {
            返回按钮.onclick = (e) => {
                e.stopPropagation();
                const 当前调查层 = document.getElementById('调查层');
                if (当前调查层) 当前调查层.remove();
                document.body.style.cursor = 'default';
                if (存档按钮) 存档按钮.classList.remove('隐藏');
                if (返回按钮) 返回按钮.classList.add('隐藏');
                document.addEventListener('click', 处理全局点击);
                const 返回目标 = 节点.调查?.返回;
                if (返回目标 !== undefined) {
                    if (typeof 返回目标 === 'number') {
                        当前状态.当前索引 = 返回目标;
                        继续剧情();
                    } else if (typeof 返回目标 === 'string') {
                        当前状态.当前索引 = 当前状态.标签表[返回目标] ?? 当前状态.当前索引 + 1;
                        继续剧情();
                    } else if (返回目标?.章节) {
                        let 目标索引 = 返回目标.索引 || 0;
                        if (typeof 目标索引 === 'string') {
                            const 目标章节数据 = 章节库[返回目标.章节];
                            if (目标章节数据) {
                                const 标签表 = 建立标签表(目标章节数据);
                                目标索引 = 标签表[目标索引] ?? 0;
                            }
                        }
                        切换章节(返回目标.章节, 目标索引);
                    }
                }
            };
        }
        const 新调查层 = document.createElement('div');
        新调查层.id = '调查层';
        新调查层.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:101;pointer-events:auto';
        新调查层.addEventListener('click', (e) => { e.stopPropagation(); });
        document.body.appendChild(新调查层);
        if (调查设置.光标) document.body.style.cursor = 调查设置.光标;
        if (调查设置.区域) {
            调查设置.区域.forEach((区域) => {
                const 区域元素 = document.createElement('div');
                区域元素.style.cssText = `position:fixed;left:${区域.x}px;top:${区域.y}px;width:${区域.宽度}px;height:${区域.高度}px;pointer-events:auto;cursor:${调查设置.光标 || 'pointer'}`;
                if (区域.贴图) {
                    const 贴图 = document.createElement('img');
                    贴图.src = 区域.贴图;
                    贴图.style.cssText = 'width:100%;height:100%;object-fit:contain';
                    区域元素.appendChild(贴图);
                }
                区域元素.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const 当前调查层 = document.getElementById('调查层');
                    if (当前调查层) 当前调查层.remove();
                    document.body.style.cursor = 'default';
                    if (存档按钮) 存档按钮.classList.remove('隐藏');
                    if (返回按钮) 返回按钮.classList.add('隐藏');
                    document.addEventListener('click', 处理全局点击);
                    const 目标 = 区域.目标;
                    if (typeof 目标 === 'number') {
                        当前状态.当前索引 = 目标;
                        继续剧情();
                    } else if (typeof 目标 === 'string') {
                        当前状态.当前索引 = 当前状态.标签表[目标] ?? 当前状态.当前索引 + 1;
                        继续剧情();
                    } else if (目标?.章节) {
                        let 目标索引 = 目标.索引 || 0;
                        if (typeof 目标索引 === 'string') {
                            const 目标章节数据 = 章节库[目标.章节];
                            if (目标章节数据) {
                                const 标签表 = 建立标签表(目标章节数据);
                                目标索引 = 标签表[目标索引] ?? 0;
                            }
                        }
                        切换章节(目标.章节, 目标索引);
                    }
                });
                新调查层.appendChild(区域元素);
            });
        }
    } else {
        if (存档按钮) 存档按钮.classList.remove('隐藏');
        if (返回按钮) 返回按钮.classList.add('隐藏');
    }
    
    const 左边容器 = document.getElementById('左边头像容器');
    const 右边容器 = document.getElementById('右边头像容器');
    左边容器.classList.add('隐藏');
    右边容器.classList.add('隐藏');
    左边容器.innerHTML = '';
    右边容器.innerHTML = '';
    
    if (节点.头像) {
        let 节点头像 = typeof 节点.头像 === 'string' ? { 路径: 节点.头像, 位置: '左' } : 节点.头像;
        if (节点头像.路径) {
            let 头像路径 = 节点头像.路径;
            头像路径 = 头像路径.replace(/{([^}]+)}/g, (匹配, 变量名) => {
                const 变量路径 = 变量名.trim().split('.');
                let 值 = 当前状态.用户变量;
                try { 变量路径.forEach(段 => 值 = 值[段]); return 值 || ''; } catch { return ''; }
            });
            const 头像位置 = 节点头像.位置 || '左';
            const 目标容器 = 头像位置 === '左' ? 左边容器 : 右边容器;
            目标容器.classList.remove('隐藏');
            const 图片元素 = document.createElement('img');
            图片元素.src = 头像路径;
            目标容器.appendChild(图片元素);
            if (节点.动画?.头像) 应用动画(图片元素, 节点.动画.头像);
            else if (节点.动画?.头像容器) 应用动画(目标容器, 节点.动画.头像容器);
            当前状态.头像.显示 = true;
            当前状态.头像.路径 = 节点头像.路径;
            当前状态.头像.位置 = 头像位置;
        }
    } else if (节点.头像 === null) {
        当前状态.头像.显示 = false;
        当前状态.头像.路径 = "";
    }
    
    const 容器 = document.getElementById('对话框容器');
    if (容器) {
        const 有对话内容 = 节点.角色 || 节点.内容;
        const 有选项 = 节点.选项?.length > 0;
        const 有输入框 = 节点.输入;
        
        if (!有对话内容 && !有选项 && !有输入框) {
            容器.style.display = 'none';
            容器.style.animation = '';
        } else {
            容器.style.display = 'block';
            容器.style.animation = 'none';
            void 容器.offsetHeight;
            
            const 角色元素 = 容器.querySelector('.角色');
            const { 角色: 本地化角色 } = 获取本地化文本(节点);
            let 处理后的角色 = 本地化角色;
            处理后的角色 = 处理后的角色.replace(/{([^}]+)}/g, (匹配, 变量名) => {
                const 变量路径 = 变量名.trim().split('.');
                let 值 = 当前状态.用户变量;
                try { 变量路径.forEach(段 => { 值 = 值[段]; }); return 值 || '无名'; } catch { return '无效变量'; }
            });
            角色元素.innerHTML = 处理后的角色;
            角色元素.style.display = 处理后的角色 ? 'block' : 'none';
            if (typeof 应用角色样式 === 'function') 应用角色样式();
            if (节点.动画?.角色) 应用动画(角色元素, 节点.动画.角色);
            
            const 内容元素 = 容器.querySelector('.内容');
            const { 内容: 本地化内容 } = 获取本地化文本(节点);
            let 处理后的内容 = 本地化内容;
            处理后的内容 = 处理后的内容.replace(/{([^}]+)}/g, (匹配, 变量名) => {
                const 变量路径 = 变量名.trim().split('.');
                let 值 = 当前状态.用户变量;
                try { 变量路径.forEach(段 => { 值 = 值[段]; }); return 值 || '未知'; } catch { return '无效变量'; }
            });
            
            const 节点逐字配置 = 节点.逐字显示 || {};
            const 逐字启用 = 节点逐字配置.启用 !== undefined ? 节点逐字配置.启用 : 当前状态.逐字显示.启用;
            const 逐字速度 = 节点逐字配置.速度 !== undefined ? 节点逐字配置.速度 : 当前状态.逐字显示.速度;
            
            if (逐字启用 && 处理后的内容) {
                开始逐字显示(内容元素, 处理后的内容, 逐字速度, 节点);
            } else {
                内容元素.innerHTML = 处理后的内容;
                if (节点.动画?.内容) 应用动画(内容元素, 节点.动画.内容);
                else if (节点.动画?.内容文字) 应用动画(内容元素, 节点.动画.内容文字);
                if (!节点.选项?.length && !节点.输入) {
                    if (!节点.自动节点 || 节点.自动节点 <= 0) {
                        document.addEventListener('click', 处理全局点击);
                    }
                }
            }
            
            const 选项容器 = 容器.querySelector('.选项容器');
            选项容器.innerHTML = '';
            
            if (有选项) {
                const 已选记录 = JSON.parse(localStorage.getItem('已选选项记录') || '{}');
                节点.选项.forEach((选项, 索引) => {
                    const 选项按钮 = document.createElement('div');
                    选项按钮.className = '选项按钮';
                    let 选项文本 = '';
                    if (选项._翻译文本) {
                        选项文本 = 选项._翻译文本;
                    } else if (当前语言 !== 语言配置表.默认语言) {
                        const 选项字段 = `文本_${当前语言}`;
                        选项文本 = 选项[选项字段] || 选项[`文本_${语言配置表.默认语言}`] || 选项.文本 || '';
                    } else {
                        选项文本 = 选项.文本 || '';
                    }
                    选项文本 = 选项文本.replace(/{([^}]+)}/g, (匹配, 变量名) => {
                        const 变量路径 = 变量名.trim().split('.');
                        let 值 = 当前状态.用户变量;
                        try { 变量路径.forEach(段 => 值 = 值?.[段]); return 值 !== undefined && 值 !== null ? 值 : ''; } catch { return ''; }
                    });
                    选项按钮.textContent = 选项文本;
                    if (选项.样式) Object.assign(选项按钮.style, 选项.样式);
                    const 选项标识 = `${当前状态.当前章节}_${当前状态.当前索引}_${索引}`;
                    if (已选记录[选项标识]) 选项按钮.classList.add('已选');
                    选项按钮.addEventListener('click', function(e) {
                        e.stopPropagation();
                        e.preventDefault();
                        if (!已选记录[选项标识]) {
                            已选记录[选项标识] = { 时间: new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }), 章节: 当前状态.当前章节, 索引: 当前状态.当前索引, 选项文本: 选项.文本 };
                            localStorage.setItem('已选选项记录', JSON.stringify(已选记录));
                            this.classList.add('已选');
                        }
                        选项容器.querySelectorAll('.选项按钮').forEach(btn => { btn.removeEventListener('click', this); });
                        处理选项点击(选项);
                    });
                    选项容器.appendChild(选项按钮);
                });
                document.removeEventListener('click', 处理全局点击);
            }
            
            if (节点.动画?.对话框) {
                应用动画(容器, 节点.动画.对话框);
            } else {
                容器.style.animation = '对话框进入动画 0.3s ease forwards';
            }
        }
    }
    
    if (节点.输入) {
        document.removeEventListener('click', 处理全局点击);
        const 输入容器 = document.createElement('div');
        输入容器.className = '输入容器';
        if (节点.输入.提示文字) {
            const 提示元素 = document.createElement('div');
            提示元素.className = '输入提示文字';
            let 提示文本 = '';
            if (节点.输入._翻译提示文字) {
                提示文本 = 节点.输入._翻译提示文字;
            } else if (当前语言 !== 语言配置表.默认语言) {
                const 提示字段 = `提示文字_${当前语言}`;
                提示文本 = 节点.输入[提示字段] || 节点.输入[`提示文字_${语言配置表.默认语言}`] || 节点.输入.提示文字;
            } else {
                提示文本 = 节点.输入.提示文字;
            }
            提示元素.textContent = 提示文本;
            输入容器.appendChild(提示元素);
        }
        const 输入框 = document.createElement('input');
        输入框.className = '输入框';
        let 占位符文本 = '';
        if (节点.输入._翻译占位符) {
            占位符文本 = 节点.输入._翻译占位符;
        } else if (当前语言 !== 语言配置表.默认语言) {
            const 占位符字段 = `占位符_${当前语言}`;
            占位符文本 = 节点.输入[占位符字段] || 节点.输入[`占位符_${语言配置表.默认语言}`] || 节点.输入.占位符 || '请输入...';
        } else {
            占位符文本 = 节点.输入.占位符 || '请输入...';
        }
        输入框.placeholder = 占位符文本;
        输入框.maxLength = 节点.输入.最大长度 || 20;
        const 确认按钮 = document.createElement('div');
        确认按钮.className = '输入确认按钮';
        let 按钮文本 = '';
        if (节点.输入._翻译按钮文字) {
            按钮文本 = 节点.输入._翻译按钮文字;
        } else if (当前语言 !== 语言配置表.默认语言) {
            const 按钮字段 = `按钮文字_${当前语言}`;
            按钮文本 = 节点.输入[按钮字段] || 节点.输入[`按钮文字_${语言配置表.默认语言}`] || 节点.输入.按钮文字 || '确认';
        } else {
            按钮文本 = 节点.输入.按钮文字 || '确认';
        }
        确认按钮.textContent = 按钮文本;
        const 处理确认 = () => {
            const 输入值 = 输入框.value.trim();
            if (节点.输入.必填 && !输入值) {
                输入框.placeholder = "请输入内容！";
                输入框.style.borderColor = "#ff4444";
                return;
            }
            if (节点.输入.变量名) {
                const 变量路径 = 节点.输入.变量名.split('.');
                let 当前对象 = 当前状态.用户变量;
                变量路径.slice(0, -1).forEach(段 => {
                    if (!当前对象[段]) 当前对象[段] = {};
                    当前对象 = 当前对象[段];
                });
                当前对象[变量路径[变量路径.length - 1]] = 输入值;
                保存用户变量到本地存储();
            }
            输入容器.remove();
            const 目标 = 节点.输入.目标;
            if (typeof 目标 === 'number') {
                当前状态.当前索引 = 目标;
            } else if (typeof 目标 === 'string') {
                当前状态.当前索引 = 当前状态.标签表[目标] ?? 当前状态.当前索引 + 1;
            } else if (目标?.章节) {
                切换章节(目标.章节, 目标.索引 || 0);
                return;
            } else {
                当前状态.当前索引++;
            }
            document.addEventListener('click', 处理全局点击);
            继续剧情();
        };
        确认按钮.addEventListener('click', function(e) {
            e.stopPropagation();
            处理确认();
        });
        输入框.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.stopPropagation();
                处理确认();
            }
        });
        输入容器.appendChild(输入框);
        输入容器.appendChild(确认按钮);
        容器.querySelector('.选项容器').appendChild(输入容器);
    }
    
    const 背景容器元素 = document.getElementById('背景容器');
    if (节点.动画?.背景 && 背景容器元素) 应用动画(背景容器元素, 节点.动画.背景);
    if (节点.自定义功能) {
        try { eval(节点.自定义功能); } catch (e) { console.error('自定义功能错误:', e); }
    }
}

// ====================== 全局事件 ======================
function 处理全局点击(e) {
    if (e.target.closest && e.target.closest('#隐藏对话按钮')) {
        return;
    }
    if (隐藏模式激活) {
        切换对话框隐藏();
        return;
    }
    const 存档界面 = document.getElementById('存档界面');
    if (!存档界面) return;
    if (!存档界面.classList.contains('隐藏')) return;
    
    if (e.target.closest('.输入容器')) return;
    
    const 当前章节数据 = 章节库[当前状态.当前章节];
    if (!当前章节数据) return;
    if (当前状态.当前索引 >= 当前章节数据.length) return;
    
    const 当前节点 = 当前章节数据[当前状态.当前索引];
    if (!当前节点) return;
    
    if (当前节点.选项?.length > 0 || 当前节点.输入 || 当前节点.调查) {
        return;
    }
    
    const 正在打字 = document.querySelector('.内容')?.dataset.正在打字 === 'true';
    if (正在打字) {
        return;
    }
}
// ====================== 存档系统 ======================
function 生成存档快照() {
    return {
        时间: new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }),
        章节: 当前状态.当前章节,
        索引: 当前状态.当前索引,
        背景: 当前状态.背景,
        背景媒体: { ...当前状态.背景媒体 },
        标题: { ...当前状态.标题 },
        头像: { ...当前状态.头像 },
        立绘: {
            左立绘: { ...当前状态.左立绘, 媒体: { ...(当前状态.左立绘?.媒体 || {}) } },
            中立绘: { ...当前状态.中立绘, 媒体: { ...(当前状态.中立绘?.媒体 || {}) } },
            右立绘: { ...当前状态.右立绘, 媒体: { ...(当前状态.右立绘?.媒体 || {}) } }
        },
        音乐: 当前状态.音乐,
        自动节点: 当前状态.自动节点,
        逐字显示: { 启用: 当前状态.逐字显示.启用, 速度: 当前状态.逐字显示.速度 },
        用户变量: JSON.parse(JSON.stringify(当前状态.用户变量)),
        打字音效: { ...当前状态.打字音效 }
    };
}

function 恢复存档状态(存档, 是否完全重置 = false) {
    if (当前状态.自动节点定时器) {
        clearTimeout(当前状态.自动节点定时器);
        当前状态.自动节点定时器 = null;
    }
    停止打字效果();
    停止快进();
    当前状态.快进模式 = false;
    const 已有头像容器 = document.getElementById('对话框头像容器');
    if (已有头像容器) 已有头像容器.remove();
    const 已有调查层 = document.getElementById('调查层');
    if (已有调查层) 已有调查层.remove();
    document.body.style.cursor = 'default';
    const 存档按钮 = document.getElementById('存档按钮');
    const 返回按钮 = document.getElementById('返回按钮');
    if (存档按钮) 存档按钮.classList.remove('隐藏');
    if (返回按钮) 返回按钮.classList.add('隐藏');
    清除所有动画();
    
    const 初始 = 读取配置('初始状态');
    当前状态 = 是否完全重置 ? {
        ...JSON.parse(JSON.stringify(初始)),
        当前章节: 存档.章节 || '序章',
        当前索引: 存档.索引 || 0,
        背景: 存档.背景 || "#222",
        背景媒体: 存档.背景媒体 || { 循环: true, 播放次数: -1, 播放间隔: 0, 音量: 1 },
        用户变量: 存档.用户变量 || {},
        自动节点: 存档.自动节点 || 0,
        逐字显示: { ...初始.逐字显示, ...(存档.逐字显示 || {}) },
        打字音效: { ...初始.打字音效, ...(存档.打字音效 || {}) }
    } : {
        ...当前状态,
        当前章节: 存档.章节,
        当前索引: 存档.索引,
        背景: 存档.背景 || 当前状态.背景,
        背景媒体: 存档.背景媒体 || { 循环: true, 播放次数: -1, 播放间隔: 0, 音量: 1 },
        音乐: 存档.音乐 || 当前状态.音乐,
        用户变量: 存档.用户变量 || {},
        自动节点: 存档.自动节点 || 0,
        逐字显示: { ...当前状态.逐字显示, ...(存档.逐字显示 || {}) },
        打字音效: { ...当前状态.打字音效, ...(存档.打字音效 || {}) }
    };
    
    document.body.style.background = 当前状态.背景 || "#222";
    
    if (存档.标题) {
        const 标题容器 = document.getElementById('标题容器');
        if (存档.标题.显示) {
            标题容器.textContent = 存档.标题.内容 || '';
            const 位置类列表 = ['标题位置-上', '标题位置-下', '标题位置-左', '标题位置-右',
                '标题位置-左上', '标题位置-左下', '标题位置-右上', '标题位置-右下', '标题位置-中'
            ];
            位置类列表.forEach(类名 => 标题容器.classList.remove(类名));
            标题容器.classList.add(`标题位置-${存档.标题.位置 || '中'}`);
            if (存档.标题.样式) {
                Object.entries(存档.标题.样式).forEach(([属性, 值]) => { 标题容器.style[属性] = 值; });
            }
            标题容器.classList.remove('隐藏');
            标题容器.classList.add('标题进入');
            当前状态.标题 = { 显示: true, 内容: 存档.标题.内容, 位置: 存档.标题.位置, 样式: 存档.标题.样式 };
        }
    }
    
    ['左立绘', '中立绘', '右立绘'].forEach(位置 => {
        const 元素 = document.getElementById(位置);
        const 存档数据 = 存档.立绘?.[位置] || { 显示: false, 路径: "", 媒体: { 循环: true, 播放次数: -1, 播放间隔: 0, 音量: 1 } };
        当前状态[位置] = { ...存档数据, 媒体: 存档数据.媒体 || { 循环: true, 播放次数: -1, 播放间隔: 0, 音量: 1 } };
        if (元素) {
            元素.src = 存档数据.路径 || "";
            元素.style.opacity = 存档数据.显示 ? 1 : 0;
        }
    });
    
    if (存档.头像 && 存档.头像.显示 && 存档.头像.路径) {
        当前状态.头像 = { 显示: 存档.头像.显示, 路径: 存档.头像.路径, 位置: 存档.头像.位置 || "左" };
        const 左边容器 = document.getElementById('左边头像容器');
        const 右边容器 = document.getElementById('右边头像容器');
        左边容器.classList.add('隐藏');
        右边容器.classList.add('隐藏');
        左边容器.innerHTML = '';
        右边容器.innerHTML = '';
        const 目标容器 = 当前状态.头像.位置 === '左' ? 左边容器 : 右边容器;
        目标容器.classList.remove('隐藏');
        const 图片元素 = document.createElement('img');
        图片元素.src = 当前状态.头像.路径;
        目标容器.appendChild(图片元素);
    }
    
    const 播放器 = document.getElementById('背景音乐');
    if (当前状态.音乐) {
        播放器.src = 当前状态.音乐;
        播放器.volume = 1;
    } else {
        播放器.pause();
        播放器.currentTime = 0;
        播放器.removeAttribute('src');
    }
    当前状态.标签表 = 建立标签表(章节库[当前状态.当前章节]);
    const 当前章节数据 = 章节库[当前状态.当前章节];
    const 当前节点 = 当前章节数据?.[当前状态.当前索引];
    if (当前节点 && 当前节点.读档时设置变量) {
        Object.entries(当前节点.读档时设置变量).forEach(([变量路径, 值]) => {
            const 路径数组 = 变量路径.split('.');
            let 当前对象 = 当前状态.用户变量;
            路径数组.slice(0, -1).forEach(段 => {
                if (!当前对象[段]) 当前对象[段] = {};
                当前对象 = 当前对象[段];
            });
            const 最后字段 = 路径数组[路径数组.length - 1];
            if (typeof 值 === 'string') {
                const 操作符匹配 = 值.match(/^(\+|\-|\*|\/)=(-?\d+\.?\d*)/);
                if (操作符匹配) {
                    const [_, 操作符, 数字] = 操作符匹配;
                    const 当前值 = parseFloat(当前对象[最后字段] || 0);
                    const 数值 = parseFloat(数字);
                    switch (操作符) {
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
                    return;
                }
            }
            当前对象[最后字段] = 值;
        });
        保存用户变量到本地存储();
    }
    return 当前状态;
}

function 保存存档(存档位) {
    const 最大位 = 读取配置('最大存档位', 2);
    if (存档位 < 1 || 存档位 > 最大位) return;
    显示提示(`${获取界面文字('已保存') || '已保存'} ${存档位}`);
    const 存档数据 = 生成存档快照();
    localStorage.setItem(`手动存档_${存档位}`, JSON.stringify(存档数据));
    更新存档显示(存档位);
}

function 更新存档显示(存档位) {
    const 是自动存档 = 存档位 === 'auto';
    const 存档键名 = 是自动存档 ? '自动存档' : `手动存档_${存档位}`;
    const 存档项 = document.querySelector(`.存档项[data-slot="${存档位}"]`);
    if (!存档项) return;
    const 数据 = localStorage.getItem(存档键名);
    if (数据) {
        const 存档数据 = JSON.parse(数据);
        const 时间显示 = 存档数据.时间 || '未知时间';
        const 章节显示 = 存档数据.章节 || '未知章节';
        const 前缀 = 是自动存档 ? 获取界面文字('自动') + '·' : '';
        存档项.innerHTML = `<span>${前缀}${章节显示}·${时间显示}</span><button class="加载按钮">${获取界面文字('加载')}</button>`;
    } else {
        const 空文字 = 是自动存档 ? 获取界面文字('自动') + '·' + 获取界面文字('空') : 获取界面文字('空');
        存档项.innerHTML = `<span>${空文字}</span>`;
    }
    const 加载按钮 = 存档项.querySelector('.加载按钮');
    if (加载按钮) {
        加载按钮.addEventListener('click', (e) => {
            e.stopPropagation();
            加载存档(存档位);
        });
    }
    if (是自动存档) {
        存档项.classList.add('自动存档项');
    } else {
        存档项.classList.remove('自动存档项');
    }
}

function 更新所有存档项显示文字() {
    更新存档显示('auto');
    const 最大位 = 读取配置('最大存档位', 2);
    for (let i = 1; i <= 最大位; i++) {
        更新存档显示(i);
    }
}

function 加载存档(存档位) {
    const 存档键名 = 存档位 === 'auto' ? '自动存档' : `手动存档_${存档位}`;
    const 数据 = localStorage.getItem(存档键名);
    if (!数据) return;
    try {
        const 存档 = JSON.parse(数据);
        恢复存档状态(存档);
        const 播放器 = document.getElementById('背景音乐');
        if (当前状态.音乐) {
            播放器.play().catch(() => console.log('等待用户交互后自动播放'));
        }
        const 当前章节数据 = 章节库[当前状态.当前章节];
        if (当前章节数据 && 当前状态.当前索引 < 当前章节数据.length) {
            更新场景(当前章节数据[当前状态.当前索引]);
        }
        const 存档界面 = document.getElementById('存档界面');
        if (存档界面 && !存档界面.classList.contains('隐藏')) {
            关闭存档界面();
        }
        显示提示(获取界面文字('加载成功') || '加载成功');
    } catch (错误) {
        console.error('存档加载失败:', 错误);
        显示提示('存档加载失败');
    }
}

function 加载自动存档() { 加载存档('auto'); }

function 加载指定存档(存档标识) {
    const 是自动存档 = 存档标识 === 'auto';
    const 存档键名 = 是自动存档 ? '自动存档' : `手动存档_${存档标识}`;
    const 存档数据 = localStorage.getItem(存档键名);
    if (!存档数据) {
        alert(是自动存档 ? '未找到自动存档' : `存档位${存档标识}为空`);
        切换章节('序章', 0);
        return;
    }
    try {
        const 存档 = JSON.parse(存档数据);
        恢复存档状态(存档, true);
        const 播放器 = document.getElementById('背景音乐');
        if (存档.音乐) {
            播放器.play().catch(() => console.log('等待用户交互'));
        }
        const 当前章节数据 = 章节库[当前状态.当前章节];
        if (当前章节数据 && 当前状态.当前索引 < 当前章节数据.length) {
            更新场景(当前章节数据[当前状态.当前索引]);
        }
        显示提示(`${是自动存档 ? '自动' : '手动'}存档加载成功`);
    } catch (错误) {
        console.error("存档加载失败:", 错误);
        alert("存档损坏！");
        切换章节('序章', 0);
    }
}

function 打开存档界面(e) {
    e?.stopPropagation();
    停止快进();
    更新所有存档项显示文字();
    const 存档界面 = document.getElementById('存档界面');
    存档界面.classList.remove('隐藏');
}

function 关闭存档界面() {
    document.getElementById('存档界面').classList.add('隐藏');
}

// ====================== 引擎初始化 ======================
async function 初始化引擎() {
    await 等待配置加载();
    
    const 存储键名 = 读取配置('存储键名');
    const 初始状态配置 = 读取配置('初始状态');
    const 语言配置数据 = 读取配置('语言配置');
    
    // 从这里开始直接处理语言
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
    
    if (章节库.序章?.length) {
        切换章节('序章', 0);
    }
}
// 自动初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        初始化引擎().catch(e => console.error('引擎初始化失败:', e));
    });
} else {
    初始化引擎().catch(e => console.error('引擎初始化失败:', e));
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