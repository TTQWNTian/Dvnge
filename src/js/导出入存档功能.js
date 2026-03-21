/* TTQ视觉小说引擎v1.7.0-dev */
/* js/导出入存档功能.js */
/* 存档导出入功能 */
function 导出存档() {
    // 收集所有存档数据
    const 所有存档 = {
        手动存档_1: localStorage.getItem('手动存档_1'),
        手动存档_2: localStorage.getItem('手动存档_2'),
        自动存档: localStorage.getItem('自动存档'),
        CG收集库: localStorage.getItem('Dvnge视觉小说引擎_CG收集库'),
        用户变量库: localStorage.getItem('Dvnge视觉小说引擎_用户变量库'),
        已选选项记录: localStorage.getItem('已选选项记录'),
        导出时间: new Date().toLocaleString()
    };
    
    // 转换为JSON字符串
    const 存档JSON = JSON.stringify(所有存档, null, 2);
    
    // 创建下载链接
    const 下载链接 = document.createElement('a');
    下载链接.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(存档JSON);
    下载链接.download = `Dvnge存档_${new Date().toISOString().slice(0,10)}.json`;
    下载链接.click();
}

function 导入存档(event) {
    const 文件 = event.target.files[0];
    if (!文件) return;
    
    const 读取器 = new FileReader();
    读取器.onload = function(e) {
        try {
            const 导入数据 = JSON.parse(e.target.result);
            
            // 恢复各个存档项
            if (导入数据.手动存档_1) {
                localStorage.setItem('手动存档_1', 导入数据.手动存档_1);
            }
            if (导入数据.手动存档_2) {
                localStorage.setItem('手动存档_2', 导入数据.手动存档_2);
            }
            if (导入数据.自动存档) {
                localStorage.setItem('自动存档', 导入数据.自动存档);
            }
            if (导入数据.CG收集库) {
                localStorage.setItem('Dvnge视觉小说引擎_CG收集库', 导入数据.CG收集库);
            }
            if (导入数据.用户变量库) {
                localStorage.setItem('Dvnge视觉小说引擎_用户变量库', 导入数据.用户变量库);
            }
            if (导入数据.已选选项记录) {
                localStorage.setItem('已选选项记录', 导入数据.已选选项记录);
            }
            
            显示提示('存档导入成功');
            
            // 刷新存档显示
            if (!document.getElementById('存档界面').classList.contains('隐藏')) {
                更新存档显示('auto');
                for (let i = 1; i <= 最大存档位; i++) {
                    更新存档显示(i);
                }
            }
            
        } catch (错误) {
            console.error('导入失败:', 错误);
            显示提示('存档导入失败');
        }
    };
    读取器.readAsText(文件);
}