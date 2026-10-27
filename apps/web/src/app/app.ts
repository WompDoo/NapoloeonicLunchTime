import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { TranslatePipe } from './core/i18n/translate-pipe';
import { SnackbarHost } from './core/notifications/snackbar-host';

@Component({
  selector: 'lc-root',
  imports: [RouterOutlet, RouterLink, SnackbarHost, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
