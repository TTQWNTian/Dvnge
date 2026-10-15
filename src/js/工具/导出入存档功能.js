/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025-2026 Tian
 */
/*
 * v1.10.0-dev
 * 开发者: Tian
 */
function 导出存档() {
    const 存储键名 = 读取配置('存储键名');
    const 最大位 = 读取配置('最大存档位', 2);
    const 所有存档 = {
        自动存档: localStorage.getItem(存储键名.自动存档),
        CG收集库: localStorage.getItem(存储键名.CG),
        用户变量库: localStorage.getItem(存储键名.用户变量),
        已选选项记录: localStorage.getItem(存储键名.已选选项),
        导出时间: new Date().toLocaleString()
    };
    for (let i = 1; i <= 最大位; i++) {
        所有存档[`手动存档_${i}`] = localStorage.getItem(`${存储键名.手动存档前缀}${i}`);
    }
    
    // 转换为JSON字符串
    const 存档JSON = JSON.stringify(所有存档, null, 2);
    
    // 创建下载链接
    const 下载链接 = document.createElement('a');
    下载链接.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(存档JSON);
    下载链接.download = `Dvnge存档_${new Date().toISOString().slice(0,10)}.json`;
    下载链接.click();
}

function 触发导入存档() {
    const 输入框 = document.getElementById('导入文件');
    if (!输入框) return;
    // 先清空，保证选同一个文件也能触发 change
    输入框.value = '';
    输入框.click();
}

function 导入存档(event) {
    const 文件 = event.target.files && event.target.files[0];
    if (!文件) return;
    
    const 读取器 = new FileReader();
    读取器.onload = function(e) {
        try {
            const 导入数据 = JSON.parse(e.target.result);
            const 存储键名 = 读取配置('存储键名');
            const 最大位 = 读取配置('最大存档位', 2);
            
            let 导入数量 = 0;
            
            // 恢复各个存档项
            for (let i = 1; i <= 最大位; i++) {
                if (导入数据[`手动存档_${i}`]) {
                    localStorage.setItem(`${存储键名.手动存档前缀}${i}`, 导入数据[`手动存档_${i}`]);
                    导入数量++;
                }
            }
            if (导入数据.自动存档) {
                localStorage.setItem(存储键名.自动存档, 导入数据.自动存档);
                导入数量++;
            }
            if (导入数据.CG收集库) {
                localStorage.setItem(存储键名.CG, 导入数据.CG收集库);
            }
            if (导入数据.用户变量库) {
                localStorage.setItem(存储键名.用户变量, 导入数据.用户变量库);
            }
            if (导入数据.已选选项记录) {
                localStorage.setItem(存储键名.已选选项, 导入数据.已选选项记录);
            }
            
            // 无论存档界面是否打开，都刷新一遍存档列表
            更新所有存档项显示文字();
            
            显示提示(`存档导入成功（${导入数量} 个）`);
            
        } catch (错误) {
            console.error('导入失败:', 错误);
            显示提示('存档导入失败');
        } finally {
            // 清空 input，允许重复选择同一文件
            event.target.value = '';
        }
    };
    读取器.onerror = function() {
        显示提示('存档读取失败');
        event.target.value = '';
    };
    读取器.readAsText(文件);
}