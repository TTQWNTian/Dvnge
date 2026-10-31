/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025-2026 Tian
 */
'use strict';

// ====================== NVL 文本 ======================
function 获取NVL内容容器() {
    return document.getElementById('NVL文本内容') || document.getElementById('NVL文本容器');
}

function 获取NVL可用页高() {
    const 容器 = document.getElementById('NVL文本容器');
    if (!容器) return 0;
    return 容器.clientHeight;
}

function 获取NVL页面列表() {
    return Array.from(document.querySelectorAll('#NVL文本内容 .NVL页面'));
}

function NVL存在下一页() {
    const 页面 = 获取NVL页面列表();
    const 页码 = Math.max(0, Number(当前状态?.NVL页码) || 0);
    return 页码 < 页面.length - 1;
}

function 更新NVL下一页按钮() {
    const 按钮 = document.getElementById('NVL下一页按钮');
    const 页面 = 获取NVL页面列表();
    if (!按钮) return;
    const 页码 = Math.max(0, Number(当前状态?.NVL页码) || 0);
    页面.forEach((页, 索引) => {
        页.hidden = 索引 !== 页码;
    });
    const 有下一页 = 页码 < 页面.length - 1;
    按钮.classList.toggle('隐藏', !有下一页);
    按钮.disabled = !有下一页;
    按钮.setAttribute('aria-hidden', 有下一页 ? 'false' : 'true');
}

function 翻到NVL下一页() {
    if (!NVL存在下一页()) {
        更新NVL下一页按钮();
        return;
    }
    当前状态.NVL页码 = Math.max(0, Number(当前状态.NVL页码) || 0) + 1;
    更新NVL下一页按钮();
}

function 拆分NVL超长段落(段落, 页面) {
    const 内容元素 = 段落.querySelector('.NVL内容');
    if (!内容元素) return [段落];
    const 文本 = 内容元素.textContent || '';
    if (!文本) return [段落];
    const 字符 = Array.from(文本);
    const 片段列表 = [];
    let 起点 = 0;
    const 测量段落 = 段落.cloneNode(true);
    const 测量内容 = 测量段落.querySelector('.NVL内容');
    测量段落.style.marginBottom = getComputedStyle(段落).marginBottom;
    while (起点 < 字符.length) {
        let 左 = 起点 + 1;
        let 右 = 字符.length;
        let 最佳 = 起点 + 1;
        while (左 <= 右) {
            const 中 = Math.floor((左 + 右) / 2);
            测量内容.textContent = 字符.slice(起点, 中).join('');
            页面.appendChild(测量段落);
            const 合适 = 页面.scrollHeight <= 页面.clientHeight + 1;
            页面.removeChild(测量段落);
            if (合适) {
                最佳 = 中;
                左 = 中 + 1;
            } else {
                右 = 中 - 1;
            }
        }
        if (最佳 <= 起点) break;
        const 新段落 = 段落.cloneNode(true);
        新段落.querySelector('.NVL内容').textContent = 字符.slice(起点, 最佳).join('');
        if (起点 > 0) 新段落.querySelector('.NVL角色')?.remove();
        片段列表.push(新段落);
        起点 = 最佳;
    }
    return 片段列表.length ? 片段列表 : [段落];
}

