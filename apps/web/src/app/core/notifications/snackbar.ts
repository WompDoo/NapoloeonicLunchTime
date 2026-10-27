import { Injectable, signal } from '@angular/core';
import type { Signal } from '@angular/core';

export interface SnackbarMessage {
  readonly id: number;
  readonly text: string;
}

export const SNACKBAR_DURATION_MS = 7_000;

/** One message at a time; a new one replaces the old. Text arrives already translated. */
@Injectable({ providedIn: 'root' })
export class Snackbar {
  private readonly current = signal<SnackbarMessage | null>(null);
  private nextId = 1;
  private timer: ReturnType<typeof setTimeout> | undefined;

  public readonly message: Signal<SnackbarMessage | null> =
    this.current.asReadonly();

  public show(text: string): void {
    const message = { id: this.nextId++, text };
    this.current.set(message);
    clearTimeout(this.timer);
    this.timer = setTimeout((): void => {
      this.dismiss(message.id);
    }, SNACKBAR_DURATION_MS);
  }

  public dismiss(id: number): void {
    this.current.update((message): SnackbarMessage | null =>
      isMessage(message, id) ? null : message,
    );
  }
}

function isMessage(message: SnackbarMessage | null, id: number): boolean {
  return message !== null && message.id === id;
}
