/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025-2026 Tian
 */
'use strict';

// ====================== 跳转函数 ======================
function 处理跳转(目标) {
    if (typeof 目标 === 'number') {
        当前状态.当前索引 = 目标;
        继续剧情();
    } else if (目标?.章节) {
        let 目标索引 = 目标.索引 ?? 0;
        const 目标章节数据 = 章节库[目标.章节];
        if (目标.标签 && 目标章节数据) {
            const 标签表 = 建立标签表(目标章节数据);
            目标索引 = 标签表[目标.标签] ?? 0;
        } else if (typeof 目标索引 === 'string' && 目标章节数据) {
            const 标签表 = 建立标签表(目标章节数据);
            目标索引 = 标签表[目标索引] ?? 0;
        }
        切换章节(目标.章节, 目标索引);
    } else if (typeof 目标 === 'string') {
        当前状态.当前索引 = 当前状态.标签表[目标] ?? 当前状态.当前索引 + 1;
        继续剧情();
    } else if (!目标) {
        当前状态.当前索引++;
        继续剧情();
    }
}

// ====================== 多语言系统 ======================
function 切换语言(新语言代码) {
    if (!语言配置表 || !语言配置表.语言列表[新语言代码]) return;
    if (当前语言 === 新语言代码) return;
    if (正在切换语言) return;

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
        正在切换语言 = true;
        delete 章节库[当前章节];
        加载章节(当前章节).then(() => {
            切换章节(当前章节, 当前索引);
            正在切换语言 = false;
        }).catch(() => {
            正在切换语言 = false;
        });
    }

    刷新界面文字();
}

function 刷新界面文字() {
    if (!语言配置表) return;

    const 映射 = {
        '快进按钮': '快进',
        '隐藏对话按钮': '隐藏',
        '历史按钮': '历史',
        '导出存档按钮': '导出存档',
        '导入存档按钮': '导入存档'
    };

    for (const [id, key] of Object.entries(映射)) {
        const el = document.getElementById(id);
        if (el) el.textContent = 获取界面文字(key);
    }

    const 存档标题 = document.querySelector('#存档界面 .标题');
    if (存档标题) 存档标题.textContent = 获取界面文字('存档管理');

    const 历史标题 = document.querySelector('#历史界面 .标题');
    if (历史标题) 历史标题.textContent = 获取界面文字('历史记录');

    const 历史配置 = 读取配置('历史记录配置', {});

    const 历史底部提示 = document.getElementById('历史底部提示');
    if (历史底部提示) {
        if (历史配置.允许回退 !== false) {
            历史底部提示.textContent = 获取界面文字('点击任意记录可回退') || '点击任意记录可回退到该位置';
        } else {
            历史底部提示.textContent = 获取界面文字('历史仅查看') || '历史记录仅供查看';
        }
    }

    const 历史按钮 = document.getElementById('历史按钮');
    if (历史按钮) {
        if (历史配置.启用) {
            历史按钮.classList.remove('隐藏');
        } else {
            历史按钮.classList.add('隐藏');
        }
    }
}

function 获取界面文字(标识) {
    if (!语言配置表 || !当前语言) return 标识;
    if (当前语言 === 语言配置表.默认语言) return 标识;

    const 文字项 = 语言配置表.界面文字?.[标识];
    if (!文字项) return 标识;
    return 文字项[当前语言] || 标识;
}

function 获取本地化文本(节点) {
    if (!节点) return {
        角色: '',
        内容: ''
    };
    if (!语言配置表) return {
        角色: 节点.角色 || '',
        内容: 节点.内容 || ''
    };

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
    const 选项容器 = document.querySelector('#对话框容器 .选项容器, #NVL文本容器 .选项容器');

    const {
        角色,
        内容
    } = 获取本地化文本(当前节点);

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
                if (opt._翻译文本) {
                    选项文本 = opt._翻译文本;
                } else if (当前语言 !== 语言配置表.默认语言) {
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
        const 输入容器 = document.querySelector('#对话框容器 .输入容器, #NVL文本容器 .输入容器');
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