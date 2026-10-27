import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { query, normalise } from '../testing/dom';
import { App } from './app';

describe('App', () => {
  it('has a skip link to the main content and the masthead', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect(query(fixture, '.skip-link').getAttribute('href')).toBe('#main');
    expect(normalise(query(fixture, '.masthead__name').textContent)).toBe(
      'Lunch Campaign',
    );
    expect(query(fixture, 'main#main')).toBeDefined();
  });
});
