import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import type { MatchCreated, MatchDto } from '@lunch-campaign/contracts';
import {
  decodeCreateMatchRequest,
  decodePickCommanderRequest,
  decodePreviewRequest,
  decodeReadyRequest,
  decodeSpyRequest,
  decodeSubmitOrdersRequest,
} from '@lunch-campaign/contracts';
import type { MatchupPreview, SpyReport } from '@lunch-campaign/player-view';
import { PlayerAuthenticator } from '../auth/player-authenticator';
import { MatchesService } from '../matches/matches.service';

/**
 * Bodies arrive as `unknown` and go through the contracts' decoders, the same ones the web client can use;
 * every route but creating a match needs the player's token.
 */
@Controller('matches')
export class MatchesController {
  public constructor(
    private readonly matches: MatchesService,
    private readonly players: PlayerAuthenticator,
  ) {}

  @Post()
  public createMatch(@Body() body: unknown): MatchCreated {
    return this.matches.createMatch(decodeCreateMatchRequest(body));
  }

  @Get(':matchId')
  public view(
    @Param('matchId') matchId: string,
    @Headers('authorization') authorization: string | undefined,
  ): MatchDto {
    return this.matches.view(this.players.authenticate(authorization, matchId));
  }

  @Put(':matchId/commander')
  public pickCommander(
    @Param('matchId') matchId: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): MatchDto {
    return this.matches.pickCommander(
      this.players.authenticate(authorization, matchId),
      decodePickCommanderRequest(body),
    );
  }

  @Put(':matchId/ready')
  public setReady(
    @Param('matchId') matchId: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): MatchDto {
    return this.matches.setReady(
      this.players.authenticate(authorization, matchId),
      decodeReadyRequest(body),
    );
  }

  @Delete(':matchId/players/me')
  @HttpCode(HttpStatus.NO_CONTENT)
  public leave(
    @Param('matchId') matchId: string,
    @Headers('authorization') authorization: string | undefined,
  ): void {
    this.matches.leave(this.players.authenticate(authorization, matchId));
  }

  @Put(':matchId/orders')
  public submitOrders(
    @Param('matchId') matchId: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): MatchDto {
    return this.matches.submitOrders(
      this.players.authenticate(authorization, matchId),
      decodeSubmitOrdersRequest(body),
    );
  }

  @Post(':matchId/spies')
  public spy(
    @Param('matchId') matchId: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): SpyReport {
    return this.matches.spy(
      this.players.authenticate(authorization, matchId),
      decodeSpyRequest(body),
    );
  }

  @Post(':matchId/preview')
  @HttpCode(HttpStatus.OK)
  public preview(
    @Param('matchId') matchId: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): MatchupPreview {
    return this.matches.preview(
      this.players.authenticate(authorization, matchId),
      decodePreviewRequest(body),
    );
  }
}