function 重建NVL页面() {
    const 内容容器 = 获取NVL内容容器();
    if (!内容容器) return;
    const 原页码 = Math.max(0, Number(当前状态?.NVL页码) || 0);
    const 原页面 = Array.from(内容容器.children).filter(元素 => 元素.classList.contains('NVL页面'));
    const 原内容 = 原页面.length
        ? 原页面.flatMap(页 => Array.from(页.children))
        : Array.from(内容容器.children);
    内容容器.innerHTML = '';
    const 创建页面 = () => {
        const 页面 = document.createElement('div');
        页面.className = 'NVL页面';
        内容容器.appendChild(页面);
        return 页面;
    };
    let 页面 = 创建页面();
    原内容.forEach(元素 => {
        页面.appendChild(元素);
        if (页面.scrollHeight <= 页面.clientHeight + 1) return;
        页面.removeChild(元素);
        if (页面.children.length) 页面 = 创建页面();
        页面.appendChild(元素);
        if (页面.scrollHeight <= 页面.clientHeight + 1) return;
        页面.removeChild(元素);
        const 分段 = 拆分NVL超长段落(元素, 页面);
        分段.forEach((片段, 索引) => {
            if (索引 > 0) 页面 = 创建页面();
            页面.appendChild(片段);
            if (页面.scrollHeight > 页面.clientHeight + 1 && 页面.children.length > 1) {
                页面.removeChild(片段);
                页面 = 创建页面();
                页面.appendChild(片段);
            }
        });
    });
    const 页面列表 = 获取NVL页面列表();
    当前状态.NVL页码 = Math.min(原页码, Math.max(0, 页面列表.length - 1));
    更新NVL下一页按钮();
}

function 初始化NVL分页() {
    const 容器 = document.getElementById('NVL文本容器');
    const 按钮 = document.getElementById('NVL下一页按钮');
    if (!容器 || !按钮) return;
    if (!容器.dataset.nvl分页已绑定) {
        容器.dataset.nvl分页已绑定 = 'true';
        window.addEventListener('resize', () => requestAnimationFrame(重建NVL页面));
    }
    if (!按钮.dataset.nvl事件已绑定) {
        按钮.dataset.nvl事件已绑定 = 'true';
        按钮.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            翻到NVL下一页();
        });
    }
    更新NVL下一页按钮();
}

function 添加NVL交互记录(类型, 角色, 内容) {
    if (!当前状态 || 当前状态.显示模式 !== 'NVL') return;
    if (!Array.isArray(当前状态.NVL文本)) 当前状态.NVL文本 = [];

    const 键 = `${当前状态.当前章节}:${当前状态.当前索引}:${类型}`;
    const 记录 = {
        键,
        类型,
        角色: 角色 || '',
        内容: 内容 || '',
        章节: 当前状态.当前章节,
        索引: 当前状态.当前索引
    };
    const 已有索引 = 当前状态.NVL文本.findIndex(项 => 项.键 === 键);
    if (已有索引 >= 0) 当前状态.NVL文本[已有索引] = 记录;
    else 当前状态.NVL文本.push(记录);
}

