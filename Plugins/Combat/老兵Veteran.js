/*
插件名称：Veteran Skill- 老兵技能
作者：Katafract
关键词：Veteran
描述：根据角色等级按梯度增加属性，并对上级职业提供额外等级加成。
Plugin Name: Veteran - Veteran Skill
Author: Katafract
Skill Keyword: Veteran
Description: Grants bonuses based on level thresholds, with bonus levels for promoted class.
*/

(function() {

// -------------------------
// 【参数设置区域】
// -------------------------
var VeteranSettings = {
  lvStep: 10,           // 每多少等级触发一次加成 | Level interval for each bonus trigger
  promotedBonus: 20,    // 如果是上级职业，额外加算的等级值 | Extra levels added if unit is promoted

  atk: 1,              // 每梯度加多少攻击 | Bonus attack per level step
  def: 0,              // 每梯度加多少防御 | Bonus defense per level step
  hit: 5,              // 每梯度加多少命中 | Bonus hit rate per level step
  avo: 5,              // 每梯度加多少回避 | Bonus avoid rate per level step
  crit: 0              // 每梯度加多少暴击 | Bonus critical rate per level step
};

// -------------------------
// 【辅助函数】
// -------------------------
function getVeteranSkillBonus(unit, paramName) {
  if (!SkillControl.getPossessionCustomSkill(unit, 'Veteran')) {
    return 0;
  }

  var level = unit.getLv();
  var classRank = unit.getClass().getClassRank();
  if (classRank === ClassRank.HIGH) {
    level += VeteranSettings.promotedBonus;
  }

  var step = VeteranSettings.lvStep;
  if (step <= 0) return 0; // 防止除以0

  var bonusTimes = Math.floor(level / step);
  var bonusPerStep = VeteranSettings[paramName] || 0;
  return bonusTimes * bonusPerStep;
}

// -------------------------
// 【加成实现部分】
// -------------------------

var _calculateAttackPower = DamageCalculator.calculateAttackPower;
DamageCalculator.calculateAttackPower = function(active, passive, weapon, isCritical, totalStatus, trueHitValue) {
  var power = _calculateAttackPower.call(this, active, passive, weapon, isCritical, totalStatus, trueHitValue);
  power += getVeteranSkillBonus(active, 'atk');
  return power;
};

var _calculateDefense = DamageCalculator.calculateDefense;
DamageCalculator.calculateDefense = function(active, passive, weapon, isCritical, totalStatus, trueHitValue) {
  var defense = _calculateDefense.call(this, active, passive, weapon, isCritical, totalStatus, trueHitValue);
  defense += getVeteranSkillBonus(passive, 'def');
  return defense;
};

var _calculateSingleHit = HitCalculator.calculateSingleHit;
HitCalculator.calculateSingleHit = function(active, passive, weapon, totalStatus) {
  var hit = _calculateSingleHit.call(this, active, passive, weapon, totalStatus);
  hit += getVeteranSkillBonus(active, 'hit');
  return hit;
};

var _calculateAvoid = HitCalculator.calculateAvoid;
HitCalculator.calculateAvoid = function(active, passive, weapon, totalStatus) {
  var avoid = _calculateAvoid.call(this, active, passive, weapon, totalStatus);
  avoid += getVeteranSkillBonus(passive, 'avo');
  return avoid;
};

var _calculateSingleCritical = CriticalCalculator.calculateSingleCritical;
CriticalCalculator.calculateSingleCritical = function(active, passive, weapon, totalStatus) {
  var crit = _calculateSingleCritical.call(this, active, passive, weapon, totalStatus);
  crit += getVeteranSkillBonus(active, 'crit');
  return crit;
};

})();