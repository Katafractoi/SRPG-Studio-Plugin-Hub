/*--------------------------------------------------------------------------
  替身术-Substitution Jutsu

  ■ 说明
  拥有特定状态的玩家单位被敌军攻击命中时，本次伤害变为0，并立即终止剩余战斗流程。
  战斗结束后，玩家可以在指定范围内
  选择一个合法格子令单位出现。选择原格或按取消都会返回原位。

  ■ 使用方法
  在状态的自定义参数中填写：

  {
    SubstitutionJutsu: {
      range: 2,
      animeId: 103,
      animeRuntime: true,
      blockStateAttack: true
    }
  }

  range: 可选位置距离，默认2。
  animeId: 地图特效ID，默认103。
  animeRuntime: true为RTP特效，false为原创特效，默认true。
  blockStateAttack: 是否同时阻止本次攻击附加的状态（例如中毒），默认true。

  使用全部默认值时，也可以只填写：
  { SubstitutionJutsu: true }

  ■ Overview
  When an enemy attack hits a player unit with this state, the incoming damage
  becomes 0 and all remaining attacks in that combat are canceled. After combat,
  the player selects a valid destination within the configured range. Selecting
  the original tile or pressing Cancel returns the unit to its original position.
  The state is consumed whenever the effect activates.

  ■ How to Use
  Add the following custom parameters to a state:

  {
    SubstitutionJutsu: {
      range: 2,
      animeId: 103,
      animeRuntime: true,
      blockStateAttack: true
    }
  }

  range: Maximum selection range. Default: 2.
  animeId: Map effect animation ID. Default: 103.
  animeRuntime: true for an RTP effect, false for an original effect. Default: true.
  blockStateAttack: Also blocks states inflicted by the triggering hit. Default: true.

  To use all default settings, enter:
  { SubstitutionJutsu: true }

  made by Katafract
--------------------------------------------------------------------------*/

var SubstitutionJutsuConfig = {
    CustomKey: 'SubstitutionJutsu',
    DefaultRange: 2,
    DefaultAnimeId: 103,
    DefaultAnimeRuntime: true,
    DefaultBlockStateAttack: true,
    MaxRange: 10
};

var SubstitutionJutsuFlowMode = {
    SOURCE_ANIME: 0,
    POSITION_SELECT: 1,
    DESTINATION_ANIME: 2
};

var SubstitutionJutsuControl = {
    findStateData: function(unit) {
        var i, turnState, state, custom, config;
        var list;

        if (unit === null || unit.getUnitType() !== UnitType.PLAYER) {
            return null;
        }

        list = unit.getTurnStateList();
        for (i = 0; i < list.getCount(); i++) {
            turnState = list.getData(i);
            state = turnState.getState();
            custom = state.custom[SubstitutionJutsuConfig.CustomKey];

            if (custom !== true && (custom === null || typeof custom !== 'object')) {
                continue;
            }

            config = this._createConfig(custom);
            config.stateId = state.getId();
            return config;
        }

        return null;
    },

    isTriggerAttack: function(virtualActive, virtualPassive, attackEntry) {
        if (attackEntry.isHit !== true) {
            return false;
        }

        if (virtualActive.unitSelf.getUnitType() !== UnitType.ENEMY ||
            virtualPassive.unitSelf.getUnitType() !== UnitType.PLAYER) {
            return false;
        }

        return true;
    },

    getAnime: function(config) {
        var list;

        if (config === null || typeof config.animeId !== 'number' || config.animeId < 0) {
            return null;
        }

        list = root.getBaseData().getEffectAnimationList(config.animeRuntime === true);
        return list.getDataFromId(config.animeId);
    },

    removeTriggerState: function(unit, stateId) {
        var state;

        if (unit === null || typeof stateId !== 'number' || stateId < 0) {
            return;
        }

        state = root.getBaseData().getStateList().getDataFromId(stateId);
        if (state !== null) {
            StateControl.arrangeState(unit, state, IncreaseType.DECREASE);
        }
    },

    createDestinationIndexArray: function(unit, range) {
        var i, index, x, y;
        var result = [CurrentMap.getIndex(unit.getMapX(), unit.getMapY())];
        var source = IndexArray.getBestIndexArray(unit.getMapX(), unit.getMapY(), 1, range);

        for (i = 0; i < source.length; i++) {
            index = source[i];
            x = CurrentMap.getX(index);
            y = CurrentMap.getY(index);

            if (PosChecker.getUnitFromPos(x, y) !== null) {
                continue;
            }

            if (PosChecker.getMovePointFromUnit(x, y, unit) === 0) {
                continue;
            }

            result.push(index);
        }

        return result;
    },

    isDestinationAllowed: function(unit, pos, indexArray) {
        var targetUnit;

        if (unit === null || pos === null || !IndexArray.findPos(indexArray, pos.x, pos.y)) {
            return false;
        }

        // Selecting the original square is equivalent to canceling the move.
        if (pos.x === unit.getMapX() && pos.y === unit.getMapY()) {
            return true;
        }

        targetUnit = PosChecker.getUnitFromPos(pos.x, pos.y);
        if (targetUnit !== null && targetUnit !== unit) {
            return false;
        }

        return PosChecker.getMovePointFromUnit(pos.x, pos.y, unit) !== 0;
    },

    _createConfig: function(custom) {
        var range = SubstitutionJutsuConfig.DefaultRange;
        var animeId = SubstitutionJutsuConfig.DefaultAnimeId;
        var animeRuntime = SubstitutionJutsuConfig.DefaultAnimeRuntime;
        var blockStateAttack = SubstitutionJutsuConfig.DefaultBlockStateAttack;

        if (custom !== true) {
            if (typeof custom.range === 'number') {
                range = Math.floor(custom.range);
            }
            if (typeof custom.animeId === 'number') {
                animeId = Math.floor(custom.animeId);
            }
            if (typeof custom.animeRuntime === 'boolean') {
                animeRuntime = custom.animeRuntime;
            }
            if (typeof custom.blockStateAttack === 'boolean') {
                blockStateAttack = custom.blockStateAttack;
            }
        }

        if (range < 1) {
            range = 1;
        }
        else if (range > SubstitutionJutsuConfig.MaxRange) {
            range = SubstitutionJutsuConfig.MaxRange;
        }

        return {
            range: range,
            animeId: animeId,
            animeRuntime: animeRuntime,
            blockStateAttack: blockStateAttack
        };
    }
};

