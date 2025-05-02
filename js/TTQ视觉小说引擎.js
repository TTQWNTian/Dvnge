// TTQ视觉小说引擎.js
// 版本: 1.0.4
// 开发者: Tian
// ⚠️对js不熟的不要动这个文件
'use strict';

// ======================
// 全局配置
// ======================
const 章节库 = {
    "序章": typeof 序章数据 !== 'undefined' ? 序章数据 : [],
    "第一章": typeof 第一章数据 !== 'undefined' ? 第一章数据 : []
};

const 初始状态 = {
    当前章节: "",
    当前索引: 0,
    背景: "#222",
    左立绘: { 显示: false, 路径: "" },
    中立绘: { 显示: false, 路径: "" },
    右立绘: { 显示: false, 路径: "" },
    音乐: null,
    用户变量: {},
    音乐淡出时间: 1000 // 毫秒
};

let 当前状态 = JSON.parse(JSON.stringify(初始状态));

// ======================
// 核心引擎函数
// ======================
function 切换章节(新章节名称, 起始索引 = 0, 选项 = {}) {
    const 播放器 = document.getElementById('背景音乐');
    if (当前状态.音乐) {
        播放器.pause();
        播放器.src = '';
    }

    // 深度重置状态
    当前状态 = {
        ...初始状态,
        当前章节: 新章节名称,
        当前索引: 起始索引
    };

    // 重置所有立绘
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
}

