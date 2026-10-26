import type {
  MultiplierMatrix,
  UnitType,
  UnitTypeRecord,
} from '../core/unit-types';
import { UNIT_TYPES } from '../core/unit-types';
import type { BattleRole } from '../combat/battle';
import type { EffectiveParameters } from './parameters';

type ParameterNameOfType<TValue> = {
  readonly [TName in keyof EffectiveParameters]: [
    EffectiveParameters[TName],
  ] extends [TValue]
    ? [TValue] extends [EffectiveParameters[TName]]
      ? TName
      : never
    : never;
}[keyof EffectiveParameters];

export type NumberParameterName = ParameterNameOfType<number>;
export type FlagParameterName = ParameterNameOfType<boolean>;
export type UnitTypeNumberParameterName = ParameterNameOfType<
  UnitTypeRecord<number>
>;
export type MatrixParameterName = ParameterNameOfType<MultiplierMatrix>;
export type UnitTypeListParameterName = ParameterNameOfType<
  readonly UnitType[]
>;

export type NumericOperation = 'set' | 'add' | 'multiply';

interface PatchBase {
  /** When true, the patch only applies in the zone the ability targets (e.g. Reverse Slope). */
  readonly onlyInTargetZone?: boolean;
}

export interface NumberPatch extends PatchBase {
  readonly kind: 'number';
  readonly parameter: NumberParameterName;
  readonly operation: NumericOperation;
  readonly value: number;
}

export interface FlagPatch extends PatchBase {
  readonly kind: 'flag';
  readonly parameter: FlagParameterName;
  readonly value: boolean;
}

export interface UnitTypeNumberPatch extends PatchBase {
  readonly kind: 'unitTypeNumber';
  readonly parameter: UnitTypeNumberParameterName;
  readonly unitType: UnitType;
  readonly operation: NumericOperation;
  readonly value: number;
}

export interface MatrixCellPatch extends PatchBase {
  readonly kind: 'matrixCell';
  readonly parameter: MatrixParameterName;
  readonly row: UnitType;
  readonly column: UnitType;
  readonly operation: NumericOperation;
  readonly value: number;
}

export interface UnitTypeListPatch extends PatchBase {
  readonly kind: 'addUnitTypes';
  readonly parameter: UnitTypeListParameterName;
  readonly unitTypes: readonly UnitType[];
}

export interface StrengthBonusPatch extends PatchBase {
  readonly kind: 'addStrengthBonus';
  readonly role: BattleRole;
  readonly value: number;
}

/** A change to one effective parameter. Patches are data, so modifiers stay serialisable. */
export type ParameterPatch =
  | NumberPatch
  | FlagPatch
  | UnitTypeNumberPatch
  | MatrixCellPatch
  | UnitTypeListPatch
  | StrengthBonusPatch;

type PatchOfKind<TKind extends ParameterPatch['kind']> = Extract<
  ParameterPatch,
  { readonly kind: TKind }
>;

type PatchAppliers = {
  readonly [TKind in ParameterPatch['kind']]: (
    parameters: EffectiveParameters,
    patch: PatchOfKind<TKind>,
    source: string,
  ) => EffectiveParameters;
};

const NUMERIC_OPERATIONS: Readonly<
  Record<NumericOperation, (current: number, value: number) => number>
> = {
  set: (_current, value): number => value,
  add: (current, value): number => current + value,
  multiply: (current, value): number => current * value,
};

const PATCH_APPLIERS: PatchAppliers = {
  number: (parameters, patch): EffectiveParameters =>
    withParameter(
      parameters,
      patch.parameter,
      NUMERIC_OPERATIONS[patch.operation](
        parameters[patch.parameter],
        patch.value,
      ),
    ),
  flag: (parameters, patch): EffectiveParameters =>
    withParameter(parameters, patch.parameter, patch.value),
  unitTypeNumber: (parameters, patch): EffectiveParameters =>
    withParameter(parameters, patch.parameter, {
      ...parameters[patch.parameter],
      [patch.unitType]: NUMERIC_OPERATIONS[patch.operation](
        parameters[patch.parameter][patch.unitType],
        patch.value,
      ),
    }),
  matrixCell: (parameters, patch): EffectiveParameters => {
    const matrix = parameters[patch.parameter];
    const row = matrix[patch.row];
    return withParameter(parameters, patch.parameter, {
      ...matrix,
      [patch.row]: {
        ...row,
        [patch.column]: NUMERIC_OPERATIONS[patch.operation](
          row[patch.column],
          patch.value,
        ),
      },
    });
  },
  addUnitTypes: (parameters, patch): EffectiveParameters =>
    withParameter(
      parameters,
      patch.parameter,
      UNIT_TYPES.filter(
        (unitType): boolean =>
          parameters[patch.parameter].includes(unitType) ||
          patch.unitTypes.includes(unitType),
      ),
    ),
  addStrengthBonus: (parameters, patch, source): EffectiveParameters => ({
    ...parameters,
    strengthBonuses: [
      ...parameters.strengthBonuses,
      { source, role: patch.role, value: patch.value },
    ],
  }),
};

export function applyParameterPatch(
  parameters: EffectiveParameters,
  patch: ParameterPatch,
  source: string,
): EffectiveParameters {
  const applier = PATCH_APPLIERS[patch.kind] as (
    parameters: EffectiveParameters,
    patch: ParameterPatch,
    source: string,
  ) => EffectiveParameters;
  return applier(parameters, patch, source);
}

function withParameter<TName extends keyof EffectiveParameters>(
  parameters: EffectiveParameters,
  name: TName,
  value: EffectiveParameters[TName],
): EffectiveParameters {
  return { ...parameters, [name]: value };
}
