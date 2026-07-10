# Dvnge 更新日志

## v1.9.3-dev
### 新增
- 增加自创的`.dvns`语法
- 增加一堆bug
- 合并 `样式配置.js` 和 `语言配置.js` 到 `游戏配置.js`

### 修复
- 一些bug

### 更改
- 把引擎中的 `new Date().toLocaleString(),` 全部换成 `new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })` ，不带秒数。

### 相关修改文件
- js/TTQ视觉小说引擎.js
- game.html
### 删除文件
- js/样式配置.js
- js/语言配置.js
### 新增文件
- js/游戏配置.js