// ======================
// 场景更新系统
// ======================
function 更新场景(节点) {
    if (!节点) return;

    // 变量设置系统
    if (节点.设置变量) {
        Object.entries(节点.设置变量).forEach(([变量路径, 值]) => {
            const 路径数组 = 变量路径.split('.');
            let 当前对象 = 当前状态.用户变量;

            // 构建多级对象结构
            路径数组.slice(0, -1).forEach(段 => {
                if (!当前对象[段]) 当前对象[段] = {};
                当前对象 = 当前对象[段];
            });

            const 最后字段 = 路径数组[路径数组.length - 1];

            // 处理运算符（如 +=、-= 等）
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

            // 直接赋值
            当前对象[最后字段] = 值;
        });
    }

    // 背景更新
    if (节点.背景) {
        // 添加变量解析逻辑
        let 背景路径 = 节点.背景;
        背景路径 = 背景路径.replace(/{([^}]+)}/g, (匹配, 变量名) => {
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

        const 背景图 = 背景路径 ? `url('${背景路径}') center/cover` : 初始状态.背景;
        document.body.style.background = 背景图;
        当前状态.背景 = 背景图;
    }

    // 立绘系统
  ['左立绘', '中立绘', '右立绘'].forEach(位置 => {
        const 元素 = document.getElementById(位置);
        if (!元素) return;

        const 新设置 = 节点.立绘?.[位置] || {};
        const 当前显示状态 = 当前状态[位置]?.显示 ?? false;

        if (新设置.路径) {
            // 变量解析逻辑
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
            当前状态[位置] = { 显示: true, 路径: 新设置.路径 };
        } else if (新设置.隐藏) {
            元素.style.opacity = 0;
            当前状态[位置] = { 显示: false, 路径: "" };
        } else {
            元素.style.opacity = 当前显示状态 ? 1 : 0;
        }
    });

    // 音乐系统
    const 音乐播放器 = document.getElementById('背景音乐');
    if (节点.hasOwnProperty('音乐')) {
        let 音乐路径 = 节点.音乐;

        // 变量解析逻辑
        if (typeof 音乐路径 === 'string') {
            音乐路径 = 音乐路径.replace(/{([^}]+)}/g, (匹配, 变量名) => {
                const 变量路径 = 变量名.trim().split('.');
                let 值 = 当前状态.用户变量;
                try {
                    变量路径.forEach(段 => {
                        值 = 值?.[段]; // 安全访问嵌套属性
                    });
                    return 值 || '';
                } catch (错误) {
                    console.error(`音乐变量解析失败: ${变量名}`, 错误);
                    return '[无效路径]';
                }
            });
        }

        // 音乐播放逻辑
        if (音乐路径) {
            if (音乐播放器.src !== 音乐路径) {
                // 添加淡出效果
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

    // 条件判断逻辑
    if (节点.条件) {
        const 条件结果 = 解析条件表达式(节点.条件.表达式);
        if (条件结果) {
            当前状态.当前索引 = 节点.条件.真目标;
            继续剧情();
            return;
        } else {
            当前状态.当前索引 = 节点.条件.假目标 ?? 当前状态.当前索引 + 1;
            继续剧情(); // 立即跳转
            return; // 中断处理
        }
    }

    // 对话框系统
    const 容器 = document.getElementById('对话框容器');
    if (容器) {
        const 有对话内容 = 节点.角色 || 节点.内容;
        const 有选项 = 节点.选项?.length > 0;

        // 清除旧动画状态
        容器.style.animation = 'none';
        void 容器.offsetHeight;

        if (有对话内容 || 有选项) {
            容器.style.display = 'block';

            // 角色字段处理
            const 角色元素 = 容器.querySelector('.角色');
            let 处理后的角色 = 节点.角色 || '';

            // 变量解析
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

            // 变量解析
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

            内容元素.innerHTML = 处理后的内容
                .replace(/\[b\](.*?)\[\/b\]/g, '<strong>$1</strong>')
                .replace(/\[i\](.*?)\[\/i\]/g, '<em>$1</em>');

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
                        选项容器.querySelectorAll('.选项按钮').forEach(btn => {
                            btn.removeEventListener('click', this);
                        });
                        处理选项点击(选项);
                    });

                    选项容器.appendChild(选项按钮);
                });
                document.removeEventListener('click', 处理全局点击);
            } else {
                document.addEventListener('click', 处理全局点击);
            }

            容器.style.animation = '淡入动画 0.3s ease forwards';
        } else {
            const 隐藏对话框 = () => {
                容器.style.display = 'none';
            };

            if (getComputedStyle(容器).display === 'none') {
                隐藏对话框();
            } else {
                容器.style.animation = '淡出动画 0.3s ease forwards';
                容器.addEventListener('animationend', 隐藏对话框, { once: true });
            }
        }
    }

    // 输入系统
    if (节点.输入) {
        document.removeEventListener('click', 处理全局点击);

        const 输入容器 = document.createElement('div');
        输入容器.className = '输入容器';

        // 提示文字
        if (节点.输入.提示文字) {
            const 提示元素 = document.createElement('div');
            提示元素.className = '输入提示文字';
            提示元素.textContent = 节点.输入.提示文字;
            输入容器.appendChild(提示元素);
        }

        // 输入框
        const 输入框 = document.createElement('input');
        输入框.className = '输入框';
        输入框.placeholder = 节点.输入.占位符 || '请输入...';
        输入框.type = 节点.输入.类型 || 'text';
        输入框.maxLength = 节点.输入.最大长度 || 20;

        // 确认按钮
        const 确认按钮 = document.createElement('div');
        确认按钮.className = '输入确认按钮';
        确认按钮.textContent = 节点.输入.按钮文字 || '确认';

        // 事件处理
        const 处理确认 = () => {
            const 输入值 = 输入框.value.trim();

            // 验证必填
            if (节点.输入.必填 && !输入值) {
                输入框.placeholder = "请输入内容！";
                输入框.style.borderColor = "#ff4444";
                return;
            }

            // 存储变量（支持多级变量）
            if (节点.输入.变量名) {
                const 变量路径 = 节点.输入.变量名.split('.');
                let 当前对象 = 当前状态.用户变量;

                // 构建多级对象结构
                变量路径.slice(0, -1).forEach(段 => {
                    if (!当前对象[段]) 当前对象[段] = {};
                    当前对象 = 当前对象[段];
                });

                // 设置最终值
                当前对象[变量路径[变量路径.length - 1]] = 输入值;
            }

            // 移除输入组件
            输入容器.remove();

            // 处理跳转
            if (typeof 节点.输入.目标 === 'number') {
                当前状态.当前索引 = 节点.输入.目标;
            } else {
                当前状态.当前索引++;
            }

            // 恢复点击事件
            document.addEventListener('click', 处理全局点击);
            继续剧情();
        };

        确认按钮.addEventListener('click', function(e) {
            e.stopPropagation(); // 阻止冒泡
            处理确认();
        });

        输入框.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.stopPropagation(); // 确保回车事件不会触发其他行为
                处理确认();
            }
        });

        输入容器.appendChild(输入框);
        输入容器.appendChild(确认按钮);
        容器.querySelector('.选项容器').appendChild(输入容器);
    }
}

// ======================
// 条件解析函数
// ======================
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

// ======================
// 选项处理系统
// ======================
function 处理选项点击(选项) {
    // 条件判断系统
    let 条件满足 = true;
    if (选项.条件) {
        // 创建安全作用域
        const 用户变量 = 当前状态.用户变量; // 将用户变量存储在闭包中
        const 安全作用域 = {
            vars: 用户变量,
            Math: Math,
            getVar: function(path) {
                return path.split('.').reduce((obj, key) => obj?.[key], 用户变量);
            }
        };

        // 编译条件表达式
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
    // 应用变量修改
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
        });
    }

    // 处理跳转逻辑
    const 跳转目标 = 条件满足 ? 选项.目标 : 选项.否则目标;

    if (typeof 跳转目标 === 'number') {
        当前状态.当前索引 = 跳转目标;
        继续剧情();
    } else if (跳转目标?.章节) {
        切换章节(跳转目标.章节, 跳转目标.索引 || 0);
    } else if (!跳转目标) {
        当前状态.当前索引++;
        继续剧情();
    }
}

// ======================
// 剧情推进系统
// ======================
function 继续剧情() {
    const 当前章节数据 = 章节库[当前状态.当前章节];
    if (!当前章节数据) return;

    if (当前状态.当前索引 < 当前章节数据.length) {
        更新场景(当前章节数据[当前状态.当前索引]);
    } else {
        const 对话框容器 = document.getElementById('对话框容器');
        对话框容器 && (对话框容器.style.display = 'none');
    }
}

