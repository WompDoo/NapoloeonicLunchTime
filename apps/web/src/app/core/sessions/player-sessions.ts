import { Injectable, inject, InjectionToken, signal } from '@angular/core';
import type { Signal } from '@angular/core';
import { ErrorReporter } from '../errors/error-reporter';

/** This device's seat in one match. The token is the player's only key to their view. */
export interface PlayerSession {
  readonly matchId: string;
  readonly playerId: string;
  readonly playerToken: string;
  readonly name: string;
}

export const SESSION_STORAGE = new InjectionToken<Storage>('SessionStorage', {
  factory: (): Storage => localStorage,
});

const STORAGE_KEY = 'lunch-campaign.sessions';

/**
 * The matches this device has joined, kept in local storage. If storage is unavailable or unreadable,
 * the app keeps working for this visit and the failure is reported, never ignored.
 */
@Injectable({ providedIn: 'root' })
export class PlayerSessions {
  private readonly storage = inject(SESSION_STORAGE);
  private readonly reporter = inject(ErrorReporter);
  private readonly current = signal<readonly PlayerSession[]>(this.load());

  public readonly all: Signal<readonly PlayerSession[]> =
    this.current.asReadonly();

  /** Reads the sessions signal, so a computed calling it follows joins and leaves. */
  public sessionFor(matchId: string): PlayerSession | null {
    return (
      this.current().find((session): boolean => session.matchId === matchId) ??
      null
    );
  }

  public tokenFor(matchId: string): string | null {
    const session = this.sessionFor(matchId);
    return session === null ? null : session.playerToken;
  }

  public save(session: PlayerSession): void {
    this.current.update((sessions): PlayerSession[] => [
      ...sessions.filter(
        (existing): boolean => existing.matchId !== session.matchId,
      ),
      session,
    ]);
    this.persist();
  }

  public forget(matchId: string): void {
    this.current.update((sessions): PlayerSession[] =>
      sessions.filter((session): boolean => session.matchId !== matchId),
    );
    this.persist();
  }

  private load(): readonly PlayerSession[] {
    try {
      return parseSessions(this.storage.getItem(STORAGE_KEY));
    } catch (error) {
      this.reporter.report(error, 'warning');
      return [];
    }
  }

  private persist(): void {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.current()));
    } catch (error) {
      this.reporter.report(error, 'warning');
    }
  }
}

function parseSessions(text: string | null): readonly PlayerSession[] {
  return text === null ? [] : (JSON.parse(text) as readonly PlayerSession[]);
}
