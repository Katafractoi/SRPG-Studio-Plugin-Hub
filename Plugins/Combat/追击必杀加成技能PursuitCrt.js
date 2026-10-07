/*
---------------------------------------------------------------
技能：追击必杀加成 PursuitCrt
作者：Katafract

【功能说明】
可以追击的情况下，增加必杀率。

【技能关键词】
PursuitCrt

【可选自定义参数】
value ：要增加的必杀值（可选，默认 +20）
{ value: 30 }   // 表示多段攻击时 +30% 必杀率

PursuitCrt
Author: Katafract

Increases critical rate when the unit is able to perform a pursuit attack.

[Skill Keyword]
PursuitCrt

[Optional Custom Parameter]
value: Additional critical rate (default: +20)
Example:
{ value: 30 }  // Adds +30% critical rate when pursuit is possible.

2025-08-09
  修改了暴击率在预览界面会超过100的显示bug
  Fixed a bug that crit might be over 100 in battle preview window.

---------------------------------------------------------------
*/
(function() {
    var alias = CriticalCalculator.calculateSingleCritical;
    CriticalCalculator.calculateSingleCritical = function(active, passive, weapon, totalStatus) {
        var crit = alias.call(this, active, passive, weapon, totalStatus);

        var skill = SkillControl.getPossessionCustomSkill(active, 'PursuitCrt');
        if (skill) {
            var roundCount = Calculator.calculateRoundCount(active, passive, weapon);
            if (roundCount >= 2) {
                var bonus = skill.custom.value || 20;
                crit += bonus; // 加成会进入后续 cap 流程
            }
        }

        return crit;
    };
})();

