/* 
刃鳞技能
插件实现了类似怪猎里面千刃龙装备的技能，
角色拥有“刃鳞”技能时，每次回避攻击的时候，恢复1点武器的耐久度。
不影响耐久度为0的武器。
技能关键词：BladeScale

作者：Katafract

BladeScale Skill
This plugin allows a character with the "BladeScale" skill to restore 1 durability to their weapon everytime when an enemy attack misses.
(Think about Seregios BladeScale skill in Monster Hunter)
This won't affect weapon with 0 durability.
Skill Keyword: BladeScale

Made by Katafract

*/

(function () {
    // 刃鳞技能判定，敌方攻击未命中时恢复武器耐久度
	// BladeScale skill check - restore weapon durability when enemy attack misses
    var alias000 = AttackEvaluator.HitCritical.evaluateAttackEntry;
    AttackEvaluator.HitCritical.evaluateAttackEntry = function (virtualActive, virtualPassive, attackEntry) {
        alias000.call(this, virtualActive, virtualPassive, attackEntry); // 调用原始命中判定

        var passive = virtualPassive.unitSelf;

        // 如果是敌方攻击，且未命中
        // If it's an enemy attack and it misses
        if (attackEntry.isHit === false) {
            // 如果角色有刃鳞技能
            // If the character has the BladeScale skill
            if (SkillControl.getPossessionCustomSkill(passive, "BladeScale")) {
                var item = virtualPassive.weapon; 
				// 获取当前武器（物品）
                // Get the current weapon (item)

                // 如果物品是武器，且最大耐久度大于 0，恢复 1 点耐久度
				// If the item is a weapon and the maximum durability is greater than 0, restore 1 durability point
                if (item && item.isWeapon() && item.getLimitMax() > 0) {
                    // 如果武器的最大耐久度为 0，则不做任何处理。
                    // If the weapon's max durability is 0, do nothing.
                    if (item.getLimitMax() === 0) {
                        return;
                    }

                    // 如果武器未破损，恢复 1 点耐久度
                    if (item.getLimit() !== WeaponLimitValue.BROKEN) {
                        var currentLimit = item.getLimit();
						var maxLimit = item.getLimitMax(); // 获取武器的最大耐久度
                        // 检查当前耐久度是否小于最大耐久度，防止超出最大值
                        // Check if the current durability is less than the max durability to avoid exceeding it
                        if (currentLimit < maxLimit) {
                            item.setLimit(currentLimit + 1);  // 恢复耐久度 1 点// Restore 1 durability point
                        }  
                    }
                }
            }
        }
    };
})();
