# Katafract's SRPG Studio Plugin Hub

A small collection of plugins for **SRPG Studio**, maintained by Katafract.  
Katafract 制作与维护的 **SRPG Studio 插件合集**。

> GitHub is the source repository for versioned plugin code.  
> GitHub 作为插件源码与版本记录的主仓库。

## Installation / 安装

Download the `.js` file you need and place it in your project's `Plugin` folder.  
下载需要的 `.js` 文件，并放入 SRPG Studio 项目的 `Plugin` 文件夹。

Some plugins require custom parameters or additional setup. Please read the header comments in each plugin before use.  
部分插件需要设置自定义参数或额外配置，请在使用前阅读插件文件顶部说明。

## Plugins / 插件列表

### Combat / 战斗

| 中文名 | Plugin | Description |
|---|---|---|
| 背刺 | BackStab | 目标周围存在友军时无视防御 / Ignore defense when an ally is adjacent to the target |
| 必杀后自身获得状态 | CritRecoil | 必杀后为自身附加指定状态 / Gain a specified state after a critical hit |
| 更多追击 | MorePursuit | 按攻速差设置不同追击轮数 / Configure follow-up count by AGI difference |
| 跪姿射击 | KneelShoot | 未移动时获得命中、必杀与伤害加成 / Gain bonuses when attacking without moving |
| 老兵 | Veteran | 根据等级与职业阶段获得梯度属性加成 / Gain scaled bonuses from level and class tier |
| 刃鳞 | BladeScale | 回避攻击时恢复武器耐久 / Restore weapon durability after dodging |
| 追击必杀加成 | PursuitCrt | 可追击时提高必杀率 / Increase critical rate when a pursuit is possible |
| 正面对决 | FairFight | 敌人可反击时获得战斗加成 / Gain combat bonuses when the enemy can counter |
| 过量伤害 | OverKill | 将部分过量伤害转化为下一战加成 / Carry part of excess damage into the next battle |
| 替身术 | SubstitutionJutsu | 受击时将伤害变为 0、终止剩余战斗并重新出现 / Negate the hit, cancel the remaining combat, then reappear on a valid tile |

### Weapon-Item / 武器与道具

| 中文名 | Plugin | Description |
|---|---|---|
| 自动修复型武器 | RechargeWeapon | 章节结束自动修复指定武器 / Automatically repair specified weapons after a chapter |

### UI / 界面

| 中文名 | Plugin | Description |
|---|---|---|
| 技能弹出滑入特效 | SkillTitlePopUp | 技能发动时显示弹出或滑入特效 / Show pop-up or slide-in effects on skill activation |
| 真实战斗 UI 滑入 | RealBattleUISlideIn | 为真实战斗上下 UI 添加滑入动画 / Add slide-in animation to the real-battle UI |
| 武器道具技能图标另行显示 | ExtraEquipmentItemSkillRow | 武器/道具技能在主技能区下方另行显示 / Display weapon/item skills in a separate row |

## Repository Structure / 仓库结构

```text
Plugins/
├─ Combat/
├─ Weapon-Item/
└─ UI/
```

Single-file plugins stay directly inside their category folder. A plugin gets its own folder only when it needs multiple scripts, assets, examples, or extended documentation.  
单文件插件直接放在分类目录中；仅当插件包含多个脚本、素材、示例或较长说明时，才单独建立文件夹。


## itch.io

Public download page / 公开下载页:  
https://katafract.itch.io/katafracts-srpg-studio-plugin-hub

## Release maintenance / 发布维护

See [release instructions](docs/RELEASING.md) for the public-file manifest and validation-only workflow. itch.io publishing is not enabled yet.  
公开文件清单与仅校验工作流见[发布说明](docs/RELEASING.md)。itch.io 自动发布尚未启用。

## License / 许可

Free to use, modify, and redistribute in both free and commercial projects. Attribution is optional. See [LICENSE](LICENSE) for details.  
免费及商业项目均可使用、修改与再分发，署名可选。详情见 [LICENSE](LICENSE)。

---

**Author / 作者:** Katafract