function 同步NVL文本(当前节点) {
    const 容器 = document.getElementById('NVL文本容器');
    const 内容容器 = 获取NVL内容容器();
    if (!容器 || !内容容器 || !当前状态 || 当前状态.显示模式 !== 'NVL') {
        if (容器) 容器.classList.add('隐藏');
        const 下一页按钮 = document.getElementById('NVL下一页按钮');
        if (下一页按钮) 下一页按钮.classList.add('隐藏');
        return;
    }
    容器.classList.remove('隐藏');
    if (!Array.isArray(当前状态.NVL文本)) 当前状态.NVL文本 = [];

    const { 角色: 原始角色, 内容: 原始内容 } = 获取本地化文本(当前节点);
    const 角色 = 替换变量(原始角色 || '', '');
    const 内容 = 替换变量(原始内容 || '', '未知');
    const 有文本 = Boolean(角色 || 内容);
    const 键 = `${当前状态.当前章节}:${当前状态.当前索引}`;

    try {
        const 存储键名 = 读取配置('存储键名');
        const 已选记录 = JSON.parse(localStorage.getItem(存储键名.已选选项) || '{}');
        Object.entries(已选记录)
            .filter(([标识, 记录]) => 标识.startsWith(`${当前状态.当前章节}_`) && 记录?.章节 === 当前状态.当前章节)
            .sort((a, b) => Number(a[1].索引) - Number(b[1].索引))
            .forEach(([标识, 记录]) => {
                const 选项键 = `${当前状态.当前章节}:${记录.索引}:选择`;
                if (!当前状态.NVL文本.some(项 => 项.键 === 选项键)) {
                    当前状态.NVL文本.push({
                        键: 选项键,
                        类型: '选择',
                        角色: '',
                        内容: 记录.选项文本 || '',
                        章节: 当前状态.当前章节,
                        索引: 记录.索引
                    });
                }
            });
        当前状态.NVL文本.sort((a, b) => Number(a.索引) - Number(b.索引));
    } catch (e) {
        console.error('NVL选项记录恢复失败:', e);
    }

    if (有文本) {
        const 记录 = {
            键,
            角色,
            内容,
            章节: 当前状态.当前章节,
            索引: 当前状态.当前索引
        };
        const 已有索引 = 当前状态.NVL文本.findIndex(项 => 项.键 === 键);
        if (已有索引 >= 0) 当前状态.NVL文本[已有索引] = 记录;
        else 当前状态.NVL文本.push(记录);
    }

    if (当前状态.NVL文本.length > 80) 当前状态.NVL文本.splice(0, 当前状态.NVL文本.length - 80);
    const 原页码 = Math.max(0, Number(当前状态.NVL页码) || 0);
    内容容器.innerHTML = ''; 

    当前状态.NVL文本.forEach((记录, 索引) => {
        const 段落 = document.createElement('section');
        段落.className = 'NVL段落';
        段落.dataset.nvlKey = 记录.键 || '';
        if (记录.类型 === '选择') 段落.classList.add('NVL选择记录');
        if (记录.类型 === '输入') 段落.classList.add('NVL输入记录');

        if (记录.角色) {
            const 角色元素 = document.createElement('div');
            角色元素.className = 'NVL角色';
            if (记录.类型) 角色元素.textContent = 记录.角色;
            else 角色元素.innerHTML = 记录.角色;
            段落.appendChild(角色元素);
        }
        const 内容元素 = document.createElement('div');
        内容元素.className = 'NVL内容';
        段落.appendChild(内容元素);
        内容容器.appendChild(段落);

        if (记录.类型) {
            内容元素.textContent = 记录.内容 || '';
            内容元素.dataset.正在打字 = 'false';
            return;
        }

        const 是当前段落 = 索引 === 当前状态.NVL文本.length - 1 &&
            记录.键 === 键 && 有文本;
        if (是当前段落) {
            const 节点逐字配置 = 当前节点.逐字显示 || {};
            const 启用逐字 = 节点逐字配置.启用 !== undefined ?
                节点逐字配置.启用 : 当前状态.逐字显示?.启用;
            const 初始速度 = 读取配置('初始状态').逐字显示.速度;
            const 速度 = 节点逐字配置.速度 !== undefined ? 节点逐字配置.速度 : 初始速度;
            if (启用逐字 && 记录.内容) {
                开始逐字显示(内容元素, 记录.内容, 速度, 当前节点);
            } else {
                内容元素.innerHTML = 记录.内容;
                内容元素.dataset.正在打字 = 'false';
            }
        } else {
            内容元素.innerHTML = 记录.内容 || '';
            内容元素.dataset.正在打字 = 'false';
        }
    });

    当前状态.NVL页码 = 原页码;
    requestAnimationFrame(重建NVL页面);
}