var SubstitutionJutsuFlowEntry = defineObject(BaseFlowEntry,
{
    _unit: null,
    _config: null,
    _sourcePos: null,
    _destinationPos: null,
    _indexArray: null,
    _posSelector: null,
    _dynamicAnime: null,
    _anime: null,
    _isSelectorActive: false,

    enterFlowEntry: function(preAttack) {
        var pending = preAttack._substitutionJutsuPending;

        delete preAttack._substitutionJutsuPending;

        if (pending === null || typeof pending === 'undefined' ||
            pending.unit === null || pending.unit.getAliveState() !== AliveType.ALIVE ||
            pending.unit.getHp() <= 0) {
            return EnterResult.NOTENTER;
        }

        this._unit = pending.unit;
        this._config = pending.config;
        this._sourcePos = createPos(this._unit.getMapX(), this._unit.getMapY());
        this._destinationPos = this._sourcePos;
        this._indexArray = SubstitutionJutsuControl.createDestinationIndexArray(
            this._unit,
            this._config.range
        );
        this._anime = SubstitutionJutsuControl.getAnime(this._config);

        SubstitutionJutsuControl.removeTriggerState(this._unit, this._config.stateId);

        if (this._anime !== null) {
            this._startAnime(this._sourcePos);
            this.changeCycleMode(SubstitutionJutsuFlowMode.SOURCE_ANIME);
            return EnterResult.OK;
        }

        if (this._beginPositionSelection()) {
            return EnterResult.OK;
        }

        this._cleanup();
        return EnterResult.NOTENTER;
    },

    moveFlowEntry: function() {
        var mode = this.getCycleMode();

        if (mode === SubstitutionJutsuFlowMode.SOURCE_ANIME) {
            return this._moveSourceAnime();
        }
        else if (mode === SubstitutionJutsuFlowMode.POSITION_SELECT) {
            return this._movePositionSelect();
        }
        else if (mode === SubstitutionJutsuFlowMode.DESTINATION_ANIME) {
            return this._moveDestinationAnime();
        }

        this._cleanup();
        return MoveResult.END;
    },

    drawFlowEntry: function() {
        var mode = this.getCycleMode();

        if ((mode === SubstitutionJutsuFlowMode.SOURCE_ANIME ||
            mode === SubstitutionJutsuFlowMode.DESTINATION_ANIME) &&
            this._dynamicAnime !== null) {
            this._dynamicAnime.drawDynamicAnime();
        }
        else if (mode === SubstitutionJutsuFlowMode.POSITION_SELECT &&
            this._posSelector !== null) {
            this._posSelector.drawPosSelector();
        }
    },

    _moveSourceAnime: function() {
        if (this._dynamicAnime.moveDynamicAnime() === MoveResult.CONTINUE) {
            return MoveResult.CONTINUE;
        }

        if (this._beginPositionSelection()) {
            return MoveResult.CONTINUE;
        }

        this._cleanup();
        return MoveResult.END;
    },

    _beginPositionSelection: function() {
        var weapon;

        if (this._indexArray.length === 0) {
            return false;
        }

        this._unit.setInvisible(true);
        this._posSelector = createObject(PosSelector);
        this._posSelector.setPosSelectorType(PosSelectorType.FREE);
        weapon = ItemControl.getEquippedWeapon(this._unit);
        this._posSelector.setPosOnly(this._unit, weapon, this._indexArray, PosMenuType.Item);
        this._isSelectorActive = true;
        this.changeCycleMode(SubstitutionJutsuFlowMode.POSITION_SELECT);
        return true;
    },

    _movePositionSelect: function() {
        var pos;
        var result = this._posSelector.movePosSelector();

        if (result === PosSelectorResult.SELECT) {
            pos = this._posSelector.getSelectorPos(true);
            if (!SubstitutionJutsuControl.isDestinationAllowed(this._unit, pos, this._indexArray)) {
                return MoveResult.CONTINUE;
            }

            this._destinationPos = pos;
            return this._finishPositionSelection();
        }
        else if (result === PosSelectorResult.CANCEL) {
            this._destinationPos = this._sourcePos;
            return this._finishPositionSelection();
        }

        return MoveResult.CONTINUE;
    },

    _finishPositionSelection: function() {
        this._endSelector();
        this._unit.setMapX(this._destinationPos.x);
        this._unit.setMapY(this._destinationPos.y);

        if (this._anime !== null) {
            this._startAnime(this._destinationPos);
            this.changeCycleMode(SubstitutionJutsuFlowMode.DESTINATION_ANIME);
            return MoveResult.CONTINUE;
        }

        this._cleanup();
        return MoveResult.END;
    },

    _moveDestinationAnime: function() {
        if (this._dynamicAnime.moveDynamicAnime() === MoveResult.CONTINUE) {
            return MoveResult.CONTINUE;
        }

        this._cleanup();
        return MoveResult.END;
    },

    _startAnime: function(pos) {
        var x = LayoutControl.getPixelX(pos.x);
        var y = LayoutControl.getPixelY(pos.y);
        var animePos = LayoutControl.getMapAnimationPos(x, y, this._anime);

        this._dynamicAnime = createObject(DynamicAnime);
        this._dynamicAnime.startDynamicAnime(this._anime, animePos.x, animePos.y);
    },

    _endSelector: function() {
        if (this._isSelectorActive && this._posSelector !== null) {
            this._posSelector.endPosSelector();
        }

        this._isSelectorActive = false;
    },

    _cleanup: function() {
        this._endSelector();

        if (this._unit !== null) {
            this._unit.setInvisible(false);
        }
    }
});

