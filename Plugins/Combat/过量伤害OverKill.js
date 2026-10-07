/*
过量伤害技能 Overkill

将击杀时产生的过量伤害按比例转化为下一次攻击的威力加成；
若未能击杀敌人，则加成清零。
默认情况下，仅转化过量伤害的一半，该比例可通过自定义参数调整。

技能关键词：overkill
自定义参数：{ overkillrate: 0.5 }


When a unit with the Overkill skill defeats an enemy,
a portion of the excess damage is converted into bonus attack power
for the next battle.
By default, half of the excess damage is converted; this ratio can be
adjusted via the custom parameter.
If the enemy is not defeated, the bonus is cleared.

Skill Keyword: overkill
Custom parameter: { overkillrate: 0.5 }

made by Katafract
*/



(function () {

  var getOverkillSkill = function (unit) {
    return SkillControl.getPossessionCustomSkill(unit, 'Overkill');
  };

  var getRate = function (skill) {
    var c = skill.custom || {};
    var r = (typeof c.overkillrate === 'number') ? c.overkillrate : 0.5;
    if (r < 0) r = 0;
    return r;
  };

  // 攻击加成（
  var _Overkill_AttackPower = DamageCalculator.calculateAttackPower;
  DamageCalculator.calculateAttackPower = function (active, passive, weapon, isCritical, totalStatus, trueHitValue) {
    var pow = _Overkill_AttackPower.call(this, active, passive, weapon, isCritical, totalStatus, trueHitValue);

    var skill = getOverkillSkill(active);
    if (!skill) {
      return pow;
    }

    if (typeof active.custom.ok_bonusPow !== 'number') {
      active.custom.ok_bonusPow = 0;
    }

    if (active.custom.ok_bonusPow > 0) {
      pow += active.custom.ok_bonusPow;
    }

    return pow;
  };

  // 逐击记录溢出（临时值）
  var _Overkill_CalcDamage = AttackEvaluator.HitCritical.calculateDamage;
  AttackEvaluator.HitCritical.calculateDamage = function (virtualActive, virtualPassive, entry) {
    var active = virtualActive.unitSelf;

    var damage = _Overkill_CalcDamage.call(this, virtualActive, virtualPassive, entry);

    var skill = getOverkillSkill(active);
    if (!skill) {
      return damage;
    }

    if (typeof active.custom.ok_overkillTemp !== 'number') {
      active.custom.ok_overkillTemp = 0;
    }

    var hpBefore = virtualPassive.hp;
    if (hpBefore <= 0) {
      return damage;
    }

    if (damage >= hpBefore) {
      var over = damage - hpBefore;
      if (over > 0) {
        var rate = getRate(skill);
        var v = Math.floor(over * rate);
        active.custom.ok_overkillTemp = (v > 0) ? v : 0;
      } else {
        active.custom.ok_overkillTemp = 0;
      }
    }

    return damage;
  };

  // 战斗结算：击杀则保留加成，未击杀清零
  var _Overkill_End = UnitDeathFlowEntry._prepareMemberData;
  UnitDeathFlowEntry._prepareMemberData = function (coreAttack) {
    _Overkill_End.call(this, coreAttack);

    var attacker = this._activeUnit;
    var target = this._passiveUnit;

    var skill = getOverkillSkill(attacker);
    if (!skill) {
      return;
    }

    if (typeof attacker.custom.ok_bonusPow !== 'number') attacker.custom.ok_bonusPow = 0;
    if (typeof attacker.custom.ok_overkillTemp !== 'number') attacker.custom.ok_overkillTemp = 0;

    if (target.getHp() <= 0) {
      attacker.custom.ok_bonusPow = attacker.custom.ok_overkillTemp;
    } else {
      attacker.custom.ok_bonusPow = 0;
    }

    attacker.custom.ok_overkillTemp = 0;
  };

})();
