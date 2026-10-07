/*--------------------------------------------------------------------------
 武器道具技能图标另行显示Extra Skill Row for Equipment/Item Skills V1.1

 1. 在单位菜单中，原有技能列表不再显示来自武器或道具的技能。
 2. 武器 / 道具附带的技能会在技能区域下方另起一行进行显示。
 
 ※ 注意：
   本插件会改写单位菜单中技能图标的显示逻辑，
   若与其他同样修改技能图标显示方式的插件同时使用，
   可能产生冲突，请谨慎使用。

 --------------------------------------------------------------------------
 
 Extra Skill Row for Equipment / Item Skills
 
 1. Skills granted by weapons or items are hidden from the main skill list.
 2. Weapon / item skills are displayed in a separate row below the main skill area.

 ※ Note:
   This plugin modifies how skill icons are displayed in the unit menu.
   Using it together with other plugins that alter skill icon display
   may cause conflicts. Please use with caution.

 made by Katafract
 
 --------------------------------------------------------------------------
 2025-12-14
 Bugfix (V1.1):
 - 修复在某些工程环境中，设置为“菜单隐藏”的技能仍会被绘制的问题。
   
 Bugfix (V1.1):
 - Fixed an issue where skills marked as "hidden in menu" could still be displayed under certain project setups.

--------------------------------------------------------------------------*/

