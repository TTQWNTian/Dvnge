/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025-2026 Tian
 */
'use strict';

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
                    setTimeout(() => {
                        视频元素.play();
                    }, 播放间隔);
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
    内容元素.dataset.完整内容 = 完整文本;

    let 打字音效对象 = null;
    if (当前状态.打字音效 && 当前状态.打字音效.启用 && 当前状态.打字音效.路径) {
        try {
            const 现有音效 = 当前状态.打字音效.当前音效对象;
            if (现有音效 && 现有音效.src && 现有音效.src.includes(当前状态.打字音效.路径)) {
                打字音效对象 = 现有音效;
                打字音效对象.currentTime = 0;
            } else {
                打字音效对象 = new Audio(当前状态.打字音效.路径);
                打字音效对象.volume = Math.min(1, Math.max(0, 当前状态.打字音效.音量 || 0.5));
                打字音效对象.load();
                当前状态.打字音效.当前音效对象 = 打字音效对象;
            }
        } catch (e) {
            打字音效对象 = null;
            当前状态.打字音效.当前音效对象 = null;
        }
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
                显示结构.push({
                    类型: '字符',
                    内容: 字符,
                    父标签: 父标签
                });
            }
        } else if (节点.nodeType === Node.ELEMENT_NODE) {
            const 标签名 = 节点.tagName.toLowerCase();
            const 自闭合标签 = ['br', 'hr', 'img', 'input', 'meta', 'link'];
            if (自闭合标签.includes(标签名)) {
                显示结构.push({
                    类型: '标签',
                    内容: 节点.outerHTML,
                    父标签: 父标签
                });
            } else {
                显示结构.push({
                    类型: '开始标签',
                    内容: `<${标签名}${获取属性字符串(节点)}>`,
                    父标签: 父标签
                });
                for (const 子节点 of 节点.childNodes) {
                    构建显示结构(子节点, 标签名);
                }
                显示结构.push({
                    类型: '结束标签',
                    内容: `</${标签名}>`,
                    父标签: 父标签
                });
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
    const 音效启用 = !!(当前状态.打字音效 && 当前状态.打字音效.启用 && 打字音效对象);
    const 音效间隔 = 当前状态.打字音效.间隔字符数;

    const 打字函数 = () => {
        if (当前索引 >= 显示结构.length) {
            内容元素.innerHTML = 完整文本;
            内容元素.dataset.正在打字 = 'false';
            delete 内容元素.dataset.完整内容;
            if (当前状态.逐字显示) {
                当前状态.逐字显示.打字已完成 = true;
            }
            if (打字音效对象) {
                try {
                    打字音效对象.pause();
                    打字音效对象.currentTime = 0;
                } catch (e) {}
            }
            if (当前状态.逐字显示 && 当前状态.逐字显示.打字定时器) {
                clearTimeout(当前状态.逐字显示.打字定时器);
                当前状态.逐字显示.打字定时器 = null;
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
                if (音效启用 && (字符计数 - 1) % 音效间隔 === 0) {
                    try {
                        打字音效对象.pause();
                        打字音效对象.currentTime = 0;
                        打字音效对象.play().catch(() => {});
                    } catch (e) {}
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
    if (当前状态.自动节点 > 0) {
        return;
    }
    if (当前状态.逐字显示 && 当前状态.逐字显示.打字定时器) {
        clearTimeout(当前状态.逐字显示.打字定时器);
        当前状态.逐字显示.打字定时器 = null;
    }
    if (当前状态.逐字显示) {
        当前状态.逐字显示.打字已完成 = true;
    }
    if (当前状态.打字音效 && 当前状态.打字音效.当前音效对象) {
        try {
            const 音效 = 当前状态.打字音效.当前音效对象;
            if (音效 && typeof 音效.pause === 'function') {
                音效.pause();
                音效.currentTime = 0;
            }
        } catch (e) {}
    }
    const 内容元素 = document.querySelector(".内容");
    if (内容元素 && 内容元素.dataset.正在打字 === "true") {
        const 完整内容 = 内容元素.dataset.完整内容 || "";
        内容元素.innerHTML = 完整内容;
        内容元素.dataset.正在打字 = "false";
        delete 内容元素.dataset.完整内容;
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
    更新场景(当前节点);
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
        } catch (错误) {
            console.error('停止音效时出错:', 错误);
        }
    });
    当前状态.音效 = [];
}

// ====================== 条件解析 ======================
function 解析条件表达式(表达式) {
    if (!表达式) return true;

    try {
        return new Function("vars", "getVar", "Math", `
      try {
        return ${表达式};
      } catch {
        return false;
      }
    `)(当前状态.用户变量, 获取变量路径, Math);
    } catch (e) {
        console.error("条件解析错误:", e, "表达式:", 表达式);
        return false;
    }
}

function 获取变量路径(路径) {
    return 路径.split(".").reduce((obj, key) => obj?.[key], 当前状态.用户变量);
}

// ====================== 选项处理 ======================
function 处理选项点击(选项) {
    停止快进();
    let 条件满足 = true;
    if (选项.条件) {
        条件满足 = 解析条件表达式(选项.条件);
    }

    if (条件满足 && 选项.设置变量) {
        Object.entries(选项.设置变量).forEach(([变量路径, 值]) => {
            应用变量设置(变量路径, 值);
        });
    }
    if (条件满足 && 选项.解锁CG) {
        解锁CG(选项.解锁CG.名称, 选项.解锁CG.路径);
    }
    const 跳转目标 = 条件满足 ? 选项.目标 : 选项.否则目标;
    处理跳转(跳转目标);
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
    更新场景(当前节点);
}