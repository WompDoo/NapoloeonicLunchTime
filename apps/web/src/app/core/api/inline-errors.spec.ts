import { TestBed } from '@angular/core/testing';
import type { ApiError } from '@lunch-campaign/contracts';
import { InlineErrors } from './inline-errors';

const REFUSAL: ApiError = {
  statusCode: 409,
  code: 'lobby.full',
  message: 'full',
  problems: [],
};

describe('InlineErrors', () => {
  it('keeps the latest refusal per form until it is cleared', () => {
    const errors = TestBed.inject(InlineErrors);
    const join = errors.for('join');
    const lobby = errors.for('lobby');
    errors.set('join', REFUSAL);
    expect(join()).toBe(REFUSAL);
    expect(lobby()).toBeNull();
    errors.clear('join');
    expect(join()).toBeNull();
  });
});
