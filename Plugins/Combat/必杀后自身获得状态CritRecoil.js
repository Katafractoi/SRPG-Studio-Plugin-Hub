/*
作者：Katafract
	版本：1.0
	
	此插件用于在角色发动必杀攻击后，在战斗结算时为角色自身添加一个特定状态。
	
	【用法】
	1. 创建插件自定义技能，关键词为"CritRecoil"
	2. 自定义参数"critstate"决定角色在必杀后获得的状态ID，例如：{critstate: 5}表示角色在必杀后获得ID为5的状态。
	
Made by Katafract

This plugin add a specific state to a unit after landing a critical attack on enemy.

Usage:

Create a custom skill with the keyword "CritRecoil".
Use custom parameter "critstate" for the state ID that the unit will receive after the critical attack. 
For example, 
{critstate: 5} 
means the character will gain the state with ID 5 after the critical attack.

*/

(function() {
    // 保存原始的伤害计算方法
    var originalArrangeActiveDamage = AttackEvaluator.ActiveAction._arrangeActiveDamage;
    
    // 修改伤害结算逻辑
    AttackEvaluator.ActiveAction._arrangeActiveDamage = function(virtualActive, virtualPassive, attackEntry) {
        var active = virtualActive.unitSelf;
        var passive = virtualPassive.unitSelf;
        var damage = originalArrangeActiveDamage.call(this, virtualActive, virtualPassive, attackEntry);
        var skill = SkillControl.getPossessionCustomSkill(active, 'CritRecoil');
        var state;
        
        // 如果技能CritRecoil触发，且是必杀攻击
        if (skill && attackEntry.isCritical) {
            // 获取自定义参数中的状态ID
            var critStateId = skill.custom.critstate;
            
            if (critStateId !== undefined) {
                // 从状态列表中获取状态
                var stateList = root.getBaseData().getStateList();
                state = stateList.getDataFromId(critStateId);
                
                // 确保状态存在
                if (state) {
                    // 将状态施加到攻击方角色身上
                    virtualActive.stateArray.push(state);
                    attackEntry.stateArrayActive.push(state);
                }
            }
        }
        
        return damage;
    };
})();
