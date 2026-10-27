import type { ComponentFixture } from '@angular/core/testing';

/** The rendered text, whitespace collapsed, as a reader would take it in. */
export function textOf(fixture: ComponentFixture<unknown>): string {
  return normalise((fixture.nativeElement as HTMLElement).textContent);
}

export function normalise(text: string | null): string {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

export function query<TElement extends Element>(
  fixture: ComponentFixture<unknown>,
  selector: string,
): TElement {
  const element = (
    fixture.nativeElement as HTMLElement
  ).querySelector<TElement>(selector);
  if (element === null) {
    throw new Error(`Nothing matches ${selector}`);
  }
  return element;
}

export function queryAll<TElement extends Element>(
  fixture: ComponentFixture<unknown>,
  selector: string,
): readonly TElement[] {
  return [
    ...(fixture.nativeElement as HTMLElement).querySelectorAll<TElement>(
      selector,
    ),
  ];
}

/** The button whose text is (or matches) the name. */
export function buttonNamed(
  fixture: ComponentFixture<unknown>,
  name: string | RegExp,
): HTMLButtonElement {
  const button = queryAll<HTMLButtonElement>(fixture, 'button').find(
    (candidate) =>
      typeof name === 'string'
        ? normalise(candidate.textContent) === name
        : name.test(normalise(candidate.textContent)),
  );
  if (button === undefined) {
    throw new Error(`No button named ${String(name)}`);
  }
  return button;
}

export function hasButton(
  fixture: ComponentFixture<unknown>,
  name: string | RegExp,
): boolean {
  try {
    buttonNamed(fixture, name);
    return true;
  } catch {
    return false;
  }
}

/** Sets a form control's value and tells Angular, as typing or choosing would. */
export function enter(
  element: HTMLInputElement | HTMLSelectElement,
  value: string,
  eventName = 'input',
): void {
  element.value = value;
  element.dispatchEvent(new Event(eventName));
}

/** Chooses the option with this label in a select. */
export function choose(select: HTMLSelectElement, label: string): void {
  const option = [...select.options].find(
    (candidate) => normalise(candidate.textContent) === label,
  );
  if (option === undefined) {
    throw new Error(`No option ${label} in #${select.id}`);
  }
  select.value = option.value;
  select.dispatchEvent(new Event('change'));
}

/** The label of the option a select shows. */
export function selectedLabel(select: HTMLSelectElement): string {
  return [...select.selectedOptions]
    .map((option) => normalise(option.textContent))
    .join(', ');
}

export function optionLabels(select: HTMLSelectElement): readonly string[] {
  return [...select.options].map((option) => normalise(option.textContent));
}

export function press(element: Element, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
  });
  element.dispatchEvent(event);
  return event;
}
