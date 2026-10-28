/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025-2026 Tian
 */
'use strict';

// ====================== 全局事件 ======================
function 处理全局点击(e) {
    if (正在切换语言) return;
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

    const 历史界面 = document.getElementById('历史界面');
    if (历史界面 && !历史界面.classList.contains('隐藏')) return;

    if (e.target.closest('.输入容器')) return;

    const 当前章节数据 = 章节库[当前状态.当前章节];
    if (!当前章节数据) return;
    if (当前状态.当前索引 >= 当前章节数据.length) return;

    const 当前节点 = 当前章节数据[当前状态.当前索引];
    if (!当前节点) return;

    if (当前节点.选项?.length > 0 || 当前节点.输入 || 当前节点.调查) {
        return;
    }

    const 正在打字 = document.querySelector(".内容")?.dataset.正在打字 === "true";
    if (正在打字) {
        const 完整内容 = document.querySelector(".内容")?.dataset.完整内容 || "";
        if (完整内容.includes('<wait')) {
            return;
        }
        停止打字效果();
        return;
    }

    if (当前状态.快进模式) {
        停止快进();
    }

    if (当前状态.自动节点 > 0) {
        return;
    }

    if (当前状态.当前索引 < 当前章节数据.length - 1) {
        当前状态.当前索引++;
        更新场景(当前章节数据[当前状态.当前索引]);
    }
}

// ====================== 存档系统 ======================
function 生成存档快照() {
    return {
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
        背景: 当前状态.背景,
        背景媒体: {
            ...当前状态.背景媒体
        },
        标题: {
            ...当前状态.标题
        },
        头像: {
            ...当前状态.头像
        },
        立绘: {
            左立绘: {
                ...当前状态.左立绘,
                媒体: {
                    ...(当前状态.左立绘?.媒体 || {})
                }
            },
            中立绘: {
                ...当前状态.中立绘,
                媒体: {
                    ...(当前状态.中立绘?.媒体 || {})
                }
            },
            右立绘: {
                ...当前状态.右立绘,
                媒体: {
                    ...(当前状态.右立绘?.媒体 || {})
                }
            }
        },
        音乐: 当前状态.音乐,
        自动节点: 当前状态.自动节点,
        逐字显示: {
            启用: 当前状态.逐字显示.启用,
            速度: 当前状态.逐字显示.速度
        },
        用户变量: JSON.parse(JSON.stringify(当前状态.用户变量)),
        打字音效: {
            启用: 当前状态.打字音效.启用,
            路径: 当前状态.打字音效.路径,
            音量: 当前状态.打字音效.音量,
            间隔字符数: 当前状态.打字音效.间隔字符数
        }
    };
}

