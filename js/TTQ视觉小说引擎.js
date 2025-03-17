// TTQ视觉小说引擎.js
// 版本: 1.0.0
// 开发者: Tian
'use strict';

// ======================
// 全局配置
// ======================
const 章节库 = {
  "序章": typeof 序章数据 !== 'undefined' ? 序章数据 : [],
  "第一章": typeof 第一章数据 !== 'undefined' ? 第一章数据 : []
};

const 初始状态 = {
  当前章节: "序章",
  当前索引: 0,
  背景: "#222",
  左立绘: { 显示: false, 路径: "" },
  中立绘: { 显示: false, 路径: "" },
  右立绘: { 显示: false, 路径: "" },
  音乐: null
};

let 当前状态 = JSON.parse(JSON.stringify(初始状态));

// ======================
// 核心引擎函数
// ======================
function 切换章节(新章节名称, 起始索引 = 0) {
  const 播放器 = document.getElementById('背景音乐');
  if (当前状态.音乐) {
    播放器.pause();
    播放器.src = '';
  }

  // 重置状态
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

  // 背景更新
  if (节点.背景) {
    const 背景图 = `url('${节点.背景}') center/cover`;
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
      元素.src = 新设置.路径;
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
    if (节点.音乐) {
      if (音乐播放器.src !== 节点.音乐) {
        音乐播放器.pause();
        音乐播放器.src = 节点.音乐;
        音乐播放器.play().catch(() => console.log('等待用户交互后自动播放'));
      }
      当前状态.音乐 = 节点.音乐;
    } else {
      音乐播放器.pause();
      音乐播放器.currentTime = 0;
      音乐播放器.removeAttribute('src');
      当前状态.音乐 = null;
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
      
      // 更新对话内容
      const 角色元素 = 容器.querySelector('.角色');
      const 内容元素 = 容器.querySelector('.内容');
      角色元素.textContent = 节点.角色 || '';
      内容元素.textContent = 节点.内容 || '';
      角色元素.style.display = 节点.角色 ? 'block' : 'none';

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
        document.removeEventListener('click', 处理全局点击);
      };

      if (getComputedStyle(容器).display === 'none') {
        隐藏对话框();
      } else {
        容器.style.animation = '淡出动画 0.3s ease forwards';
        容器.addEventListener('animationend', 隐藏对话框, { once: true });
      }
    }
  }
}


// ======================
// 选项处理系统
// ======================
function 处理选项点击(选项) {
  // 优先执行自定义动作
  if (typeof 选项.动作 === 'function') {
    return 选项.动作();
  }

  // 处理存档等
  if (typeof 选项.目标 === 'string') {
    switch(选项.目标) {
      case '打开存档界面':
        return 打开存档界面();
      case '关闭存档界面':
        return 关闭存档界面();
      default:
        console.warn('未知指令:', 选项.目标);
    }
  }

  // 处理跳转等
  if (选项.跳转) {
    切换章节(选项.跳转.章节, 选项.跳转.索引 || 0);
  } else if (typeof 选项.目标 === 'number') {
    当前状态.当前索引 = 选项.目标;
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
    音乐: 当前状态.音乐
  };
}

// ======================
// 存档系统
// ======================
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
  存档项.innerHTML = 数据 
    ? `<span>${JSON.parse(数据).时间}</span><button class="加载按钮">加载</button>`
    : `<span>空存档位${存档位}</span>`;

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
    切换章节(存档.章节, 存档.索引);
    document.body.style.background = 存档.背景;

    // 恢复立绘状态
    ['左立绘', '中立绘', '右立绘'].forEach(位置 => {
      const 元素 = document.getElementById(位置);
      const 存档数据 = 存档.立绘[位置] || { 显示: false, 路径: "" };
      
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
    if (存档.音乐) {
      播放器.src = 存档.音乐;
      播放器.play();
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

  // 初始化游戏
  try {
    if (章节库.序章?.length) {
      切换章节('序章', 0);
    } else {
      throw new Error("缺少序章数据");
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
