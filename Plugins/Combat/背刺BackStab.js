/* 
======================================
  技能插件：BackStab（背刺）
  作者：Katafract
  
    - 拥有BackStab技能的角色在攻击敌方时，若目标敌方周围存在我方单位，则无视防御。
  使用方法：
    创建自定义技能，技能关键词为BackStab
	
   Plugin : BackStab
   Made by Katafract

    Effect:
    - When a unit with the "BackStab" skill attacks an enemy, and there is an allied unit adjacent to the target,
      the attack ignores the target's defense.
	  
    Usage:
    Create a custom skill with the keyword "BackStab".
======================================
*/

(function() {

    // 保留原有防御计算函数
    var alias_calculateDefense = DamageCalculator.calculateDefense;

    DamageCalculator.calculateDefense = function(active, passive, weapon, isCritical, totalStatus) {
        var def = alias_calculateDefense.call(this, active, passive, weapon, isCritical, totalStatus);

        // 检查攻击方是否持有BackStab技能
        if (SkillControl.getPossessionCustomSkill(active, 'BackStab')) {

            // 检查被攻击方周围是否存在我方单位
            if (BackStabChecker.isPlayerNearby(passive, 1, active)) {
                def = 0; // 满足条件，无视防御
            }
        }

        return def;
    };

    // 检测核心逻辑：判断目标周围是否存在我方单位
    var BackStabChecker = {

        // 传入目标单位，被检测范围（range默认传1），攻击方（active用于排除自己）
        isPlayerNearby: function(targetUnit, range, attackerUnit) {
            var x = targetUnit.getMapX();
            var y = targetUnit.getMapY();
            var indexArray = IndexArray.getBestIndexArray(x, y, range, range);
            var count = indexArray.length;

            for (var i = 0; i < count; i++) {
                var index = indexArray[i];
                var posX = CurrentMap.getX(index);
                var posY = CurrentMap.getY(index);
                var nearbyUnit = PosChecker.getUnitFromPos(posX, posY);

                // 排除目标自身与攻击方本身
                if (nearbyUnit !== null && nearbyUnit !== targetUnit && nearbyUnit !== attackerUnit) {
                    if (nearbyUnit.getUnitType() === UnitType.PLAYER) {
                        return true;
                    }
                }
            }

            return false;
        }
    };

})();