(function () {

 /* ======================
   * 配置  Configuration
   * ====================== */
  var EXTRA_COL = 8;//该行最多显示多少图标  Maximum number of icons shown in the extra skill row
  var EXTRA_OFFSET_X = 0;//X偏移 position X offset
  var EXTRA_OFFSET_Y = 30;//Y偏移 position Y offset
  var STEP_X = GraphicsFormat.ICON_WIDTH + 6;//技能图标间距 spacing between icons,default is 6

  /* ======================
   * 判定：entry 是否来自武器/道具
   * ====================== */
  function isEquipSource(entry) {
    if (!entry) return false;

    if (typeof ObjectType !== 'undefined' && typeof entry.objecttype !== 'undefined') {
      return entry.objecttype === ObjectType.WEAPON || entry.objecttype === ObjectType.ITEM;
    }

    // 兜底：看 object 本体
    var obj = entry.object;
    if (obj) {
      if (typeof obj.isWeapon === 'function') return obj.isWeapon();
      if (typeof ItemControl !== 'undefined') {
        if (typeof ItemControl.isWeapon === 'function' && ItemControl.isWeapon(obj)) return true;
        if (typeof ItemControl.isItem === 'function' && ItemControl.isItem(obj)) return true;
      }
    }

    return false;
  }

  /* ======================
   * 从 SkillInteraction 的 scrollbar 里取出当前的 entry 数组
   *（这是“已经被引擎/别的插件过滤过”的最终结果）
   * ====================== */
  function getSkillEntryArrayFromSkillInteraction(win) {
    if (!win || !win._skillInteraction) return [];
    var sb = win._skillInteraction.getInteractionScrollbar();

    // 大多数版本：内部就是 _objectArray
    if (sb && sb._objectArray) {
      return sb._objectArray;
    }

    // 兜底：尝试公开接口
    if (sb && typeof sb.getObjectArray === 'function') {
      return sb.getObjectArray() || [];
    }

    // 再兜底：用 count + 逐个取
    var out = [];
    if (sb && typeof sb.getObjectCount === 'function') {
      var c = sb.getObjectCount();
      for (var i = 0; i < c; i++) {
        var obj = null;
        if (typeof sb.getObjectFromIndex === 'function') obj = sb.getObjectFromIndex(i);
        else if (typeof sb.getObject === 'function') {
          // getObject() 通常是当前 index 的，不适合遍历；这里尽量不走这条
          obj = null;
        }
        if (obj) out.push(obj);
      }
    }
    return out;
  }

  /* ======================
   * 把主栏数组写回 scrollbar
   * ====================== */
  function setSkillEntryArrayToSkillInteraction(win, arr) {
    var sb = win._skillInteraction.getInteractionScrollbar();

    if (typeof sb.setObjectArray === 'function') {
      sb.setObjectArray(arr);
    } else {
      // 没有 setObjectArray 就用 interaction 的 setSkillArray（它内部也是 setObjectArray）
      win._skillInteraction.setSkillArray(arr);
    }

    if (typeof sb.setIndex === 'function') sb.setIndex(0);
    if (typeof sb.resetPreviousIndex === 'function') sb.resetPreviousIndex();
  }

  /* ======================
   * 隐形 Scrollbar（只负责命中/hover）
   * ====================== */
  var EquipSkillHitboxScrollbar = defineObject(BaseScrollbar, {
    drawScrollContent: function () {},
    drawDescriptionLine: function () {},
    playSelectSound: function () {},

    getObjectWidth: function () {
      return STEP_X;
    },

    getObjectHeight: function () {
      return GraphicsFormat.ICON_HEIGHT;
    },

    drawScrollbar: function (xStart, yStart) {
      xStart += this.getScrollXPadding();
      yStart += this.getScrollYPadding();

      this.xRendering = xStart;
      this.yRendering = yStart;
      MouseControl.saveRenderingPos(this);

      if (!this._isActive || this.getObjectCount() === 0) return;

      var index = this.getIndex();
      if (index < 0) index = 0;

      var x = xStart + index * STEP_X;
      this.drawCursor(x, yStart, true);
    }
  });

  /* ======================
   * Interaction：额外一行的帮助窗
   * ====================== */
  var EquipSkillInteraction = defineObject(BaseInteraction, {
    initialize: function () {
      this._scrollbar = createScrollbarObject(EquipSkillHitboxScrollbar, this);
      this._scrollbar.setScrollFormation(EXTRA_COL, 1);
      this._window = createWindowObject(SkillInfoWindow, this);
    },

    setSkillArray: function (arr) {
      this._scrollbar.setObjectArray(arr || []);
    },

    getHelpText: function () {
      var e = this._scrollbar.getObject();
      return e && e.skill ? e.skill.getDescription() : '';
    },

    _changeTopic: function () {
      var e = this._scrollbar.getObject();
      if (e && e.skill) {
        this._window.setSkillInfoData(e.skill, e.objecttype);
      }
    }
  });

  function getSkillBasePos(win, x, y) {
    var dy = win._itemInteraction.getInteractionScrollbar().getScrollbarHeight() + 14;
    return { x: x + 230, y: y + dy };
  }

  /* ======================
   * 注入：初始化
   * ====================== */
  var _aliasSetUnitMenuData = UnitMenuBottomWindow.setUnitMenuData;
  UnitMenuBottomWindow.setUnitMenuData = function () {
    _aliasSetUnitMenuData.call(this);
    this._equipSkillInteraction = createObject(EquipSkillInteraction);
    this._equipSkillArray = [];
  };

  /* ======================
   * 核心：包装原生 _setSkillData
   * 先让引擎生成“最终主栏数组”（隐藏已处理），再把武器/道具来源搬到额外一行
   * ====================== */
  var _aliasSetSkillData = UnitMenuBottomWindow._setSkillData;
  UnitMenuBottomWindow._setSkillData = function (unit) {
    // ① 先跑原生（或其它插件已经改过的）逻辑 —— 隐藏规则就在这里生效
    _aliasSetSkillData.call(this, unit);

    // ② 拿到“最终主栏数组”
    var arr = getSkillEntryArrayFromSkillInteraction(this);
    if (!arr || arr.length === 0) {
      this._equipSkillArray = [];
      this._equipSkillInteraction.setSkillArray([]);
      return;
    }

    // ③ 分流：主栏保留非武器/道具；额外一行收集武器/道具
    var main = [];
    var equip = [];
    for (var i = 0; i < arr.length; i++) {
      var e = arr[i];
      if (!e || !e.skill) continue;

      if (isEquipSource(e)) equip.push(e);
      else main.push(e);
    }

    // ④ 写回主栏（只改变“展示位置”，不改变隐藏/显示规则）
    setSkillEntryArrayToSkillInteraction(this, main);

    // ⑤ 设置额外一行
    this._equipSkillArray = equip;
    this._equipSkillInteraction.setSkillArray(this._equipSkillArray);
    this._equipSkillInteraction.checkInitialTopic();
  };

  /* ======================
   * move
   * ====================== */
  var _aliasMove = UnitMenuBottomWindow.moveWindowContent;
  UnitMenuBottomWindow.moveWindowContent = function () {
    var r = _aliasMove.call(this);
    this._equipSkillInteraction.moveInteraction();
    return r;
  };

  /* ======================
   * draw：先画额外一行，再画原内容（Tooltip 插件通常在 alias 链后，必定在上层）
   * ====================== */
  var _aliasDraw = UnitMenuBottomWindow.drawWindowContent;
  UnitMenuBottomWindow.drawWindowContent = function (x, y) {

    // 先画额外一行（底层）
    if (this._equipSkillArray && this._equipSkillArray.length > 0) {
      var pos = getSkillBasePos(this, x, y);
      var bx = pos.x + EXTRA_OFFSET_X;
      var by = pos.y + EXTRA_OFFSET_Y;

      this._equipSkillInteraction.getInteractionScrollbar().drawScrollbar(bx, by);

      var count = Math.min(EXTRA_COL, this._equipSkillArray.length);
      for (var i = 0; i < count; i++) {
        var e = this._equipSkillArray[i];
        if (!e || !e.skill) continue;

        GraphicsRenderer.drawImage(
          bx + i * STEP_X,
          by,
          e.skill.getIconResourceHandle(),
          GraphicsType.ICON
        );
      }
    }

    // 再画原本内容（含主栏 + 你的属性 Tooltip 等）
    _aliasDraw.call(this, x, y);
  };

  /* ======================
   * help / info window：额外一行也能出说明
   * ====================== */
  var _aliasIsTracing = UnitMenuBottomWindow.isTracingHelp;
  UnitMenuBottomWindow.isTracingHelp = function () {
    return _aliasIsTracing.call(this) || this._equipSkillInteraction.isTracingHelp();
  };

  var _aliasGetHelpText = UnitMenuBottomWindow.getHelpText;
  UnitMenuBottomWindow.getHelpText = function () {
    if (this._equipSkillInteraction.isTracingHelp()) {
      return this._equipSkillInteraction.getHelpText();
    }
    return _aliasGetHelpText.call(this);
  };

  var _aliasDrawInfo = UnitMenuBottomWindow._drawInfoWindow;
  UnitMenuBottomWindow._drawInfoWindow = function (x, y) {
    if (!this._isTracingLocked && this._equipSkillInteraction.isTracingHelp()) {
      this._equipSkillInteraction.getInteractionWindow().drawWindow(x, y);
      return;
    }
    _aliasDrawInfo.call(this, x, y);
  };

})();