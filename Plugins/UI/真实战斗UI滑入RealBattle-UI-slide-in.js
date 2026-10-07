/*--------------------------------------------------------------------------  
真实战斗UI滑入 / Real Battle UI Slide-In

受MarkyJoe的角色菜单组件滑入插件启发。
为真实战斗界面添加上下滑入动画。

Inspired by MarkyJoe's unit-menu-smooth-swipe plugin.
Adds a slide-in animation to the real battle UI:
the upper frame slides in from the top, and the lower frame from the bottom.

Made by Katafract.
--------------------------------------------------------------------------*/

(function() {
    //----------------------------------------------------
    // 可调参数区 / Adjustable Parameters
    //----------------------------------------------------
    var SLIDE_MAX_FRAMES  = 30;    // 滑动总帧数（越大越慢）
    // Total number of frames for the slide animation (larger = slower).

    var SLIDE_SPEED       = 10;    // 每帧移动像素（越大越快）
    // Vertical movement in pixels per frame (larger = faster).

    var SLIDE_WAIT_FRAMES = 30;    // 滑动前等待帧数（等待时不绘制UI）
    // Frames to wait before starting the slide-in (UI not drawn during wait).

    //----------------------------------------------------
    // 初始化：战斗开始时 / Initialization when battle starts
    //----------------------------------------------------
    var aliasSet = UIBattleLayout.setBattlerAndParent;
    UIBattleLayout.setBattlerAndParent = function(battlerRight, battlerLeft, realBattle) {
        aliasSet.call(this, battlerRight, battlerLeft, realBattle);
        this._slideFrame = 0;
        this._slideWait  = 0;
    };

    //----------------------------------------------------
    // 每帧更新：推进等待或滑动
    // Per-frame update: handle waiting and sliding progress
    //----------------------------------------------------
    var aliasMove = UIBattleLayout.moveBattleLayout;
    UIBattleLayout.moveBattleLayout = function() {
        if (this._slideWait < SLIDE_WAIT_FRAMES) {
            this._slideWait++;
        }
        else if (this._slideFrame < SLIDE_MAX_FRAMES) {
            this._slideFrame++;
        }
        return aliasMove.call(this);
    };

    //----------------------------------------------------
    // 绘制阶段：延迟显示 + 滑入动画（仅背景UI框）
    // Draw phase: delayed appearance + slide-in (background frames only)
    //----------------------------------------------------
    var aliasDrawFrame = UIBattleLayout._drawFrame;
    UIBattleLayout._drawFrame = function(isTop) {
        // 等待阶段：不绘制任何UI / Do not draw UI during waiting phase
        if (this._slideWait < SLIDE_WAIT_FRAMES) {
            return;
        }

        // 计算滑入偏移 / Calculate vertical offset
        var offset = 0;
        if (this._slideFrame < SLIDE_MAX_FRAMES) {
            var diff = SLIDE_MAX_FRAMES - this._slideFrame;
            offset = diff * SLIDE_SPEED;
        }

        // hook drawImage，在绘制时添加Y轴偏移
        // Temporarily hook drawImage to apply vertical offset
        var _origDraw = GraphicsRenderer.drawImage;
        GraphicsRenderer.drawImage = function(x, y, handle, type) {
            _origDraw.call(this, x, y + (isTop ? -offset : offset), handle, type);
        };

        aliasDrawFrame.call(this, isTop);

        // 恢复原函数 / Restore original drawImage
        GraphicsRenderer.drawImage = _origDraw;
    };

    //----------------------------------------------------
    // 滑动期间隐藏其他UI元素
    // Hide other UI elements (faces, HP bars, names, etc.) during slide
    //----------------------------------------------------
    var list = [
        "_drawNameArea",
        "_drawWeaponArea",
        "_drawFaceArea",
        "_drawHpArea",
        "_drawInfoArea"
    ];

    list.forEach(function(fname) {
        if (typeof UIBattleLayout[fname] !== "function") return;
        var alias = UIBattleLayout[fname];
        UIBattleLayout[fname] = function() {
            // 滑动前或滑动中 → 不绘制
            // Skip drawing before or during slide animation
            if (this._slideWait < SLIDE_WAIT_FRAMES) return;
            if (this._slideFrame < SLIDE_MAX_FRAMES) return;
            return alias.apply(this, arguments);
        };
    });
})();
