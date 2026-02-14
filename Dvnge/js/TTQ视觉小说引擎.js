// TTQ视觉小说引擎.js
// 版本: v1.3.1
// 版本命名遵循语义化版本 vX.Y.Z (X-不兼容之前版本的大更新，Y-功能更新，Z-补丁)
// 开发者: Tian
// ⚠️对js不熟的不要动这个文件

'use strict';

// ====================== 全局配置 ======================
const 章节库 = {
    "序章": typeof 序章数据 !== 'undefined' ? 序章数据 : [],
    "第一章": typeof 第一章数据 !== 'undefined' ? 第一章数据 : []
};

const 初始状态 = {
    当前章节: "",
    当前索引: 0,
    标签表: {},
    背景: "#222",
    标题: {
        显示: false,
        内容: "",
        位置: "上中",
        样式: {}
    },
    左立绘: {
        显示: false,
        路径: ""
    },
    中立绘: {
        显示: false,
        路径: ""
    },
    右立绘: {
        显示: false,
        路径: ""
    },
    音乐: null,
    用户变量: {},
    音乐淡出时间: 1000, // 毫秒
    音效: [],
    自动节点定时器: null, // 存储自动隐藏的定时器
    自动节点: 0, // 当前节点的自动节点时间
    // 逐字显示配置
    逐字显示: {
        启用: true, // 默认启用逐字显示
        速度: 50, // 默认速度（毫秒/字）
        打字定时器: null, // 存储打字效果的定时器
        打字已完成: false // 标记打字是否已完成
    }
};

let 当前状态 = JSON.parse(JSON.stringify(初始状态));
let 全局音效 = []; // 存储所有音效元素

// ====================== 标签索引表 ======================
function 建立标签表(章节数据) {
    const 表 = {};
    章节数据.forEach((节点, idx) => {
        if (节点.标签) { // 中文键名
            表[节点.标签] = idx;
        }
    });
    return 表;
}


// ====================== CG收集系统 ======================
const CG存储键名 = "Dvnge视觉小说引擎_CG收集库";

function 初始化CG存储() {
    if (!localStorage.getItem(CG存储键名)) {
        localStorage.setItem(CG存储键名, JSON.stringify({}));
    }
}

function 解锁CG(CG名称, CG路径 = "") {
    const CG库 = JSON.parse(localStorage.getItem(CG存储键名)) || {};
    CG库[CG名称] = {
        路径: CG路径,
        解锁时间: new Date().toLocaleString()
    };
    localStorage.setItem(CG存储键名, JSON.stringify(CG库));
    return true;
}

function 获取已解锁CG() {
    return JSON.parse(localStorage.getItem(CG存储键名)) || {};
}

function 检查CG解锁状态(CG名称) {
    const CG库 = JSON.parse(localStorage.getItem(CG存储键名)) || {};
    return !!CG库[CG名称];
}

// ====================== 用户变量持久化 ======================
const 用户变量存储键名 = "Dvnge视觉小说引擎_用户变量库";

function 保存用户变量到本地存储() {
    localStorage.setItem(用户变量存储键名, JSON.stringify(当前状态.用户变量));
}

