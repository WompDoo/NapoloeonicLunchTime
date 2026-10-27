import type { ArgumentsHost } from '@nestjs/common';
import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import type { ApiError } from '@lunch-campaign/contracts';
import { InvalidRequestError } from '@lunch-campaign/contracts';
import { DomainError, domainError } from '../errors/domain-error';
import { ApiExceptionFilter } from './api-exception.filter';

function sent(exception: unknown): ApiError {
  const response = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;
  new ApiExceptionFilter().catch(exception, host);
  const [body] = response.json.mock.calls[0] as [ApiError];
  expect(response.status).toHaveBeenCalledWith(body.statusCode);
  return body;
}

describe('ApiExceptionFilter', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each<{ readonly name: string; readonly exception: unknown; readonly body: ApiError }>([
    {
      name: 'a refused order submission, with its problems',
      exception: new DomainError('orders.invalid', '1 orders were refused', [
        { orderIndex: 0, reason: 'zonesNotAdjacent' },
      ]),
      body: {
        statusCode: 422,
        code: 'orders.invalid',
        message: '1 orders were refused',
        problems: [{ orderIndex: 0, reason: 'zonesNotAdjacent' }],
      },
    },
    {
      name: 'a closed day',
      exception: domainError('day.closed', 'closed'),
      body: { statusCode: 409, code: 'day.closed', message: 'closed', problems: [] },
    },
    {
      name: 'a body it cannot read',
      exception: new InvalidRequestError('body.ready must be true or false'),
      body: {
        statusCode: 400,
        code: 'request.invalid',
        message: 'body.ready must be true or false',
        problems: [],
      },
    },
    {
      name: 'an unknown route',
      exception: new NotFoundException('Cannot GET /nowhere'),
      body: {
        statusCode: 404,
        code: 'route.notFound',
        message: 'Cannot GET /nowhere',
        problems: [],
      },
    },
    {
      name: 'malformed JSON',
      exception: new BadRequestException('Unexpected token'),
      body: {
        statusCode: 400,
        code: 'request.invalid',
        message: 'Unexpected token',
        problems: [],
      },
    },
  ])('sends $name', ({ exception, body }) => {
    expect(sent(exception)).toEqual(body);
  });

  it('hides and logs anything unexpected', () => {
    const log = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const crash = new TypeError('secret internals');
    expect(sent(crash)).toEqual({
      statusCode: 500,
      code: 'internal',
      message: 'Something went wrong on our side',
      problems: [],
    });
    expect(log).toHaveBeenCalledWith('Unexpected error', crash);
  });
});
