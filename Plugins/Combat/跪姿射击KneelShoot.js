// 跪姿射击插件
/*
  跪姿射击：技能关键词 "KneelShoot"
  如果单位不移动（即已移动距离为0时），命中率和暴击率增加，同时伤害增加

  示例自定义参数：{kneelhit: 5, kneelcrit: 5, dmg: 5}
  - kneelhit: 命中率增加值，默认为5
  - kneelcrit: 暴击率增加值，默认为5
  - dmg: 伤害增加值，默认为5
  
  作者：Katafract
  
  Kneeling Shot: Skill keyword "KneelShoot"
  If the unit does not move (moved distance = 0), increases hit rate, critical rate, and damage.

  Example custom parameters: {kneelhit: 5, kneelcrit: 5, dmg: 5}
  - kneelhit: bonus to hit rate, default is 5
  - kneelcrit: bonus to critical rate, default is 5
  - dmg: bonus to damage, default is 5
  
  Made by Katafract
  
  修改日志changelog
  
  2025-07-08
  修改了命中率、暴击率在预览界面会超过100的显示bug
  Fixed potential UI overflow by switching hit/crit bonuses to base component calculation.
  
*/

(function () {
  // 备份原始的技能触发逻辑
  var originalSkillChecker = SkillRandomizer.isCustomSkillInvokedInternal;

  // 重写技能触发逻辑
  SkillRandomizer.isCustomSkillInvokedInternal = function (active, passive, skill, keyword) {
    if (keyword === 'KneelShoot') { // 修改技能关键词
      return this._isSkillInvokedInternal(active, passive, skill);
    }
    return originalSkillChecker.call(this, active, passive, skill, keyword);
  };

  // 获取 KneelShoot 技能
  var getKneelShootSkill = function (unit) {
    var skill = SkillControl.getPossessionCustomSkill(unit, 'KneelShoot');
    return skill && unit.getMostResentMov() === 0 ? skill : null;
  };

// 修改命中组成值（避免命中预览超过100%）
var originalCalculateSingleHit = HitCalculator.calculateSingleHit;
HitCalculator.calculateSingleHit = function (active, passive, weapon, totalStatus) {
  var hit = originalCalculateSingleHit.call(this, active, passive, weapon, totalStatus);

  var skill = getKneelShootSkill(active);
  if (skill) {
    var kneelhit = skill.custom.kneelhit || 5;
    hit += kneelhit;
  }

  return hit;
};


  // 修改暴击组成值（避免暴击预览超过100%）
var originalCalculateSingleCritical = CriticalCalculator.calculateSingleCritical;
CriticalCalculator.calculateSingleCritical = function (active, passive, weapon, totalStatus) {
  var crit = originalCalculateSingleCritical.call(this, active, passive, weapon, totalStatus);

  var skill = getKneelShootSkill(active);
  if (skill) {
    var kneelcrit = skill.custom.kneelcrit || 5;
    crit += kneelcrit;
  }

  return crit;
};


  // 重写伤害的计算
  var originalCalculateDamage = DamageCalculator.calculateDamage;
  DamageCalculator.calculateDamage = function (active, passive, weapon, isCritical, activeTotalStatus, passiveTotalStatus, trueHitValue) {
    var damage = originalCalculateDamage.call(this, active, passive, weapon, isCritical, activeTotalStatus, passiveTotalStatus, trueHitValue);

    // 检查角色是否拥有 KneelShoot 技能
    var skill = getKneelShootSkill(active);
    if (skill) {
      // 获取自定义参数 dmg，如果未设置则默认为5
      var dmg = skill.custom.dmg || 5;

      // 增加伤害
      damage += dmg;
    }

    return damage;
  };
})();
