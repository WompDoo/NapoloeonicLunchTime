import type { Type } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

/** Creates the component with these inputs and waits until it has rendered. */
export async function render<TComponent>(
  component: Type<TComponent>,
  inputs: Readonly<Record<string, unknown>> = {},
): Promise<ComponentFixture<TComponent>> {
  const fixture = TestBed.createComponent(component);
  Object.entries(inputs).forEach(([name, value]) => {
    fixture.componentRef.setInput(name, value);
  });
  await fixture.whenStable();
  return fixture;
}

/** Renders while requests are pending: whenStable would wait for them, so only run change detection. */
export function renderPending<TComponent>(
  component: Type<TComponent>,
  inputs: Readonly<Record<string, unknown>> = {},
): ComponentFixture<TComponent> {
  const fixture = TestBed.createComponent(component);
  Object.entries(inputs).forEach(([name, value]) => {
    fixture.componentRef.setInput(name, value);
  });
  fixture.detectChanges();
  return fixture;
}