(function() {
    // Zero the final incoming damage after all ordinary damage formulas have run.
    var aliasTotalDamage = AttackEvaluator.TotalDamage.evaluateAttackEntry;
    AttackEvaluator.TotalDamage.evaluateAttackEntry = function(virtualActive, virtualPassive, attackEntry) {
        var config = null;

        if (SubstitutionJutsuControl.isTriggerAttack(virtualActive, virtualPassive, attackEntry)) {
            config = SubstitutionJutsuControl.findStateData(virtualPassive.unitSelf);
        }

        if (config !== null) {
            attackEntry.damagePassive = 0;
            attackEntry.damagePassiveFull = 0;
            attackEntry._substitutionJutsu = true;
            attackEntry._substitutionJutsuConfig = config;
            this._parentOrderBuilder._substitutionJutsuStop = true;

            if (config.blockStateAttack === true) {
                attackEntry.stateArrayPassive = [];
            }
        }

        aliasTotalDamage.call(this, virtualActive, virtualPassive, attackEntry);
    };

    // Stop building further attacks without setting isFinish, which would select
    // death/finishing motions in real battle.
    var aliasSetDamage = NormalAttackOrderBuilder._setDamage;
    NormalAttackOrderBuilder._setDamage = function(virtualActive, virtualPassive) {
        var result = aliasSetDamage.call(this, virtualActive, virtualPassive);

        if (this._substitutionJutsuStop === true) {
            this._substitutionJutsuStop = false;
            return true;
        }

        return result;
    };

    // Record the trigger when the marked attack entry is actually executed.
    var aliasAttackAction = AttackFlow._doAttackAction;
    AttackFlow._doAttackAction = function() {
        var preAttack, pending;
        var entry = this._order.getCurrentEntry();

        if (entry._substitutionJutsu === true) {
            pending = {
                unit: this._order.getPassiveUnit(),
                config: entry._substitutionJutsuConfig
            };
        }

        aliasAttackAction.call(this);

        if (pending !== null && typeof pending !== 'undefined') {
            preAttack = AttackControl.getPreAttackObject();
            if (preAttack !== null) {
                preAttack._substitutionJutsuPending = pending;
            }
        }
    };

    var aliasPushEndFlow = PreAttack._pushFlowEntriesEnd;
    PreAttack._pushFlowEntriesEnd = function(straightFlow) {
        aliasPushEndFlow.call(this, straightFlow);
        straightFlow.pushFlowEntry(SubstitutionJutsuFlowEntry);
    };
})();
