/* 
更多追击插件

这个插件允许根据攻速差异的设定，进行额外的追击轮数。

要使用这个插件，你可以为角色设定一个自定义技能，关键词：more-pursuit。
然后，通过自定义参数 agiDiff（速度差异值数组） 和 pursuitPlus（追击次数数组） 来设定不同速度差异值对应的额外追击次数。

例如，如果引擎本身已经设定速度差异为1时追击，你可以设定角色具有 关键词为"more-pursuit"的自定义技能，且 agiDiff 为 [2]，pursuitPlus 为 [1]。

{agiDiff:[2],pursuitPlus:[1]}

这样，当角色的速度差异大于等于2时，会额外追击1次(即追击3次)。

另外，如果你希望设定速度差异为2、4时，对应的额外追击次数为1、2两种情况，可以将 agiDiff 设定为 [2, 4]，pursuitPlus 设定为 [1, 2]。

{agiDiff:[2,4],pursuitPlus:[1,2]}

这样，当速度差异大于等于2时，会额外追击1次（即追击3次）；当速度差异大于等于4时，会额外追击2次（即追击4次）。

作者：Katafract

More Pursuit Plugin
This plugin allows additional pursuit rounds based on the configured agility advantage.

To use this plugin, you can assign a custom skill wikeyword: more-pursuit.
Then, use the custom parameters agiDiff (an array of agility differences) and pursuitPlus (an array of extra pursuit counts) 
to define how many additional pursuits occur at different speed thresholds.

For example, if the engine already triggers a pursuit at a agility difference of 1, 
you can assign a custom skill with the keyword more-pursuit, and set agiDiff to [2] and pursuitPlus to [1]:

{ agiDiff: [2], pursuitPlus: [1] }
This means when the unit’s agility difference is ≥ 2, they will perform 1 extra pursuit (a total of 3 attacks).

Additionally, if you want to set 1 extra pursuit at a agility difference of 2, 
and 2 extra pursuits at a difference of 4, you can set agiDiff to [2, 4] and pursuitPlus to [1, 2]:

{ agiDiff: [2, 4], pursuitPlus: [1, 2] }
In this case, when the agility difference is ≥ 2, the unit will perform 1 extra pursuit (3 total attacks);
and when the difference is ≥ 4, they will perform 2 extra pursuits (4 total attacks).

Author: Katafract


*/

//-------------------------------
// 设置
//-------------------------------
var MORE_PURSUIT_SKILL_KEYWORD = 'more-pursuit'; // 自定义技能关键词

//------------------------------------------
// 以下是插件代码
//------------------------------------------
(function() {
	var aliasCalculateRoundCount = Calculator.calculateRoundCount;

	Calculator.calculateRoundCount = function(active, passive, weapon) {
		var rounds = aliasCalculateRoundCount.call(this, active, passive, weapon);

		var skill = SkillControl.getPossessionCustomSkill(active, MORE_PURSUIT_SKILL_KEYWORD);
		if (skill !== null) {
			var agilityDiffParam = skill.custom.agiDiff || []; // 从自定义参数中获取速度差异值数组
			var pursuitRoundParam = skill.custom.pursuitPlus || []; // 从自定义参数中获取追击次数数组

			var activeAgi = AbilityCalculator.getAgility(active, weapon) + this.getAgilityPlus(active, passive, weapon);
			var passiveAgi = AbilityCalculator.getAgility(passive, ItemControl.getEquippedWeapon(passive));
			var diff = activeAgi - passiveAgi;

			for (var i = agilityDiffParam.length - 1; i >= 0; i--) {
				if (diff >= agilityDiffParam[i]) {
					rounds += pursuitRoundParam[i] || 0;
					break;
				}
			}
		}

		return rounds;
	};
})();