function 从本地存储加载用户变量() {
    const 存储数据 = localStorage.getItem(用户变量存储键名);
    if (存储数据) {
        try {
            当前状态.用户变量 = JSON.parse(存储数据);
            return true;
        } catch (e) {
            console.error("用户变量解析失败:", e);
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
    显示提示('✓ 游戏已自动存档');
}

// ====================== 核心引擎函数 ======================
function 切换章节(新章节名称, 起始索引 = 0, 选项 = {}) {
    const 播放器 = document.getElementById('背景音乐');
    if (当前状态.音乐) {
        播放器.pause();
        播放器.src = '';
    }
    
    当前状态 = {
        ...初始状态,
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
    const 标签表 = 建立标签表(当前章节数据);
    当前状态.标签表 = 建立标签表(当前章节数据);
    
}

// ====================== 打字效果系统 ======================
function 开始逐字显示(内容元素, 完整文本, 速度) {
    // 清除现有的打字定时器
    if (当前状态.逐字显示.打字定时器) {
        clearTimeout(当前状态.逐字显示.打字定时器);
        当前状态.逐字显示.打字定时器 = null;
    }
    
    // 重置状态
    当前状态.逐字显示.打字已完成 = false;
    内容元素.dataset.正在打字 = 'true';
    
    // 移除全局点击事件监听
    document.removeEventListener('click', 处理全局点击);
    
    // 创建临时容器来显示完整效果
    const 临时容器 = document.createElement('div');
    临时容器.style.position = 'absolute';
    临时容器.style.visibility = 'hidden';
    临时容器.innerHTML = 完整文本;
    document.body.appendChild(临时容器);
    
    // 获取所有文本节点
    const 文本节点列表 = [];
    
    function 收集文本节点(节点) {
        if (节点.nodeType === Node.TEXT_NODE) {
            const 文本 = 节点.textContent;
            if (文本.trim()) {
                文本节点列表.push(节点);
            }
        } else if (节点.nodeType === Node.ELEMENT_NODE) {
            // 检查是否是自闭合标签
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
    
    // 清除临时容器
    document.body.removeChild(临时容器);
    
    // 创建显示结构
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
                // 自闭合标签作为一个整体
                显示结构.push({
                    类型: '标签',
                    内容: 节点.outerHTML,
                    父标签: 父标签
                });
            } else {
                // 开始标签
                显示结构.push({
                    类型: '开始标签',
                    内容: `<${标签名}${获取属性字符串(节点)}>`,
                    父标签: 父标签
                });
                
                // 子节点
                for (const 子节点 of 节点.childNodes) {
                    构建显示结构(子节点, 标签名);
                }
                
                // 结束标签
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
    
    // 重新解析原始HTML
    const 临时解析器 = document.createElement('div');
    临时解析器.innerHTML = 完整文本;
    
    for (const 子节点 of 临时解析器.childNodes) {
        构建显示结构(子节点);
    }
    
    // 开始逐字显示
    let 当前索引 = 0;
    let 当前HTML = '';
    const 标签堆栈 = [];
    
    const 打字函数 = () => {
        if (当前索引 >= 显示结构.length) {
            // 打字完成
            内容元素.innerHTML = 完整文本;
            内容元素.dataset.正在打字 = 'false';
            当前状态.逐字显示.打字已完成 = true;
            
            // 清除打字定时器
            if (当前状态.逐字显示.打字定时器) {
                clearTimeout(当前状态.逐字显示.打字定时器);
                当前状态.逐字显示.打字定时器 = null;
            }
            
            // 打字完成后，添加全局点击事件
            if (!节点.选项?.length && !节点.输入) {
                if (!节点.自动节点 || 节点.自动节点 <= 0) {
                    setTimeout(() => {
                        document.addEventListener('click', 处理全局点击);
                    }, 0);
                }
            }
            return;
        }
        
        const 当前单元 = 显示结构[当前索引];
        
        // 处理不同类型的内容
        if (当前单元.类型 === '字符') {
            if (当前单元.内容 === '\n') {
                当前HTML += '<br>';
            } else {
                当前HTML += 当前单元.内容;
            }
        } else if (当前单元.类型 === '标签') {
            // 自闭合标签
            当前HTML += 当前单元.内容;
        } else if (当前单元.类型 === '开始标签') {
            当前HTML += 当前单元.内容;
            标签堆栈.push(当前单元);
        } else if (当前单元.类型 === '结束标签') {
            当前HTML += 当前单元.内容;
            标签堆栈.pop();
        }
        
        // 更新显示
        内容元素.innerHTML = 当前HTML;
        
        当前索引++;
        
        // 设置下一个字符的定时器
        当前状态.逐字显示.打字定时器 = setTimeout(打字函数, 速度);
    };
    
    // 开始打字
    打字函数();
}

function 停止打字效果() {
    // 清除打字定时器
    if (当前状态.逐字显示.打字定时器) {
        clearTimeout(当前状态.逐字显示.打字定时器);
        当前状态.逐字显示.打字定时器 = null;
    }
    
    // 重置状态
    当前状态.逐字显示.打字已完成 = false;
    
    // 如果有正在打字的内容，立即完成
    const 内容元素 = document.querySelector('.内容');
    if (内容元素 && 内容元素.dataset.正在打字 === 'true') {
        const 完整内容 = 内容元素.dataset.完整内容 || '';
        内容元素.innerHTML = 完整内容
            .replace(/\[b\](.*?)\[\/b\]/g, '<strong>$1</strong>')
            .replace(/\[i\](.*?)\[\/i\]/g, '<em>$1</em>');
        内容元素.dataset.正在打字 = 'false';
    }
}

// 声明节点变量供打字函数使用
let 节点 = null;

// ====================== 场景更新系统 ======================
function 更新场景(当前节点) {
    // 保存当前节点到全局变量
    节点 = 当前节点;
    
    if (!节点) return;
    
    // 停止当前所有效果
    停止当前音效();
    停止打字效果();
    
    // 清除之前的自动节点定时器
    if (当前状态.自动节点定时器) {
        clearTimeout(当前状态.自动节点定时器);
        当前状态.自动节点定时器 = null;
    }
    
    // HTML跳转功能
    if (节点.跳转HTML) {
        const 跳转路径 = 节点.跳转HTML.路径 || 'index.html';
        let 参数部分 = 节点.跳转HTML.参数 ? `?${节点.跳转HTML.参数}` : '';
        
        // 自动添加当前章节和索引作为参数
        if (参数部分) {
            参数部分 += `&来自章节=${encodeURIComponent(当前状态.当前章节)}`;
            参数部分 += `&来自索引=${当前状态.当前索引}`;
        } else {
            参数部分 = `?来自章节=${encodeURIComponent(当前状态.当前章节)}`;
            参数部分 += `&来自索引=${当前状态.当前索引}`;
        }
        
        // 可以添加需要传递的变量
        if (节点.跳转HTML.传递变量) {
            // 支持字符串或数组
            const 变量列表 = Array.isArray(节点.跳转HTML.传递变量) ?
                节点.跳转HTML.传递变量 : [节点.跳转HTML.传递变量];
            
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
    
    // 直接目标跳转功能
    if (节点.目标) {
        if (typeof 节点.目标 === 'number') {
            // 数字：当前章节内跳转
            当前状态.当前索引 = 节点.目标;
            继续剧情();
            return;
        } else if (typeof 节点.目标 === 'string') {
            // 字符串：按标签跳转
            当前状态.当前索引 = 当前状态.标签表[节点.目标] // 查表
                ??
                当前状态.当前索引 + 1; // 没查到就下一句
            继续剧情();
            return;
        } else if (节点.目标 && typeof 节点.目标 === 'object') {
            // 对象：跨章节跳转
            if (节点.目标.章节) {
                切换章节(节点.目标.章节, 节点.目标.索引 || 0);
                return;
            }
        }
        // 如果目标无效，就继续下一个节点
        当前状态.当前索引++;
        继续剧情();
        return;
    }
    
    // 自动隐藏系统
    if (节点.自动节点 && 节点.自动节点 > 0) {
        当前状态.自动节点 = 节点.自动节点;
        
        // 完全禁用所有点击事件
        document.removeEventListener('click', 处理全局点击);
        
        // 设置自动节点定时器
        当前状态.自动节点定时器 = setTimeout(() => {
            当前状态.当前索引++;
            继续剧情();
        }, 节点.自动节点 * 1000);
    } else {
        // 没有自动节点，只有在不使用逐字显示时才添加全局点击事件
        const 节点逐字配置 = 节点.逐字显示 || {};
        const 逐字启用 = 节点逐字配置.启用 !== undefined ? 节点逐字配置.启用 : 当前状态.逐字显示.启用;
        
        if (!逐字启用) {
            if (!节点.选项 && !节点.输入) {
                document.addEventListener('click', 处理全局点击);
            }
        }
        // 对于启用逐字显示的情况，全局点击事件会在打字完成后添加
        当前状态.自动节点 = 0;
    }
    
    // 变量设置系统
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
    
    // 背景系统
    if (节点.背景) {
        let 背景值 = 节点.背景;
        背景值 = 背景值.replace(/{([^}]+)}/g, (匹配, 变量名) => {
            const 变量路径 = 变量名.trim().split('.');
            let 值 = 当前状态.用户变量;
            try {
                变量路径.forEach(段 => 值 = 值[段]);
                return 值 || '';
            } catch {
                console.error(`背景变量解析失败: ${变量名}`);
                return '';
            }
        });
        
        // 只有明显是图片路径时才添加 center/cover
        let 背景图 = 背景值;
        
        // 如果是图片路径（以常见图片扩展名结尾，或者是 data:image/ 开头）
        if (/\.(jpg|jpeg|png|gif|svg|webp|bmp)$/i.test(背景值) ||
            背景值.startsWith('data:image/') ||
            (背景值.includes('/') && !背景值.startsWith('#') && !背景值.startsWith('rgb'))) {
            
            if (!背景值.includes('url(')) {
                背景值 = `url('${背景值}')`;
            }
            背景图 = `${背景值} center/cover`;
        }
        // 否则直接使用原值
        document.body.style.background = 背景图;
        当前状态.背景 = 背景图;
    }
    
    // 标题系统
    if (节点.标题) {
        const 标题容器 = document.getElementById('标题容器');
        const 标题设置 = 节点.标题;
        
        if (标题设置.显示 === false) {
            // 隐藏标题
            标题容器.classList.add('标题退出');
            setTimeout(() => {
                标题容器.classList.add('隐藏');
                标题容器.classList.remove('标题退出');
            }, 600);
            当前状态.标题.显示 = false;
        } else {
            // 显示或更新标题
            let 标题内容 = 标题设置.内容 || '';
            
            // 处理标题内容中的变量替换
            标题内容 = 标题内容.replace(/{([^}]+)}/g, (匹配, 变量名) => {
                const 变量路径 = 变量名.trim().split('.');
                let 值 = 当前状态.用户变量;
                try {
                    变量路径.forEach(段 => {
                        值 = 值[段];
                    });
                    return 值 || '';
                } catch {
                    return '无效变量';
                }
            });
            
            // 移除所有位置类
            const 位置类列表 = ['标题位置-上', '标题位置-下', '标题位置-左', '标题位置-右',
                '标题位置-左上', '标题位置-左下', '标题位置-右上', '标题位置-右下', '标题位置-中'
            ];
            位置类列表.forEach(类名 => 标题容器.classList.remove(类名));
            
            // 添加新位置类
            const 位置 = 标题设置.位置 || '中';
            标题容器.classList.add(`标题位置-${位置}`);
            
            // 设置标题内容
            标题容器.textContent = 标题内容;
            
            // 应用自定义样式
            if (标题设置.样式) {
                Object.entries(标题设置.样式).forEach(([属性, 值]) => {
                    标题容器.style[属性] = 值;
                });
            } else {
                // 重置样式
                标题容器.style = '';
            }
            
            // 显示标题
            标题容器.classList.remove('隐藏');
            标题容器.classList.add('标题进入');
            
            当前状态.标题 = {
                显示: true,
                内容: 标题设置.内容,
                位置: 位置,
                样式: 标题设置.样式 || {}
            };
        }
    }
    
    // 立绘系统
    ['左立绘', '中立绘', '右立绘'].forEach(位置 => {
        const 元素 = document.getElementById(位置);
        if (!元素) return;
        
        const 新设置 = 节点.立绘?.[位置] || {};
        const 当前显示状态 = 当前状态[位置]?.显示 ?? false;
        
        if (新设置.路径) {
            let 解析路径 = 新设置.路径;
            解析路径 = 解析路径.replace(/{([^}]+)}/g, (匹配, 变量名) => {
                const 变量路径 = 变量名.trim().split('.');
                let 值 = 当前状态.用户变量;
                try {
                    变量路径.forEach(段 => 值 = 值[段]);
                    return 值 || '';
                } catch {
                    return '无效路径';
                }
            });
            
            元素.src = 解析路径;
            元素.style.opacity = 1;
            当前状态[位置] = {
                显示: true,
                路径: 新设置.路径
            };
        } else if (新设置.隐藏 || !当前显示状态) {
            元素.style.opacity = 0;
            当前状态[位置] = {
                显示: false,
                路径: ""
            };
        } else {
            元素.style.opacity = 当前显示状态 ? 1 : 0;
        }
    });
    
    // 音乐系统
    const 音乐播放器 = document.getElementById('背景音乐');
    if (节点.hasOwnProperty('音乐')) {
        let 音乐路径 = 节点.音乐;
        
        if (typeof 音乐路径 === 'string') {
            音乐路径 = 音乐路径.replace(/{([^}]+)}/g, (匹配, 变量名) => {
                const 变量路径 = 变量名.trim().split('.');
                let 值 = 当前状态.用户变量;
                try {
                    变量路径.forEach(段 => {
                        值 = 值?.[段];
                    });
                    return 值 || '';
                } catch (错误) {
                    console.error(`音乐变量解析失败: ${变量名}`, 错误);
                    return '[无效路径]';
                }
            });
        }
        
        if (音乐路径) {
            if (音乐播放器.src !== 音乐路径) {
                const 淡出开始时间 = Date.now();
                const 淡出间隔 = setInterval(() => {
                    const 进度 = (Date.now() - 淡出开始Time) / 当前状态.音乐淡出时间;
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
    
    // 音效系统
    if (节点.音效) {
        let 音效路径 = 节点.音效;
        
        // 变量替换
        音效路径 = 音效路径.replace(/{([^}]+)}/g, (匹配, 变量名) => {
            const 变量路径 = 变量名.trim().split('.');
            let 值 = 当前状态.用户变量;
            try {
                变量路径.forEach(段 => 值 = 值?.[段]);
                return 值 || '';
            } catch (错误) {
                console.error(`音效变量解析失败: ${变量名}`, 错误);
                return '[无效路径]';
            }
        });
        
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
                // 从全局音效数组中移除
                const 索引 = 全局音效.indexOf(音效元素);
                if (索引 !== -1) {
                    全局音效.splice(索引, 1);
                }
            });
            
            // 添加到全局音效数组和当前状态
            全局音效.push(音效元素);
            当前状态.音效.push(音效元素);
        }
    }
    
    // 条件判断逻辑
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
    
    // 自动存档
    if (节点.自动存档) {
        自动存档();
    }
    
    // CG解锁功能
    if (节点.解锁CG) {
        解锁CG(节点.解锁CG.名称, 节点.解锁CG.路径);
    }
    
    // 对话框系统
    const 容器 = document.getElementById('对话框容器');
    if (容器) {
        const 有对话内容 = 节点.角色 || 节点.内容;
        const 有选项 = 节点.选项?.length > 0;
        
        容器.style.animation = 'none';
        void 容器.offsetHeight;
        
        if (有对话内容 || 有选项) {
            容器.style.display = 'block';
            
            // 角色字段处理
            const 角色元素 = 容器.querySelector('.角色');
            let 处理后的角色 = 节点.角色 || '';
            
            处理后的角色 = 处理后的角色.replace(/{([^}]+)}/g, (匹配, 变量名) => {
                const 变量路径 = 变量名.trim().split('.');
                let 值 = 当前状态.用户变量;
                try {
                    变量路径.forEach(段 => {
                        值 = 值[段];
                    });
                    return 值 || '无名';
                } catch {
                    return '无效变量';
                }
            });
            
            角色元素.textContent = 处理后的角色;
            角色元素.style.display = 处理后的角色 ? 'block' : 'none';
            
            // 内容字段处理
            const 内容元素 = 容器.querySelector('.内容');
            let 处理后的内容 = 节点.内容 || '';
            
            处理后的内容 = 处理后的内容.replace(/{([^}]+)}/g, (匹配, 变量名) => {
                const 变量路径 = 变量名.trim().split('.');
                let 值 = 当前状态.用户变量;
                try {
                    变量路径.forEach(段 => {
                        值 = 值[段];
                    });
                    return 值 || '未知';
                } catch {
                    return '无效变量';
                }
            });
            
            // 逐字显示系统
            const 节点逐字配置 = 节点.逐字显示 || {};
            const 逐字启用 = 节点逐字配置.启用 !== undefined ? 节点逐字配置.启用 : 当前状态.逐字显示.启用;
            const 逐字速度 = 节点逐字配置.速度 || 当前状态.逐字显示.速度;
            
            if (逐字启用 && 处理后的内容) {
                // 使用逐字显示效果
                开始逐字显示(
                    内容元素,
                    处理后的内容,
                    逐字速度
                );
            } else {
                // 直接显示内容
                内容元素.innerHTML = 处理后的内容
                    .replace(/\[b\](.*?)\[\/b\]/g, '<strong>$1</strong>')
                    .replace(/\[i\](.*?)\[\/i\]/g, '<em>$1</em>');
                
                // 如果不使用逐字显示，正常添加全局点击事件
                if (!节点.选项?.length && !节点.输入) {
                    if (!节点.自动节点 || 节点.自动节点 <= 0) {
                        document.addEventListener('click', 处理全局点击);
                    }
                }
            }
            
            // 处理选项
            const 选项容器 = 容器.querySelector('.选项容器');
            选项容器.innerHTML = '';
            
            if (有选项) {
                节点.选项.forEach(选项 => {
                    const 选项按钮 = document.createElement('div');
                    选项按钮.className = '选项按钮';
                    选项按钮.textContent = 选项.文本 || '选项';
                    
                    选项按钮.addEventListener('click', function(e) {
                        e.stopPropagation();
                        e.preventDefault();
                        选项容器.querySelectorAll('.选项按钮').forEach(btn => {
                            btn.removeEventListener('click', this);
                        });
                        处理选项点击(选项);
                    });
                    
                    选项容器.appendChild(选项按钮);
                });
                document.removeEventListener('click', 处理全局点击);
            }
            
            容器.style.animation = '对话框进入动画 0.3s ease forwards';
        } else {
            const 隐藏对话框 = () => {
                容器.style.display = 'none';
            };
            
            if (getComputedStyle(容器).display === 'none') {
                隐藏对话框();
            } else {
                容器.style.animation = '对话框退出动画 0.3s ease forwards';
                容器.addEventListener('animationend', 隐藏对话框, {
                    once: true
                });
            }
        }
    }
    
    // 输入系统
    if (节点.输入) {
        document.removeEventListener('click', 处理全局点击);
        
        const 输入容器 = document.createElement('div');
        输入容器.className = '输入容器';
        
        if (节点.输入.提示文字) {
            const 提示元素 = document.createElement('div');
            提示元素.className = '输入提示文字';
            提示元素.textContent = 节点.输入.提示文字;
            输入容器.appendChild(提示元素);
        }
        
        const 输入框 = document.createElement('input');
        输入框.className = '输入框';
        输入框.placeholder = 节点.输入.占位符 || '请输入...';
        输入框.maxLength = 节点.输入.最大长度 || 20;
        
        const 确认按钮 = document.createElement('div');
        确认按钮.className = '输入确认按钮';
        确认按钮.textContent = 节点.输入.按钮文字 || '确认';
        
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

            // 处理跳转目标
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
}

// ====================== 停止当前音效 ======================
function 停止当前音效() {
    当前状态.音效.forEach(音效 => {
        try {
            音效.pause();
            音效.currentTime = 0;
            
            // 从全局音效数组中移除
            const 索引 = 全局音效.indexOf(音效);
            if (索引 !== -1) {
                全局音效.splice(索引, 1);
            }
        } catch (错误) {
            console.error('停止音效时出错:', 错误);
        }
    });
    
    // 清空当前状态的音效数组
    当前状态.音效 = [];
}

// ====================== 条件解析函数 ======================
function 解析条件表达式(表达式) {
    try {
        return new Function('vars', `
      try {
        return ${表达式};
      } catch {
        return false;
      }
    `)(当前状态.用户变量);
    } catch (e) {
        console.error('条件解析错误:', e);
        return false;
    }
}

// ====================== 选项处理系统 ======================
function 处理选项点击(选项) {
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
                安全作用域.vars,
                安全作用域.getVar,
                安全作用域.Math
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
    
    // 跳转目标
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

// ====================== 剧情推进系统 ======================
function 继续剧情() {
    // 在继续剧情前停止所有效果
    停止当前音效();
    停止打字效果();
    
    // 清除自动节点定时器
    if (当前状态.自动节点定时器) {
        clearTimeout(当前状态.自动节点定时器);
        当前状态.自动节点定时器 = null;
    }
    
    const 当前章节数据 = 章节库[当前状态.当前章节];
    if (!当前章节数据) return;
    
    if (当前状态.当前索引 < 当前章节数据.length) {
        更新场景(当前章节数据[当前状态.当前索引]);
    } else {
        const 对话框容器 = document.getElementById('对话框容器');
        对话框容器 && (对话框容器.style.display = 'none');
    }
}

// ====================== 存档系统 ======================
const 最大存档位 = 2;

function 生成存档快照() {
    return {
        时间: new Date().toLocaleString(),
        章节: 当前状态.当前章节,
        索引: 当前状态.当前索引,
        背景: 当前状态.背景,
        标题: {
            显示: 当前状态.标题.显示,
            内容: 当前状态.标题.内容,
            位置: 当前状态.标题.位置,
            样式: 当前状态.标题.样式
        },
        立绘: {
            左: 当前状态.左立绘 || {
                显示: false,
                路径: ""
            },
            中: 当前状态.中立绘 || {
                显示: false,
                路径: ""
            },
            右: 当前状态.右立绘 || {
                显示: false,
                路径: ""
            }
        },
        音乐: 当前状态.音乐,
        自动节点: 当前状态.自动节点,
        // 保存逐字显示配置
        逐字显示: {
            启用: 当前状态.逐字显示.启用,
            速度: 当前状态.逐字显示.速度
        },
        // 不保存定时器，只保存配置
        用户变量: JSON.parse(JSON.stringify(当前状态.用户变量))
    };
}

// 通用函数：恢复存档状态
function 恢复存档状态(存档, 是否完全重置 = false) {
    // 清除可能存在的定时器
    if (当前状态.自动节点定时器) {
        clearTimeout(当前状态.自动节点定时器);
        当前状态.自动节点定时器 = null;
    }
    
    // 停止打字效果
    停止打字效果();
    
    // 根据参数决定是否完全重置状态
    当前状态 = 是否完全重置 ? {
        ...JSON.parse(JSON.stringify(初始状态)),
        当前章节: 存档.章节 || '序章',
        当前索引: 存档.索引 || 0,
        背景: 存档.背景 || "#222",
        用户变量: 存档.用户变量 || {},
        自动节点: 存档.自动节点 || 0,
        // 恢复逐字显示配置
        逐字显示: {
            ...初始状态.逐字显示,
            ...(存档.逐字显示 || {})
        }
    } : {
        ...当前状态,
        当前章节: 存档.章节,
        当前索引: 存档.索引,
        背景: 存档.背景 || 当前状态.背景,
        音乐: 存档.音乐 || 当前状态.音乐,
        用户变量: 存档.用户变量 || {},
        自动节点: 存档.自动节点 || 0,
        // 恢复逐字显示配置
        逐字显示: {
            ...当前状态.逐字显示,
            ...(存档.逐字显示 || {})
        }
    };
    
    // 恢复背景
    document.body.style.background = 当前状态.背景 || 初始状态.background;
    
    // 恢复标题状态
    if (存档.标题) {
        const 标题容器 = document.getElementById('标题容器');
        
        if (存档.标题.显示) {
            标题容器.textContent = 存档.标题.内容 || '';
            
            // 移除所有位置类
            const 位置类列表 = ['标题位置-上中', '标题位置-下中', '标题位置-左中', '标题位置-右中',
                '标题位置-左上', '标题位置-左下', '标题位置-右上', '标题位置-右下', '标题位置-中中'
            ];
            位置类列表.forEach(类名 => 标题容器.classList.remove(类名));
            
            // 添加位置类
            标题容器.classList.add(`标题位置-${存档.标题.位置 || '上中'}`);
            
            // 应用样式
            if (存档.标题.样式) {
                Object.entries(存档.标题.样式).forEach(([属性, 值]) => {
                    标题容器.style[属性] = 值;
                });
            }
            
            标题容器.classList.remove('隐藏');
            标题容器.classList.add('标题进入');
            
            当前状态.标题 = {
                显示: true,
                内容: 存档.标题.内容,
                位置: 存档.标题.位置,
                样式: 存档.标题.样式
            };
        }
    }
    // 恢复立绘
    ['左立绘', '中立绘', '右立绘'].forEach(位置 => {
        const 元素 = document.getElementById(位置);
        const 位置缩写 = 位置.charAt(0); // "左"、"中"、"右"
        const 存档数据 = 存档.立绘?.[位置缩写] || {
            显示: false,
            路径: ""
        };
        
        当前状态[位置] = {
            ...存档数据
        };
        元素.src = 存档数据.路径 || "";
        元素.style.opacity = 存档数据.显示 ? 1 : 0;
    });
    
    // 恢复音乐
    const 播放器 = document.getElementById('背景音乐');
    if (当前状态.音乐) {
        播放器.src = 当前状态.音乐;
        播放器.volume = 1;
    } else {
        播放器.pause();
        播放器.currentTime = 0;
        播放器.removeAttribute('src');
    }
    
    // 恢复标签表
    当前状态.标签表 = 建立标签表(章节库[当前状态.当前章节]);
    
    // 处理读档时设置变量
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
            
            // 支持运算符 +=, -=, *=, /=
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
    if (存档位 < 1 || 存档位 > 最大存档位) return;
    
    显示提示(`✓ 已保存至存档位 ${存档位}`);
    
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
    
    存档项.innerHTML = 数据 ?
        `<span>${是自动存档 ? '自动存档' : '存档'+存档位}: ${JSON.parse(数据).时间}</span>
     <button class="加载按钮">加载</button>` :
        `<span>${是自动存档 ? '暂无自动存档' : '空存档位'+存档位}</span>`;
    
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

function 加载存档(存档位) {
    const 存档键名 = 存档位 === 'auto' ? '自动存档' : `手动存档_${存档位}`;
    const 数据 = localStorage.getItem(存档键名);
    if (!数据) return;
    
    try {
        const 存档 = JSON.parse(数据);
        
        // 使用通用函数恢复状态
        恢复存档状态(存档);
        
        // 尝试播放音乐
        const 播放器 = document.getElementById('背景音乐');
        if (当前状态.音乐) {
            播放器.play().catch(() => console.log('等待用户交互后自动播放'));
        }
        
        // 更新场景
        const 当前章节数据 = 章节库[当前状态.当前章节];
        if (当前章节数据 && 当前状态.当前索引 < 当前章节数据.length) {
            更新场景(当前章节数据[当前状态.当前索引]);
        }
        
        // 关闭存档界面
        const 存档界面 = document.getElementById('存档界面');
        if (存档界面 && !存档界面.classList.contains('隐藏')) {
            关闭存档界面();
        }
        
        显示提示(`✓ ${存档位 === 'auto' ? '自动' : '手动'}存档加载成功`);
        
    } catch (错误) {
        console.error('存档加载失败:', 错误);
        显示提示('⚠ 存档加载失败');
    }
}

function 加载自动存档() {
    加载存档('auto');
}

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
        
        // 使用通用函数恢复状态，并指定完全重置
        恢复存档状态(存档, true);
        
        // 尝试播放音乐
        const 播放器 = document.getElementById('背景音乐');
        if (存档.音乐) {
            播放器.play().catch(() => console.log('等待用户交互'));
        }
        
        // 更新场景
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
    
    更新存档显示('auto');
    
    const 存档界面 = document.getElementById('存档界面');
    存档界面.classList.remove('隐藏');
    
    for (let i = 1; i <= 最大存档位; i++) {
        更新存档显示(i);
    }
}

function 关闭存档界面() {
    document.getElementById('存档界面').classList.add('隐藏');
}

// ====================== 全局事件系统 ======================
function 处理全局点击(e) {
    const 存档界面 = document.getElementById('存档界面');
    if (!存档界面.classList.contains('隐藏')) return;
    
    // 排除点击输入框的情况
    if (e.target.closest('.输入容器')) return;
    
    const 当前章节数据 = 章节库[当前状态.当前章节];
    if (!当前章节数据) return;
    
    if (当前状态.当前索引 < 当前章节数据.length) {
        当前状态.当前索引++;
        更新场景(当前章节数据[当前状态.当前索引]);
    }
}

// ====================== 初始化系统 ======================
document.addEventListener('DOMContentLoaded', () => {
    // 初始化必要组件
    初始化CG存储();
    从本地存储加载用户变量();
    
    // 绑定UI控件事件
    document.getElementById('存档按钮')?.addEventListener('click', 打开存档界面);
    document.getElementById('存档界面').addEventListener('click', (e) => {
        if (e.target === document.getElementById('存档界面')) {
            关闭存档界面();
        }
    });
    
    // 解析URL参数
    const 地址参数 = new URLSearchParams(window.location.search);
    const 章节参数 = 地址参数.get('章节');
    const 索引参数 = 地址参数.get('索引');
    const 存档参数 = 地址参数.get('存档');
    
    if (章节参数 && 索引参数) {
        // 从指定章节和索引开始
        const 目标章节 = 章节库[章节参数];
        const 目标索引 = parseInt(索引参数);
        
        if (目标章节 && !isNaN(目标索引) && 目标索引 >= 0 && 目标索引 < 目标章节.length) {
            切换章节(章节参数, 目标索引);
        } else {
            console.error('无效的章节或索引参数');
            if (章节库.序章?.length) {
                切换章节('序章', 0);
            } else {
                document.body.innerHTML = `
          <div style="padding:20px;color:red">
            <h1>⚠️ 初始化失败</h1>
            <p>章节或索引无效</p>
          </div>`;
            }
        }
    } else if (存档参数) {
        // 加载指定存档
        加载指定存档(存档参数);
    } else {
        // 默认逻辑：开始新游戏
        try {
            if (章节库.序章?.length) {
                切换章节('序章', 0);
            } else {
                throw new Error("缺少开始章节数据");
            }
        } catch (错误) {
            document.body.innerHTML = `
        <div style="padding:20px;color:red">
          <h1>⚠️ 初始化失败</h1>
          <p>${错误.message}</p>
        </div>`;
        }
    }
    
    // 全局点击事件监听
    document.addEventListener('click', 处理全局点击);
});