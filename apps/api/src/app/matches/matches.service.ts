import { Inject, Injectable } from '@nestjs/common';
import type {
  CreateMatchRequest,
  JoinMatchRequest,
  MatchCreated,
  MatchDto,
  PickCommanderRequest,
  PlayerJoined,
  ReadyRequest,
  SpyRequest,
  SubmitOrdersRequest,
} from '@lunch-campaign/contracts';
import { toPlayerId, toZoneId } from '@lunch-campaign/engine';
import type { SpyReport } from '@lunch-campaign/player-view';
import { hashPlayerToken } from '../auth/player-authenticator';
import { domainError } from '../errors/domain-error';
import type { MatchStore, PlayerKey, SavedMatch } from '../persistence/match-store';
import { MATCH_STORE } from '../persistence/match-store';
import type { Clock } from '../platform/clock';
import { CLOCK } from '../platform/clock';
import type { RandomSource } from '../platform/random-source';
import { RANDOM_SOURCE } from '../platform/random-source';
import {
  joinLobby,
  leaveLobby,
  openLobby,
  pickCommander,
  setReady,
} from './lobby';
import { matchDtoFor } from './match-dto-for-player';
import { nextResolutionAt, sendSpy, submitOrders } from './match-play';
import type { MatchSettings } from './match-settings';
import { MATCH_SETTINGS } from './match-settings';
import type { StoredMatch } from './stored-match';

/** Every player action: read the match, apply the rules, save it, answer with what the player may see. */
@Injectable()
export class MatchesService {
  public constructor(
    @Inject(MATCH_STORE) private readonly store: MatchStore,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(RANDOM_SOURCE) private readonly random: RandomSource,
    @Inject(MATCH_SETTINGS) private readonly settings: MatchSettings,
  ) {}

  public createMatch(request: CreateMatchRequest): MatchCreated {
    const match = openLobby({
      matchId: this.random.id(),
      inviteCode: this.random.secret(),
      timeZone: request.timeZone,
      now: this.clock.now(),
    });
    this.store.insert(match);
    return { matchId: match.matchId, inviteCode: match.inviteCode };
  }

  public join(inviteCode: string, request: JoinMatchRequest): PlayerJoined {
    return this.store.inTransaction((): PlayerJoined => {
      const saved = this.requireInvite(inviteCode);
      const playerId = toPlayerId(this.random.id());
      const playerToken = this.random.secret();
      this.save(
        saved,
        joinLobby(saved.match, { playerId, name: request.name }, this.settings),
      );
      this.store.addPlayerToken({
        tokenHash: hashPlayerToken(playerToken),
        matchId: saved.match.matchId,
        playerId,
      });
      return { matchId: saved.match.matchId, playerId, playerToken };
    });
  }

  public view(player: PlayerKey): MatchDto {
    return this.dtoFor(this.requireMatch(player.matchId).match, player);
  }

  public pickCommander(
    player: PlayerKey,
    request: PickCommanderRequest,
  ): MatchDto {
    return this.change(
      player,
      (match): StoredMatch =>
        pickCommander(
          match,
          player.playerId,
          request.commanderId,
          this.settings,
        ),
    );
  }

  public setReady(player: PlayerKey, request: ReadyRequest): MatchDto {
    return this.change(
      player,
      (match): StoredMatch =>
        setReady(
          match,
          player.playerId,
          request.ready,
          {
            now: this.clock.now(),
            drawMatchSeed: (): string => this.random.secret(),
          },
          this.settings,
        ),
    );
  }

  public leave(player: PlayerKey): void {
    this.store.inTransaction((): void => {
      const saved = this.requireMatch(player.matchId);
      this.save(saved, leaveLobby(saved.match, player.playerId));
      this.store.removePlayerTokens(player);
    });
  }

  public submitOrders(
    player: PlayerKey,
    request: SubmitOrdersRequest,
  ): MatchDto {
    return this.change(
      player,
      (match): StoredMatch =>
        submitOrders(
          match,
          player.playerId,
          request.orders,
          this.clock.now(),
          this.settings,
        ),
    );
  }

  public spy(player: PlayerKey, request: SpyRequest): SpyReport {
    return this.store.inTransaction((): SpyReport => {
      const saved = this.requireMatch(player.matchId);
      const outcome = sendSpy(
        saved.match,
        player.playerId,
        toZoneId(request.zoneId),
        this.clock.now(),
        this.settings,
      );
      this.save(saved, outcome.match);
      return outcome.report;
    });
  }

  private change(
    player: PlayerKey,
    apply: (match: StoredMatch) => StoredMatch,
  ): MatchDto {
    return this.store.inTransaction((): MatchDto => {
      const saved = this.requireMatch(player.matchId);
      return this.dtoFor(this.save(saved, apply(saved.match)).match, player);
    });
  }

  private save(saved: SavedMatch, next: StoredMatch): SavedMatch {
    return this.store.update(
      saved,
      next,
      nextResolutionAt(next, this.settings.config),
    );
  }

  private requireMatch(matchId: string): SavedMatch {
    const saved = this.store.find(matchId);
    if (saved === undefined) {
      throw domainError('match.notFound', `No match ${matchId}`);
    }
    return saved;
  }

  private requireInvite(inviteCode: string): SavedMatch {
    const saved = this.store.findByInviteCode(inviteCode);
    if (saved === undefined) {
      throw domainError('lobby.unknownInvite', 'This invite link is not valid');
    }
    return saved;
  }

  private dtoFor(match: StoredMatch, player: PlayerKey): MatchDto {
    return matchDtoFor(match, player.playerId, this.clock.now(), this.settings);
  }
}