function 更新场景(当前节点) {
    节点 = 当前节点;
    if (!节点) return;

    const 原对话框 = document.getElementById('对话框容器');
    const 原选项容器 = 原对话框?.querySelector('.选项容器') || document.querySelector('#NVL文本容器 .选项容器');
    if (原对话框 && 原选项容器 && 原选项容器.parentElement !== 原对话框) {
        原选项容器.classList.remove('NVL选项容器');
        原选项容器.style.display = '';
        原选项容器.style.visibility = '';
        原选项容器.style.opacity = '';
        原选项容器.style.pointerEvents = '';
        原对话框.appendChild(原选项容器);
    }

    const 执行前快照 = 生成存档快照();

    if (!当前状态.显示模式) 当前状态.显示模式 = 'ADV';
    if (!Array.isArray(当前状态.NVL文本)) 当前状态.NVL文本 = [];
    if (节点.显示模式) {
        const 新模式 = String(节点.显示模式).toUpperCase() === 'NVL' ? 'NVL' : 'ADV';
        if (新模式 !== 当前状态.显示模式) {
            当前状态.NVL文本 = [];
            当前状态.NVL滚动位置 = 0;
            当前状态.NVL页码 = 0;
            const NVL内容容器 = 获取NVL内容容器();
            if (NVL内容容器) NVL内容容器.innerHTML = '';
        }
        当前状态.显示模式 = 新模式;
    }
    const 游戏视口 = document.getElementById('游戏视口');
    const NVL容器状态 = document.getElementById('NVL文本容器');
    if (游戏视口) {
        游戏视口.classList.toggle('NVL模式', 当前状态.显示模式 === 'NVL');
        游戏视口.classList.remove('NVL交互中');
    }
    if (NVL容器状态) NVL容器状态.classList.toggle('隐藏', 当前状态.显示模式 !== 'NVL');
    if (当前状态.显示模式 !== 'NVL') {
        const NVL下一页按钮 = document.getElementById('NVL下一页按钮');
        if (NVL下一页按钮) NVL下一页按钮.classList.add('隐藏');
    }

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
        处理跳转(节点.目标);
        return;
    }

    if (节点.自动节点 && 节点.自动节点 > 0) {
        当前状态.自动节点 = 节点.自动节点;
        当前状态.自动节点定时器 = setTimeout(() => {
            当前状态.自动节点 = 0;
            当前状态.当前索引++;
            继续剧情();
        }, 节点.自动节点 * 1000);
    } else {
        当前状态.自动节点 = 0;
    }


    if (节点.设置变量) {
        Object.entries(节点.设置变量).forEach(([变量路径, 值]) => {
            应用变量设置(变量路径, 值);
        });
    }

    if (节点.打字音效 !== undefined) {
        const 打字音效设置 = 节点.打字音效;
        if (打字音效设置 === null) {
            当前状态.打字音效 = {
                启用: false,
                路径: "",
                音量: 0.5,
                间隔字符数: 1,
                当前音效对象: null
            };
        } else {
            let 音效路径 = 打字音效设置.路径 || 当前状态.打字音效.路径;
            if (音效路径) {
                音效路径 = 音效路径.replace(/{([^}]+)}/g, (匹配, 变量名) => {
                    const 变量路径 = 变量名.trim().split('.');
                    let 值 = 当前状态.用户变量;
                    try {
                        变量路径.forEach(段 => 值 = 值[段]);
                        return 值 || '';
                    } catch {
                        return '';
                    }
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
            背景值 = 替换变量(背景值, '');
            if (节点.背景媒体) {
                当前状态.背景媒体 = {
                    ...当前状态.背景媒体,
                    ...节点.背景媒体
                };
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

                视频元素.volume = 目标音量;
                视频元素.muted = (目标音量 === 0);

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
                const 本次背景token = ++背景切换token;
                setTimeout(() => {
                    if (本次背景token !== 背景切换token) return;
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
            标题内容 = 替换变量(标题内容, '');
            const 位置 = 标题设置.位置 || '中';
            let 类名列表 = ['标题容器', `标题位置-${位置}`];
            if (标题设置.样式 && typeof 标题设置.样式 === 'string') {
                类名列表.push(标题设置.样式);
            }
            标题容器.className = 类名列表.join(' ');

            标题容器.style.cssText = '';
            if (标题设置.样式 && typeof 标题设置.样式 === 'object') {
                Object.assign(标题容器.style, 标题设置.样式);
            }

            标题容器.textContent = 标题内容;
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
            解析路径 = 替换变量(解析路径, '');
            const 配置立绘 = 读取配置('初始状态')[位置] || {};
            const 淡入时间 = 节点立绘.淡入 !== undefined ? 节点立绘.淡入 : 配置立绘.淡入;
            const 视频扩展名 = ['mp4', 'webm', 'ogg', 'mov'];
            const 文件扩展名 = 解析路径.split('.').pop().toLowerCase();
            if (视频扩展名.includes(文件扩展名)) {
                if (元素.tagName !== 'VIDEO') {
                    const 视频元素 = document.createElement('video');
                    视频元素.id = 位置;
                    视频元素.className = 元素.className;
                    视频元素.style.cssText = 元素.style.cssText;
                    视频元素.poster = '你的视频封面图片.png';
                    const 目标音量 = 当前状态[位置].媒体.音量 !== undefined ? 当前状态[位置].媒体.音量 : 1;
                    视频元素.dataset.目标音量 = 目标音量;
                    视频元素.volume = 目标音量;
                    视频元素.muted = (目标音量 === 0);
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
            if (淡入时间 !== undefined && 淡入时间 > 0) {
                元素.style.opacity = 0;
                元素.style.transition = `opacity ${淡入时间}ms ease`;
                requestAnimationFrame(() => {
                    元素.style.opacity = 1;
                });
            } else {
                元素.style.opacity = 1;
            }
            当前状态[位置].显示 = true;
            当前状态[位置].路径 = 节点立绘.路径;
        } else if (节点立绘.隐藏) {
            元素.style.opacity = 0;
            当前状态[位置] = {
                ...当前状态[位置],
                显示: false,
                路径: ""
            };
        }
    });

    if (节点.动画?.左立绘) 应用动画(document.getElementById('左立绘'), 节点.动画.左立绘);
    if (节点.动画?.中立绘) 应用动画(document.getElementById('中立绘'), 节点.动画.中立绘);
    if (节点.动画?.右立绘) 应用动画(document.getElementById('右立绘'), 节点.动画.右立绘);

    const 音乐播放器 = document.getElementById('背景音乐');
    if (节点.hasOwnProperty('音乐')) {
        let 音乐路径 = typeof 节点.音乐 === "string" ? 节点.音乐 : (节点.音乐?.路径 || "");
        if (typeof 音乐路径 === 'string') {
            音乐路径 = 音乐路径.replace(/{([^}]+)}/g, (匹配, 变量名) => {
                const 变量路径 = 变量名.trim().split('.');
                let 值 = 当前状态.用户变量;
                try {
                    变量路径.forEach(段 => {
                        值 = 值?.[段];
                    });
                    return 值 || '';
                } catch {
                    return '[无效路径]';
                }
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
        音效路径 = 替换变量(音效路径, '');
        if (音效路径) {
            const 音效元素 = new Audio(音效路径);
            音效元素.addEventListener('loadeddata', () => {
                try {
                    音效元素.play().catch(e => console.log('音效播放失败，可能需要用户交互:', e));
                } catch (错误) {
                    console.error('音效播放错误:', 错误);
                }
            });
            音效元素.addEventListener('error', (e) => {
                console.error('音效加载失败:', 音效路径, e);
            });
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
        处理跳转(跳转目标);
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
                处理跳转(节点.调查?.返回);
            };
        }
        const 新调查层 = document.createElement('div');
        新调查层.id = '调查层';
        新调查层.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:101;pointer-events:auto';
        新调查层.addEventListener('click', (e) => {
            e.stopPropagation();
        });
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
                    处理跳转(区域.目标);
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
        let 节点头像 = typeof 节点.头像 === 'string' ? {
            路径: 节点.头像,
            位置: '左'
        } : 节点.头像;
        if (节点头像.路径) {
            let 头像路径 = 节点头像.路径;
            头像路径 = 替换变量(头像路径, '');
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

    同步NVL文本(节点);

    const 容器 = document.getElementById('对话框容器');
    if (容器) {
        const 有对话内容 = 当前状态.显示模式 !== 'NVL' && (节点.角色 || 节点.内容);
        const 有选项 = 节点.选项?.length > 0;
        const 有输入框 = 节点.输入;
        const NVL需要交互面板 = 当前状态.显示模式 === 'NVL' && (有选项 || 有输入框);
        if (游戏视口) 游戏视口.classList.toggle('NVL交互中', Boolean(NVL需要交互面板));

        if (!有对话内容 && !有选项 && !有输入框) {
            容器.style.display = 'none';
            容器.style.animation = '';
        } else {
            容器.style.display = 'block';
            容器.style.animation = 'none';
            void 容器.offsetHeight;

            const 角色元素 = 容器.querySelector('.角色');
            const {
                角色: 本地化角色
            } = 获取本地化文本(节点);
            let 处理后的角色 = 当前状态.显示模式 === 'NVL' ? '' : 替换变量(本地化角色, '');
            角色元素.innerHTML = 处理后的角色;
            角色元素.style.display = 处理后的角色 ? 'block' : 'none';
            if (typeof 应用角色样式 === 'function') 应用角色样式();
            if (节点.动画?.角色) 应用动画(角色元素, 节点.动画.角色);

            const 内容元素 = 容器.querySelector('.内容');
            const {
                内容: 本地化内容
            } = 获取本地化文本(节点);
            let 处理后的内容 = 当前状态.显示模式 === 'NVL' ? '' : 替换变量(本地化内容, '未知');

            const 节点逐字配置 = 节点.逐字显示 || {};
            const 逐字启用 = 节点逐字配置.启用 !== undefined ? 节点逐字配置.启用 : 当前状态.逐字显示.启用;

            const 初始速度 = 读取配置('初始状态').逐字显示.速度;
            const 逐字速度 = 节点逐字配置.速度 !== undefined ? 节点逐字配置.速度 : 初始速度;

            if (节点.逐字显示) {
                当前状态.逐字显示.启用 = 逐字启用;
                当前状态.逐字显示.速度 = 逐字速度;
            }

            if (逐字启用 && 处理后的内容) {
                开始逐字显示(内容元素, 处理后的内容, 逐字速度, 节点);
            } else {
                内容元素.innerHTML = 处理后的内容;
                if (节点.动画?.内容) 应用动画(内容元素, 节点.动画.内容);
                else if (节点.动画?.内容文字) 应用动画(内容元素, 节点.动画.内容文字);
            }

            const 选项容器 = 容器.querySelector('.选项容器');
            选项容器.innerHTML = '';

            if (有选项) {
                const 存储键名 = 读取配置('存储键名');
                const 已选记录 = JSON.parse(localStorage.getItem(存储键名.已选选项) || '{}');
                节点.选项.forEach((选项, 索引) => {
                    const 条件满足 = 选项.条件 ? 解析条件表达式(选项.条件) : true;
                    if (!条件满足 && !选项.否则目标) {
                        return;
                    }
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
                    选项文本 = 替换变量(选项文本, '');
                    选项按钮.textContent = 选项文本;
                    if (选项.样式) {
                        if (typeof 选项.样式 === 'string') {
                            选项按钮.className += ' ' + 选项.样式;
                        } else {
                            Object.assign(选项按钮.style, 选项.样式);
                        }
                    }
                    const 选项标识 = `${当前状态.当前章节}_${当前状态.当前索引}_${索引}`;
                    if (已选记录[选项标识]) {
                        选项按钮.classList.add('已选');
                        选项按钮.setAttribute('aria-pressed', 'true');
                    }
                    选项按钮.addEventListener('click', function(e) {
                        e.stopPropagation();
                        e.preventDefault();
                        if (已选记录[选项标识]) return;
                        if (!已选记录[选项标识]) {
                            已选记录[选项标识] = {
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
                                选项文本: 选项文本
                            };
                            localStorage.setItem(存储键名.已选选项, JSON.stringify(已选记录));
                            this.classList.add('已选');
                            if (当前状态.显示模式 === 'NVL') {
                                添加NVL交互记录('选择', '', 选项文本);
                            }
                        }
                        选项容器.querySelectorAll('.选项按钮').forEach(btn => {
                            btn.style.pointerEvents = 'none';
                        });
                        处理选项点击(选项);
                    });
                    选项容器.appendChild(选项按钮);
                });
            }

            if (节点.动画?.对话框) {
                应用动画(容器, 节点.动画.对话框);
            } else {
                容器.style.animation = '对话框进入动画 0.3s ease forwards';
            }
        }
    }

    if (节点.输入) {
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
            当前状态.用户变量[节点.输入.变量名] = 输入值;
            保存用户变量到本地存储();
            const 输入提示 = 输入容器.querySelector('.输入提示文字')?.textContent || 节点.输入.变量名 || '输入';
            添加NVL交互记录('输入', 输入提示, 输入值);
            输入容器.remove();
            document.addEventListener("click", 处理全局点击);
            处理跳转(节点.输入.目标);
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

    if (当前状态.显示模式 === 'NVL' && (节点.选项?.length || 节点.输入)) {
        const NVL容器 = document.getElementById('NVL文本容器');
        const 选项容器 = document.querySelector('#对话框容器 .选项容器');
        if (NVL容器 && 选项容器) {
            const 内联交互 = document.createElement('section');
            内联交互.className = 'NVL内联交互';
            内联交互.setAttribute('aria-label', '剧情交互');
            选项容器.classList.add('NVL选项容器');
            选项容器.style.display = 'flex';
            选项容器.style.visibility = 'visible';
            选项容器.style.opacity = '1';
            选项容器.style.pointerEvents = 'auto';
            内联交互.appendChild(选项容器);
            const NVL内容容器 = 获取NVL内容容器();
            NVL内容容器.appendChild(内联交互);
            内联交互.style.display = 'block';
            内联交互.style.visibility = 'visible';
            内联交互.style.opacity = '1';
            内联交互.style.pointerEvents = 'auto';
            requestAnimationFrame(重建NVL页面);
        }
    }

    const 背景容器元素 = document.getElementById('背景容器');
    if (节点.动画?.背景 && 背景容器元素) 应用动画(背景容器元素, 节点.动画.背景);
    if (节点.自定义功能) {
        try {
            eval(节点.自定义功能);
        } catch (e) {
            console.error('自定义功能错误:', e);
        }
    }

    添加历史记录(节点, 执行前快照);

    if (节点.快进模式 !== undefined) {
        当前状态.快进模式 = 节点.快进模式;
        const 快进按钮 = document.getElementById('快进按钮');
        if (快进按钮) {
            if (节点.快进模式) 快进按钮.classList.add('激活');
            else 快进按钮.classList.remove('激活');
        }
    }

    if (当前状态.快进模式) {
        if (节点.选项?.length || 节点.输入 || 节点.调查) {
            停止快进();
            const 快进按钮 = document.getElementById('快进按钮');
            if (快进按钮) 快进按钮.classList.remove('激活');
        } else {
            const 章节数据 = 章节库[当前状态.当前章节];
            const 下一个索引 = 当前状态.当前索引 + 1;
            if (下一个索引 < 章节数据.length) {
                当前状态.快进定时器 = setTimeout(() => {
                    当前状态.快进定时器 = null;
                    if (!当前状态.快进模式) return;
                    当前状态.当前索引++;
                    继续剧情();
                }, 200);
            } else {
                停止快进();
                const 快进按钮 = document.getElementById('快进按钮');
                if (快进按钮) 快进按钮.classList.remove('激活');
            }
        }
    }
}