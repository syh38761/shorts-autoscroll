// --- 0. 权限检查 ---
auto.waitFor(); 

// --- 1. 全局变量 ---
var logHistory = []; 
var MAX_LOG_LINES = 20; 
var totalActiveTime = 0; 
var isPaused = true; 

// --- 2. 辅助函数 ---
function logToWindow(msg) {
    if (typeof window === 'undefined' || window === null) return;
    ui.run(function() {
        var time = new Date().toLocaleTimeString(); 
        var logMsg = time + ": " + msg;
        logHistory.push(logMsg); 
        if (logHistory.length > MAX_LOG_LINES) { logHistory.shift(); }
        window.logText.setText(logHistory.join("\n"));
    });
}

function formatMillis(ms) {
    var s = Math.floor((ms / 1000) % 60), m = Math.floor((ms / (1000 * 60)) % 60), h = Math.floor(ms / (1000 * 60 * 60)); 
    return (h<10?'0':'')+h+":"+(m<10?'0':'')+m+":"+(s<10?'0':'')+s;
}

// --- 3. 参数设置 ---
var minSec = parseInt(dialogs.rawInput("最小等待（秒）", "5")) || 5;
var maxSec = parseInt(dialogs.rawInput("最大等待（秒）", "15")) || 15;
var autoStopMinutes = parseInt(dialogs.rawInput("运行分钟数 (0不限制)", "0")) || 0;
var autoStopMillis = autoStopMinutes * 60 * 1000;

// --- 4. 强力滑动函数 ---
function superSwipe() {
    var sw = device.width;
    var sh = device.height;

    // 加大纵向距离：从 90% 处划到 10% 处
    var x1 = sw / 2 + random(-50, 50);
    var y1 = sh * 0.9 + random(-10, 10);
    var x2 = sw / 2 + random(-50, 50);
    var y2 = sh * 0.1 + random(-10, 10);
    var duration = random(600, 1000); // 增加时长

    logToWindow("执行强力滑动...");
    
    // 模拟曲线滑动轨迹
    gestures([0, duration, [x1, y1], [x1 + random(-100, 100), (y1 + y2) / 2], [x2, y2]]);
    
    sleep(800); // 滑动后缓冲

    // 随机补偿滑动
    if (random(0, 10) > 6) {
        logToWindow("触发补滑...");
        gesture(200, [sw/2, sh*0.7], [sw/2, sh*0.4]);
        sleep(400);
    }
}

// --- 5. 修复版悬浮窗 (极致简化 UI 以防报错) ---
var window = floaty.window(
    <frame background="#CC000000">
        <vertical padding="10">
            <text id="title" text="滑动器(点此拖动)" textColor="#FFFFFF" textSize="16sp" />
            <text id="runtimeInfo" text="运行: 00:00:00" textColor="#FFD700" />
            
            <scroll height="80" margin="5 0">
                <text id="logText" text="准备就绪" textColor="#EEEEEE" textSize="10sp" />
            </scroll>

            <horizontal>
                <button id="pauseButton" text="开始" layout_weight="1" />
                <button id="stopButton" text="退出" layout_weight="1" />
            </horizontal>
        </vertical>
    </frame>
);

// 悬浮窗拖动逻辑
var x = 0, y = 0, wx, wy;
window.title.setOnTouchListener(function(v, e) {
    switch (e.getAction()) {
        case e.ACTION_DOWN: x = e.getRawX(); y = e.getRawY(); wx = window.getX(); wy = window.getY(); return true;
        case e.ACTION_MOVE: window.setPosition(wx + (e.getRawX() - x), wy + (e.getRawY() - y)); return true;
    }
    return true;
});

// --- 6. 主逻辑线程 ---
var mainThread = threads.start(function() {
    while (true) {
        if (isPaused) { sleep(500); continue; }

        superSwipe();

        var delay = random(minSec * 1000, maxSec * 1000);
        var steps = Math.floor(delay / 1000);
        for (var i = steps; i > 0; i--) {
            if (isPaused) break;
            logToWindow("等待下次: " + i + "s");
            sleep(1000);
            if (autoStopMillis > 0 && totalActiveTime >= autoStopMillis) {
                logToWindow("定时已到，停止中");
                exit();
            }
        }
    }
});

// --- 7. 控制交互 ---
window.pauseButton.click(function() {
    isPaused = !isPaused;
    ui.run(() => { window.pauseButton.setText(isPaused ? "开始" : "暂停"); });
    logToWindow(isPaused ? "已暂停" : "启动中...");
});

window.stopButton.click(function() {
    exit();
});

var lastTick = Date.now();
setInterval(() => {
    if (!isPaused) totalActiveTime += (Date.now() - lastTick);
    lastTick = Date.now();
    ui.run(() => { if(window.runtimeInfo) window.runtimeInfo.setText("运行: " + formatMillis(totalActiveTime)); });
}, 1000);