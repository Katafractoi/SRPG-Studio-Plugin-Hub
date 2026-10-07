/*--------------------------------------------------------------------------
 技能弹出滑入特效 SkillTitlePopUp
 技能发动时，给予弹出或滑入显示的特效
 
 Made By Katafract.
 
 Adds a pop-up or slide-in effect when a skill activates.

 参数说明:
  MODE          = 特效模式选择，1 表示弹出，2 表示滑入
  APPEAR_FRAMES = 弹出动画的持续帧数，数值越大动画越慢
  SLIDE_FRAMES  = 滑入动画的持续帧数，数值越大动画越慢
  SLIDE_FLIP    = 滑入方向翻转，false 为默认方向，true 则左右对调

 Parameter Description:
  MODE          = Effect mode selector, 1 for pop-up, 2 for slide-in
  APPEAR_FRAMES = Duration (frames) of the pop-up effect; higher = slower
  SLIDE_FRAMES  = Duration (frames) of the slide-in effect; higher = slower
  SLIDE_FLIP    = Reverse slide-in direction; false = default, true = mirrored
--------------------------------------------------------------------------*/


(function () {
  // ===== 参数 =====
  var MODE = 2;               // 1=弹出出现; 2=外侧滑入 1=pop up,2=slide in
  var APPEAR_FRAMES = 8;      // 模式1：弹出总帧数（6~10 推荐）frame speed for mode 1
  var SLIDE_FRAMES  = 20;     // 模式2：滑入总帧数（数字越小越快）frame speed for mode 2
  var SLIDE_FLIP    = false;  // 模式2：是否翻转方向（true=左右对调，仅影响进入方向）reverse for mode 2

  // 仅对 MODE=1 弹出阶段生效，可以修正弹出特效的X位置偏移；不影响交回默认后的最终位置
  var APPEAR_X_OFFSET = 0;

  // 仅 MODE=2 & isRight===true 生效）：
  //    右侧单位的滑动“终点”= pos.x + SLIDE_END_OFFSET_RIGHT_X
  //    左侧单位不受影响（保持 pos.x）
  var SLIDE_END_OFFSET_RIGHT_X = 30;  // 将右侧滑入的绘制往右偏移一点避免滑入过多
  var _orig_drawArea = TextCustomEffect._drawArea;

  TextCustomEffect._drawArea = function (active, passive, skillArray, isRight) {
    if (this._battleType !== BattleType.REAL) {
      _orig_drawArea.apply(this, arguments);
      return;
    }

    // 已完成演出：交回默认绘制
    if (this._sta_done === true) {
      _orig_drawArea.apply(this, arguments);
      return;
    }

    var pos    = this._battleObject.getEffectPosFromUnit(null, active);
    var baseX  = pos.x;        // 引擎默认“左基准”（关键）
    var baseY  = pos.y - 40;
    var textui = root.queryTextUI('skill_title');
    var font   = textui.getFont();
    var color  = textui.getColor();
    var pic    = textui.getUIImage();
    var pw     = TitleRenderer.getTitlePartsWidth();
    var ph     = TitleRenderer.getTitlePartsHeight();

    // —— 签名（技能/模式/翻转变化重置）
    var sig = '';
    var len = skillArray ? skillArray.length : 0;
    for (var i = 0; i < len; i++) {
      var s = skillArray[i];
      sig += (s && typeof s.getName === 'function') ? s.getName() : '';
      sig += '|';
    }
    if (this._sta_sig !== sig || this._sta_mode !== MODE || this._sta_flip !== SLIDE_FLIP) {
      this._sta_sig   = sig;
      this._sta_mode  = MODE;
      this._sta_flip  = SLIDE_FLIP;
      this._sta_ctr   = null;
      this._sta_done  = false;
      this._sta_rows  = null;  // MODE=2 用：每行锚点缓存
    }

    // —— 初始化计时器
    if (!this._sta_ctr) {
      this._sta_ctr = createObject(CycleCounter);
      this._sta_ctr.disableGameAcceleration();
      this._sta_ctr.setCounterInfo(MODE === 1 ? APPEAR_FRAMES : SLIDE_FRAMES);
    }

    var ongoing = (this._sta_ctr.moveCycleCounter() === MoveResult.CONTINUE);

    // ===== MODE 1：弹出（仅底图），结束后下一帧交回默认绘制 =====
    if (MODE === 1) {
      if (pic) {
        var y = baseY;
        for (var k = 0; k < len; k++) {
          var sk    = skillArray[k];
          var parts = this._getTitlePartsCount(sk, font); // 仅用于底图宽
          var fullW = pw * parts;
          var fullH = ph;

          // 仅弹出阶段可整体偏移；交回默认后仍按引擎位置
          var xLeft = baseX + APPEAR_X_OFFSET;

          var cur  = this._sta_ctr.getCounter();
          var curH = Math.max(1, Math.floor(fullH * cur / APPEAR_FRAMES));
          var yStretch = y + Math.floor(fullH / 2) - Math.floor(curH / 2);

          pic.drawStretchParts(xLeft, yStretch, fullW, curH, 0, 0, fullW, fullH);
          y += 40;
        }
      }

      if (ongoing) return;
      this._sta_done = true; // 下一帧交回默认绘制
      return;
    }

    // ===== MODE 2：侧向滑入（底图+图标+文字），结束后下一帧交回默认绘制 =====
    var fromRight = (isRight === true);
    if (SLIDE_FLIP) fromRight = !fromRight;  // 仅影响进入方向，不影响右侧偏移是否应用

    // 画面宽度（用于起点在屏幕外）
    var areaW = (typeof RealBattleArea !== 'undefined' && RealBattleArea.WIDTH)
              ? RealBattleArea.WIDTH
              : root.getGameAreaWidth();

    // —— 首帧：固定每行“终点”和“起点”
    if (!this._sta_rows) {
      this._sta_rows = []; // 每行：{ y, panelW, xEnd, xStart }
      var yInit  = baseY;
      var panelW = this._getWidth();  // 仅用于左侧屏外起点

      // 终点：左侧用 baseX；右侧用 baseX + 偏移（仅 isRight===true 时生效）
      var xEndBase = baseX + (isRight ? SLIDE_END_OFFSET_RIGHT_X : 0);

      for (var r = 0; r < len; r++) {
        var xEnd   = xEndBase;
        var xStart = fromRight ? areaW : -panelW;  // 屏外起点（左右对称）
        this._sta_rows.push({ y: yInit, panelW: panelW, xEnd: xEnd, xStart: xStart });
        yInit += 40;
      }
    }

    // —— 插值绘制
    var tCur = this._sta_ctr.getCounter();
    var tMax = SLIDE_FRAMES;
    var t    = tCur / tMax;

    for (var j = 0; j < len; j++) {
      var row   = this._sta_rows[j];
      var sj    = skillArray[j];
      var xEnd  = row.xEnd;
      var xStart= row.xStart;
      var xNow  = Math.round(xStart + (xEnd - xStart) * t);

      // 方向夹紧，避免“过头”
      if (fromRight && xNow < xEnd) xNow = xEnd;
      if (!fromRight && xNow > xEnd) xNow = xEnd;

      // 底图：宽度按文本 parts 画；左边界用 xNow
      var parts = this._getTitlePartsCount(sj, font);
      if (pic) {
        TitleRenderer.drawTitleNoCache(pic, xNow, row.y, pw, ph, parts);
      }

      // 图标+文字：默认基准（xNow, y 居中）
      var yBase = row.y + Math.floor((ph - GraphicsFormat.ICON_HEIGHT) / 2);
      SkillRenderer.drawSkill(xNow, yBase, sj, color, font);
    }

    if (ongoing) return;
    this._sta_done = true;   // 完成：下一帧交回默认绘制
    return;
  };
})();
