/*------------------------------------------------------------------------------
Rechargeweapon V2（定量回复 + 支持破损武器）

made by Katafract

章节结束时，自动恢复带有自定义参数 {recharge:X} 的武器耐久（包括已破损的武器）。

用法：
在武器的自定义参数中添加：
{recharge: X}   //X=0时完全恢复，X＞0时恢复X点耐久

At chapter end, weapons with the custom parameter {recharge:X} automatically regain durability, 
including broken weapons.

How to Use:
Add to the weapon's custom parameters:
{recharge: X}  // X=0 fully restores durability; X>0 restores X durability

------------------------------------------------------------------------------*/

(function() {

  // ========== Config ==========
  var DEBUG = false;
  function log(msg) {
    if (DEBUG) root.log("[RW] " + msg);
  }

  // ========== 1) Inherit recharge when weapon breaks (lostItem) ==========
  var _alias_lostItem = ItemControl.lostItem;
  ItemControl.lostItem = function(unit, item) {
    var r = null;

    // Before alias: read recharge from the original weapon (if any)
    if (item && item.custom && typeof item.custom.recharge !== "undefined") {
      r = parseInt(item.custom.recharge, 10);
      if (isNaN(r)) r = null;
      else log("break r=" + r);
    }

    // Engine break process (item may be replaced here)
    _alias_lostItem.call(this, unit, item);

    // After alias: write recharge into the replaced (broken) item
    if (r !== null && item) {
      if (!item.custom) item.custom = {};
      item.custom.recharge = r;
      log("inherit");
    }
  };

  // ========== 2) Apply recharge at chapter end (MapEnd) ==========
  var _alias_MapEnd = MapEndFlowEntry._prepareMemberData;
  MapEndFlowEntry._prepareMemberData = function(battleResultScene) {

    // --- Collect BEFORE alias (avoid other MapEnd logic modifying limits first) ---
    var targets = [];

    function collect(item) {
      if (!item || !item.isWeapon()) return;
      if (!item.custom || typeof item.custom.recharge === "undefined") return;

      var r = parseInt(item.custom.recharge, 10);
      if (isNaN(r)) return;

      targets.push({
        ref: item,
        r: r,
        curBefore: item.getLimit(),
        max: item.getLimitMax()
      });
    }

    // Unit inventory
    var list = PlayerList.getMainList();
    var maxItems = DataConfig.getMaxUnitItemCount();
    for (var i = 0; i < list.getCount(); i++) {
      var unit = list.getData(i);
      for (var j = 0; j < maxItems; j++) {
        collect(unit.getItem(j));
      }
    }

    // Stock
    var stockCount = StockItemControl.getStockItemCount();
    for (var k = 0; k < stockCount; k++) {
      collect(StockItemControl.getStockItem(k));
    }

    // --- Original MapEnd flow ---
    _alias_MapEnd.call(this, battleResultScene);

    // --- Apply AFTER alias (use curBefore) ---
    for (var n = 0; n < targets.length; n++) {
      var t = targets[n];

      var next;
      if (t.r === 0) {
        next = t.max;
        log("fix full");
      }
      else {
        // broken or <=0: revive to r; otherwise: +r
        next = (t.curBefore <= 0) ? t.r : (t.curBefore + t.r);
        if (next > t.max) next = t.max;
        log("fix r=" + t.r);
      }

      t.ref.setLimit(next);
    }
  };

})();