function 恢复存档状态(存档, 保留历史 = false) {
    if (!保留历史) 清空历史记录();

    if (当前状态.自动节点定时器) {
        clearTimeout(当前状态.自动节点定时器);
        当前状态.自动节点定时器 = null;
    }
    停止打字效果();
    停止快进();
    当前状态.快进模式 = false;

    const 已有头像容器 = document.getElementById("对话框头像容器");
    if (已有头像容器) 已有头像容器.remove();

    const 已有调查层 = document.getElementById("调查层");
    if (已有调查层) 已有调查层.remove();

    document.body.style.cursor = "default";

    const 存档按钮 = document.getElementById("存档按钮");
    const 返回按钮 = document.getElementById("返回按钮");
    if (存档按钮) 存档按钮.classList.remove("隐藏");
    if (返回按钮) 返回按钮.classList.add("隐藏");

    清除所有动画();

    const 初始 = 读取配置("初始状态");
    当前状态 = {
        ...JSON.parse(JSON.stringify(初始)),
        当前章节: 存档.章节 || "初遇",
        当前索引: 存档.索引 || 0,
        背景: 存档.背景 || "#222",
        背景媒体: 存档.背景媒体 || {
            循环: true,
            播放次数: -1,
            播放间隔: 0,
            音量: 1,
        },
        标题: 存档.标题 || {
            显示: false
        },
        头像: 存档.头像 || {
            显示: false
        },
        立绘: 存档.立绘 || {
            左立绘: {
                显示: false,
                路径: "",
                媒体: {
                    循环: true,
                    播放次数: -1,
                    播放间隔: 0,
                    音量: 1
                },
            },
            中立绘: {
                显示: false,
                路径: "",
                媒体: {
                    循环: true,
                    播放次数: -1,
                    播放间隔: 0,
                    音量: 1
                },
            },
            右立绘: {
                显示: false,
                路径: "",
                媒体: {
                    循环: true,
                    播放次数: -1,
                    播放间隔: 0,
                    音量: 1
                },
            },
        },
        音乐: 存档.音乐 || null,
        自动节点: 存档.自动节点 || 0,
        逐字显示: {
            ...初始.逐字显示,
            ...(存档.逐字显示 || {}),
        },
        用户变量: 存档.用户变量 || {},
        打字音效: {
            ...初始.打字音效,
            ...(存档.打字音效 || {}),
        },
    };

    当前状态.标签表 = 建立标签表(章节库[当前状态.当前章节]);

    document.body.style.background = 当前状态.背景 || "#222";

    if (存档.标题?.显示) {
        const 标题容器 = document.getElementById("标题容器");
        if (标题容器) {
            标题容器.textContent = 存档.标题.内容 || "";
            const 位置类列表 = [
                "标题位置-上", "标题位置-下", "标题位置-左", "标题位置-右",
                "标题位置-左上", "标题位置-左下", "标题位置-右上", "标题位置-右下", "标题位置-中",
            ];
            位置类列表.forEach((类名) => 标题容器.classList.remove(类名));
            标题容器.classList.add(`标题位置-${存档.标题.位置 || "中"}`);
            if (存档.标题.样式) {
                Object.entries(存档.标题.样式).forEach(([属性, 值]) => {
                    标题容器.style[属性] = 值;
                });
            }
            标题容器.classList.remove("隐藏");
            标题容器.classList.add("标题进入");
        }
    }

    ["左立绘", "中立绘", "右立绘"].forEach((位置) => {
        const 元素 = document.getElementById(位置);
        const 存档数据 = 存档.立绘?.[位置] || {
            显示: false,
            路径: "",
            媒体: {
                循环: true,
                播放次数: -1,
                播放间隔: 0,
                音量: 1
            },
        };
        当前状态[位置] = {
            ...存档数据,
            媒体: 存档数据.媒体 || {
                循环: true,
                播放次数: -1,
                播放间隔: 0,
                音量: 1
            },
        };
        if (元素) {
            元素.src = 存档数据.路径 || "";
            元素.style.opacity = 存档数据.显示 ? 1 : 0;
        }
    });

    if (存档.头像?.显示 && 存档.头像.路径) {
        当前状态.头像 = {
            显示: 存档.头像.显示,
            路径: 存档.头像.路径,
            位置: 存档.头像.位置 || "左",
        };
        const 左边容器 = document.getElementById("左边头像容器");
        const 右边容器 = document.getElementById("右边头像容器");
        if (左边容器 && 右边容器) {
            左边容器.classList.add("隐藏");
            右边容器.classList.add("隐藏");
            左边容器.innerHTML = "";
            右边容器.innerHTML = "";
            const 目标容器 = 当前状态.头像.位置 === "左" ? 左边容器 : 右边容器;
            目标容器.classList.remove("隐藏");
            const 图片元素 = document.createElement("img");
            图片元素.src = 当前状态.头像.路径;
            目标容器.appendChild(图片元素);
        }
    }

    const 播放器 = document.getElementById("背景音乐");
    if (当前状态.音乐 && 播放器) {
        播放器.src = 当前状态.音乐;
        播放器.volume = 1;
    } else if (播放器) {
        播放器.pause();
        播放器.currentTime = 0;
        播放器.removeAttribute("src");
    }

    // 读档时设置变量
    const 当前章节数据 = 章节库[当前状态.当前章节];
    const 当前节点 = 当前章节数据?.[当前状态.当前索引];
    if (当前节点?.读档时设置变量) {
        Object.entries(当前节点.读档时设置变量).forEach(([变量路径, 值]) => {
            const 路径数组 = 变量路径.split(".");
            let 当前对象 = 当前状态.用户变量;
            路径数组.slice(0, -1).forEach((段) => {
                if (!当前对象[段]) 当前对象[段] = {};
                当前对象 = 当前对象[段];
            });
            const 最后字段 = 路径数组[路径数组.length - 1];
            if (typeof 值 === "string") {
                const 操作符匹配 = 值.match(/^(\+|\-|\*|\/)=(-?\d+\.?\d*)/);
                if (操作符匹配) {
                    const [_, 操作符, 数字] = 操作符匹配;
                    const 当前值 = parseFloat(当前对象[最后字段] || 0);
                    const 数值 = parseFloat(数字);
                    switch (操作符) {
                        case "+":
                            当前对象[最后字段] = 当前值 + 数值;
                            break;
                        case "-":
                            当前对象[最后字段] = 当前值 - 数值;
                            break;
                        case "*":
                            当前对象[最后字段] = 当前值 * 数值;
                            break;
                        case "/":
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
    const 存储键名 = 读取配置('存储键名');
    显示提示(`${获取界面文字('已保存') || '已保存'} ${存档位}`);
    const 存档数据 = 生成存档快照();
    localStorage.setItem(`${存储键名.手动存档前缀}${存档位}`, JSON.stringify(存档数据));
    更新存档显示(存档位);
}

function 更新存档显示(存档位) {
    const 存储键名 = 读取配置('存储键名');
    const 是自动存档 = 存档位 === 'auto';
    const 存档键名 = 是自动存档 ? 存储键名.自动存档 : `${存储键名.手动存档前缀}${存档位}`;
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
    const 存储键名 = 读取配置('存储键名');
    const 存档键名 = 存档位 === 'auto' ? 存储键名.自动存档 : `${存储键名.手动存档前缀}${存档位}`;
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

function 加载自动存档() {
    加载存档('auto');
}

function 加载指定存档(存档标识) {
    const 存储键名 = 读取配置('存储键名');
    const 是自动存档 = 存档标识 === 'auto';
    const 存档键名 = 是自动存档 ? 存储键名.自动存档 : `${存储键名.手动存档前缀}${存档标识}`;
    const 存档数据 = localStorage.getItem(存档键名);
    if (!存档数据) {
        alert(是自动存档 ? '未找到自动存档' : `存档位${存档标识}为空`);
        切换章节('序章', 0);
        return;
    }
    try {
        const 存档 = JSON.parse(存档数据);
        恢复存档状态(存档);
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