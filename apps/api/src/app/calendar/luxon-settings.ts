import { Settings } from 'luxon';

/*
 * Invalid dates throw instead of turning into silent "Invalid DateTime" values, and the types follow:
 * formatting methods return strings, never null.
 */
declare module 'luxon' {
  interface TSSettings {
    throwOnInvalid: true;
  }
}

Settings.throwOnInvalid = true;
