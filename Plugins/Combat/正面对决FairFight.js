// Fair Fight 正面对决插件
  /*
    技能关键词：fair-fight
    当敌方可以反击时，获得伤害、命中、暴击加成。

    自定义参数示例：
    {
      atk_bonus: 5,     // 伤害加成，默认 5
      hit_bonus: 15,    // 命中加成，默认 0
      crit_bonus: 10,   // 暴击加成，默认 0
      fair: true        // 是否允许敌我双方共享加成，默认 false
    }

    Author：Katafract

    ----------------------
    Skill keyword: "fair-fight"
    Provides bonus to damage / hit / critical rate only when opponent can counterattack.
    If fair:true is set, bonuses apply to both sides.
  */

(function () {
  
  var getFairFightSkill = function (unit) {
    return SkillControl.getPossessionCustomSkill(unit, 'fair-fight');
  };

  // 计算技能加成（前提是对方可以反击）
  var getFairFightBonus = function (unit, opponent) {
    var skill = getFairFightSkill(unit);
    if (!skill) {
      return null;
    }

    if (!AttackChecker.isCounterattack(unit, opponent)) {
      return null;
    }

    var custom = skill.custom || {};

    return {
      atk: typeof custom.atk_bonus === 'number' ? custom.atk_bonus : 5,
      hit: typeof custom.hit_bonus === 'number' ? custom.hit_bonus : 0,
      crit: typeof custom.crit_bonus === 'number' ? custom.crit_bonus : 0,
      fair: custom.fair === true
    };
  };

  // 伤害加成
  var _FairFight_Damage = DamageCalculator.calculateDamage;
  DamageCalculator.calculateDamage = function (active, passive, weapon, isCritical, activeStatus, passiveStatus, trueHitValue) {
    var damage = _FairFight_Damage.call(this, active, passive, weapon, isCritical, activeStatus, passiveStatus, trueHitValue);

    var activeBonus = getFairFightBonus(active, passive);
    if (activeBonus !== null) {
      damage += activeBonus.atk;
    }

    var passiveBonus = getFairFightBonus(passive, active);
    if (passiveBonus !== null && passiveBonus.fair) {
      damage += passiveBonus.atk;
    }

    return damage;
  };

  // 命中加成
  var _FairFight_Hit = HitCalculator.calculateSingleHit;
  HitCalculator.calculateSingleHit = function (active, passive, weapon, totalStatus) {
    var hit = _FairFight_Hit.call(this, active, passive, weapon, totalStatus);

    var activeBonus = getFairFightBonus(active, passive);
    if (activeBonus !== null) {
      hit += activeBonus.hit;
    }

    var passiveBonus = getFairFightBonus(passive, active);
    if (passiveBonus !== null && passiveBonus.fair) {
      hit += passiveBonus.hit;
    }

    return hit;
  };

  // 暴击加成
  var _FairFight_Crit = CriticalCalculator.calculateSingleCritical;
  CriticalCalculator.calculateSingleCritical = function (active, passive, weapon, totalStatus) {
    var crit = _FairFight_Crit.call(this, active, passive, weapon, totalStatus);

    var activeBonus = getFairFightBonus(active, passive);
    if (activeBonus !== null) {
      crit += activeBonus.crit;
    }

    var passiveBonus = getFairFightBonus(passive, active);
    if (passiveBonus !== null && passiveBonus.fair) {
      crit += passiveBonus.crit;
    }

    return crit;
  };
})();
