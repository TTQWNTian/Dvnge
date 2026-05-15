/* TTQ视觉小说引擎v1.8.0-dev */
/* js/多语言功能.js */
let 当前语言 = localStorage.getItem('Dvnge_语言') || null;
let 语言配置表 = null;

function 加载语言配置() {
    return new Promise((resolve, reject) => {
        if (语言配置表) {
            resolve(语言配置表);
            return;
        }

        const script = document.createElement('script');
        script.src = 'js/语言配置.js';
        script.onload = () => {
            if (typeof 语言配置 !== 'undefined') {
                语言配置表 = 语言配置;
                if (!当前语言 || !语言配置表.语言列表[当前语言]) {
                    当前语言 = 语言配置表.默认语言;
                }
                resolve(语言配置表);
            } else {
                reject(new Error('语言配置文件加载失败'));
            }
        };
        script.onerror = () => reject(new Error('无法加载语言配置文件'));
        document.head.appendChild(script);
    });
}

function 切换语言(新语言代码) {
    if (!语言配置表 || !语言配置表.语言列表[新语言代码]) return;
    if (当前语言 === 新语言代码) return;

    当前语言 = 新语言代码;
    localStorage.setItem('Dvnge_语言', 当前语言);

    if (当前状态.逐字显示.打字定时器) {
        clearTimeout(当前状态.逐字显示.打字定时器);
        当前状态.逐字显示.打字定时器 = null;
    }
    const 内容元素 = document.querySelector('.内容');
    if (内容元素) 内容元素.dataset.正在打字 = 'false';

    刷新界面文字();
    刷新当前对话();
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
    if (!语言配置表) return 标识;
    if (当前语言 === 语言配置表.默认语言) return 标识;

    const 文字项 = 语言配置表.界面文字[标识];
    if (!文字项) return 标识;
    return 文字项[当前语言] || 文字项[语言配置表.默认语言] || 标识;
}

function 获取本地化文本(节点) {
    if (!节点) return { 角色: '', 内容: '' };

    const 默认语言 = 语言配置表.默认语言;

    if (当前语言 === 默认语言) {
        return {
            角色: 节点.角色 || '',
            内容: 节点.内容 || ''
        };
    }

    const 角色字段 = `角色_${当前语言}`;
    const 内容字段 = `内容_${当前语言}`;
    const 默认角色字段 = `角色_${默认语言}`;
    const 默认内容字段 = `内容_${默认语言}`;

    return {
        角色: 节点[角色字段] || 节点[默认角色字段] || 节点.角色 || '',
        内容: 节点[内容字段] || 节点[默认内容字段] || 节点.内容 || ''
    };
}

function 刷新当前对话() {
    const 当前章节数据 = 章节库[当前状态.当前章节];
    if (!当前章节数据) return;

    const 当前节点 = 当前章节数据[当前状态.当前索引];
    if (!当前节点) return;

    const 容器 = document.getElementById('对话框容器');
    if (!容器) return;

    const 角色元素 = 容器.querySelector('.角色');
    const 内容元素 = 容器.querySelector('.内容');
    const 正在打字 = 内容元素?.dataset.正在打字 === 'true';

    const { 角色, 内容 } = 获取本地化文本(当前节点);

    if (角色元素) {
        let 处理后的角色 = 角色.replace(/{([^}]+)}/g, (m, v) => {
            let val = 当前状态.用户变量;
            v.split('.').forEach(k => val = val?.[k]);
            return val || '';
        });
        角色元素.innerHTML = 处理后的角色;
        角色元素.style.display = 处理后的角色 ? 'block' : 'none';
        if (typeof 应用角色样式 === 'function') 应用角色样式();
    }

    if (!正在打字 && 内容元素) {
        let 处理后的内容 = 内容.replace(/{([^}]+)}/g, (m, v) => {
            let val = 当前状态.用户变量;
            v.split('.').forEach(k => val = val?.[k]);
            return val || '';
        });
        内容元素.innerHTML = 处理后的内容;
    }

    if (当前节点.选项 && 当前节点.选项.length > 0) {
        const 选项容器 = 容器.querySelector('.选项容器');
        const 按钮列表 = 选项容器?.querySelectorAll('.选项按钮');
        当前节点.选项.forEach((opt, i) => {
            if (按钮列表?.[i]) {
                let 文本 = '';
                if (当前语言 !== 语言配置表.默认语言) {
                    const 选项字段 = `文本_${当前语言}`;
                    文本 = opt[选项字段] || opt[`文本_${语言配置表.默认语言}`] || opt.文本 || '';
                } else {
                    文本 = opt.文本 || '';
                }
                文本 = 文本.replace(/{([^}]+)}/g, (m, v) => {
                    let val = 当前状态.用户变量;
                    v.split('.').forEach(k => val = val?.[k]);
                    return val !== undefined ? val : '';
                });
                按钮列表[i].textContent = 文本;
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

            const 占位符元素 = 输入容器.querySelector('.输入框');
            if (占位符元素 && 当前节点.输入.占位符) {
                let 占位符文本 = '';
                if (当前语言 !== 语言配置表.默认语言) {
                    const 占位符字段 = `占位符_${当前语言}`;
                    占位符文本 = 当前节点.输入[占位符字段] || 当前节点.输入[`占位符_${语言配置表.默认语言}`] || 当前节点.输入.占位符;
                } else {
                    占位符文本 = 当前节点.输入.占位符;
                }
                占位符元素.placeholder = 占位符文本;
            }

            const 按钮元素 = 输入容器.querySelector('.输入确认按钮');
            if (按钮元素 && 当前节点.输入.按钮文字) {
                let 按钮文本 = '';
                if (当前语言 !== 语言配置表.默认语言) {
                    const 按钮字段 = `按钮文字_${当前语言}`;
                    按钮文本 = 当前节点.输入[按钮字段] || 当前节点.输入[`按钮文字_${语言配置表.默认语言}`] || 当前节点.输入.按钮文字;
                } else {
                    按钮文本 = 当前节点.输入.按钮文字;
                }
                按钮元素.textContent = 按钮文本;
            }
        }
    }
}