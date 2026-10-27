import { TestBed } from '@angular/core/testing';
import { MemoryStorage } from '../../../testing/memory-storage';
import { RecordingSink } from '../../../testing/recording-sink';
import { session } from '../../../testing/match-fixtures';
import { ERROR_SINK } from '../errors/error-reporter';
import { PlayerSessions, SESSION_STORAGE } from './player-sessions';

describe('PlayerSessions', () => {
  function sessionsWith(
    storage: Storage,
    sink = new RecordingSink(),
  ): PlayerSessions {
    TestBed.configureTestingModule({
      providers: [
        { provide: SESSION_STORAGE, useValue: storage },
        { provide: ERROR_SINK, useValue: sink },
      ],
    });
    return TestBed.inject(PlayerSessions);
  }

  it('starts empty on a new device', () => {
    expect(sessionsWith(new MemoryStorage()).all()).toEqual([]);
  });

  it('remembers a joined match across visits', () => {
    const storage = new MemoryStorage();
    sessionsWith(storage).save(session());
    TestBed.resetTestingModule();
    const later = sessionsWith(storage);
    expect(later.sessionFor('match-1')).toEqual(session());
    expect(later.tokenFor('match-1')).toBe('token-a');
  });

  it('keeps one session per match, the latest', () => {
    const sessions = sessionsWith(new MemoryStorage());
    sessions.save(session({ playerToken: 'old' }));
    sessions.save(session({ playerToken: 'new' }));
    sessions.save(session({ matchId: 'match-2', playerToken: 'other' }));
    expect(sessions.all().map((saved) => saved.playerToken)).toEqual([
      'new',
      'other',
    ]);
  });

  it('forgets a match it left', () => {
    const sessions = sessionsWith(new MemoryStorage());
    sessions.save(session());
    sessions.forget('match-1');
    expect(sessions.sessionFor('match-1')).toBeNull();
    expect(sessions.tokenFor('match-1')).toBeNull();
  });

  it('keeps working for the visit when storage cannot be read, and reports it', () => {
    const storage = new MemoryStorage();
    storage.failing = true;
    const sink = new RecordingSink();
    const sessions = sessionsWith(storage, sink);
    expect(sessions.all()).toEqual([]);
    expect(sink.reports).toEqual([
      { error: expect.any(DOMException), severity: 'warning' },
    ]);
  });

  it('keeps a session for the visit when storage cannot be written, and reports it', () => {
    const storage = new MemoryStorage();
    const sink = new RecordingSink();
    const sessions = sessionsWith(storage, sink);
    storage.failing = true;
    sessions.save(session());
    expect(sessions.sessionFor('match-1')).toEqual(session());
    expect(sink.reports).toHaveLength(1);
  });

  it('uses local storage by default', () => {
    localStorage.clear();
    TestBed.inject(PlayerSessions).save(session());
    expect(localStorage.getItem('lunch-campaign.sessions')).toContain(
      'token-a',
    );
    localStorage.clear();
  });
});