// ======================
// 存档系统
// ======================
const 最大存档位 = 3;

function 生成存档快照() {
    return {
        时间: new Date().toLocaleString(),
        章节: 当前状态.当前章节,
        索引: 当前状态.当前索引,
        背景: 当前状态.背景,
        立绘: {
            左: 当前状态.左立绘 || { 显示: false, 路径: "" },
            中: 当前状态.中立绘 || { 显示: false, 路径: "" },
            右: 当前状态.右立绘 || { 显示: false, 路径: "" }
        },
        音乐: 当前状态.音乐,
        用户变量: JSON.parse(JSON.stringify(当前状态.用户变量))
    };
}

function 保存存档(存档位) {
    if (存档位 < 1 || 存档位 > 最大存档位) return;

    // 生成提示元素
    const 提示 = document.createElement('div');
    提示.className = '存档提示';
    提示.textContent = `✓ 已保存至存档位 ${存档位}`;

    // 添加到界面
    document.body.appendChild(提示);

    // 自动隐藏
    setTimeout(() => {
        提示.style.opacity = '0';
        setTimeout(() => 提示.remove(), 500);
    }, 2000);

    // 实际保存操作
    const 存档数据 = 生成存档快照();
    localStorage.setItem(`手动存档_${存档位}`, JSON.stringify(存档数据));
    更新存档显示(存档位);
}

function 更新存档显示(存档位) {
    const 存档项 = document.querySelector(`.存档项[data-slot="${存档位}"]`);
    if (!存档项) return;

    const 数据 = localStorage.getItem(`手动存档_${存档位}`);
    存档项.innerHTML = 数据 ?
        `<span>${JSON.parse(数据).时间}</span><button class="加载按钮">加载</button>` :
        `<span>空存档位${存档位}</span>`;

    const 加载按钮 = 存档项.querySelector('.加载按钮');
    if (加载按钮) {
        加载按钮.addEventListener('click', (e) => {
            e.stopPropagation();
            加载存档(存档位);
        });
    }
}

function 加载存档(存档位) {
    const 数据 = localStorage.getItem(`手动存档_${存档位}`);
    if (!数据) return;

    try {
        const 存档 = JSON.parse(数据);

        // 恢复基本状态
        当前状态 = {
            ...当前状态,
            当前章节: 存档.章节,
            当前索引: 存档.索引,
            背景: 存档.背景 || 当前状态.背景,
            音乐: 存档.音乐 || 当前状态.音乐,
            用户变量: 存档.用户变量 || {}
        };

        // 恢复背景
        document.body.style.background = 当前状态.背景 || 初始状态.背景;

        // 恢复立绘状态
    ['左立绘', '中立绘', '右立绘'].forEach(位置 => {
            const 元素 = document.getElementById(位置);
            const 存档数据 = 存档.立绘?.[位置.charAt(0)] || 当前状态[位置] || { 显示: false, 路径: "" };

            if (存档数据.路径) {
                元素.src = 存档数据.路径;
                元素.style.opacity = 存档数据.显示 ? 1 : 0;
                当前状态[位置] = { ...存档数据 };
            } else {
                元素.style.opacity = 0;
                当前状态[位置] = { 显示: false, 路径: "" };
            }
        });

        // 恢复音乐
        const 播放器 = document.getElementById('背景音乐');
        if (当前状态.音乐) {
            播放器.src = 当前状态.音乐;
            播放器.play().catch(() => console.log('等待用户交互后自动播放'));
        } else {
            播放器.pause();
            播放器.currentTime = 0;
            播放器.removeAttribute('src');
        }

        // 强制更新当前场景
        const 当前章节数据 = 章节库[当前状态.当前章节];
        if (当前章节数据 && 当前状态.当前索引 < 当前章节数据.length) {
            更新场景(当前章节数据[当前状态.当前索引]);
        }

        关闭存档界面();
    } catch (错误) {
        console.error('存档加载失败:', 错误);
    }
}

// ======================
// 界面控制系统
// ======================
function 打开存档界面(e) {
    e?.stopPropagation();

    const 存档界面 = document.getElementById('存档界面');
    存档界面.classList.remove('隐藏');

    for (let i = 1; i <= 最大存档位; i++) {
        更新存档显示(i);
    }
}

function 关闭存档界面() {
    document.getElementById('存档界面').classList.add('隐藏');
}

// ======================
// 全局事件系统
// ======================
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

// ======================
// 初始化系统
// ======================
document.addEventListener('DOMContentLoaded', () => {
    // 绑定控件事件
    document.getElementById('存档按钮')?.addEventListener('click', 打开存档界面);
    document.getElementById('存档界面').addEventListener('click', (e) => {
        if (e.target === document.getElementById('存档界面')) {
            关闭存档界面();
        }
    });

    // 初始化全局点击监听
    document.addEventListener('click', 处理全局点击);

    // 初始化游戏
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
      </div>
    `;
    }
});