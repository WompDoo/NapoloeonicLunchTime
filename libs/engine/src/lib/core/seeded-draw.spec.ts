import { seededIndex } from './random';
import { seededDrawOrder } from './seeded-draw';

describe('seededDrawOrder', () => {
  const pool = ['a', 'b', 'c', 'd', 'e'];

  it('draws every item exactly once, the same way for the same label', () => {
    const order = seededDrawOrder(pool, 'seed');
    expect(order.toSorted()).toEqual(pool);
    expect(seededDrawOrder(pool, 'seed')).toEqual(order);
  });

  it('draws one at a time with a labelled seed per draw', () => {
    const first = pool[seededIndex('seed:0', pool.length)];
    const rest = pool.filter((item) => item !== first);
    expect(seededDrawOrder(pool, 'seed').slice(0, 2)).toEqual([
      first,
      rest[seededIndex('seed:1', rest.length)],
    ]);
  });

  it('gives different orders for different labels', () => {
    const orders = new Set(
      Array.from({ length: 20 }, (_, index) =>
        seededDrawOrder(pool, `seed-${index}`).join(''),
      ),
    );
    expect(orders.size).toBeGreaterThan(10);
  });

  it('draws nothing from an empty pool', () => {
    expect(seededDrawOrder([], 'seed')).toEqual([]);
  });
});
