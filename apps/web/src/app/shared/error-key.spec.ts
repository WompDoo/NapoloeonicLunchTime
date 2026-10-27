import { errorKeyOf } from './error-key';

describe('errorKeyOf', () => {
  it('names the message for the error code', () => {
    expect(
      errorKeyOf({
        statusCode: 409,
        code: 'lobby.full',
        message: '',
        problems: [],
      }),
    ).toBe('errors.lobby.full');
  });
});
