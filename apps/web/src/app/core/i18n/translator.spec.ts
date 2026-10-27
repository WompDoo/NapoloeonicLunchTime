import { TestBed } from '@angular/core/testing';
import type { Catalogue, TranslationParams } from './catalogue';
import type { TranslationKey } from './en';
import { CATALOGUE, Translator } from './translator';

const TEST_CATALOGUE: Catalogue = {
  'app.name': 'Lunch Campaign',
  'join.title': 'Hello, {name}',
  'common.units': { one: '{count} unit', other: '{count} units' },
};

function translatorWith(catalogue: Catalogue): Translator {
  TestBed.configureTestingModule({
    providers: [{ provide: CATALOGUE, useValue: catalogue }],
  });
  return TestBed.inject(Translator);
}

interface TranslationCase {
  readonly key: TranslationKey;
  readonly params: TranslationParams;
  readonly expected: string;
}

const CASES: readonly TranslationCase[] = [
  { key: 'app.name', params: {}, expected: 'Lunch Campaign' },
  { key: 'join.title', params: { name: 'Ana' }, expected: 'Hello, Ana' },
  { key: 'join.title', params: {}, expected: 'Hello, {name}' },
  { key: 'common.units', params: { count: 1 }, expected: '1 unit' },
  { key: 'common.units', params: { count: 0 }, expected: '0 units' },
  { key: 'common.units', params: { count: 5 }, expected: '5 units' },
  { key: 'home.title', params: {}, expected: 'home.title' },
];

describe('Translator', () => {
  it.each(CASES)(
    'says $key with $params as "$expected"',
    ({ key, params, expected }) => {
      expect(translatorWith(TEST_CATALOGUE).translate(key, params)).toBe(
        expected,
      );
    },
  );

  it('translates without parameters', () => {
    expect(translatorWith(TEST_CATALOGUE).translate('app.name')).toBe(
      'Lunch Campaign',
    );
  });

  it('translates a message built in code', () => {
    expect(
      translatorWith(TEST_CATALOGUE).translateMessage({
        key: 'join.title',
        params: { name: 'Bo' },
      }),
    ).toBe('Hello, Bo');
  });

  it('uses the English catalogue by default', () => {
    expect(TestBed.inject(Translator).translate('app.name')).toBe(
      'Lunch Campaign',
    );
  });
});
