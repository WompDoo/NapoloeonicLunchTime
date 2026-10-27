/** A message with a form per plural category; English needs only "one" and "other". */
export interface PluralMessage {
  readonly one: string;
  readonly other: string;
}

export type Message = string | PluralMessage;

export type Catalogue = Readonly<Record<string, Message>>;

export type TranslationParams = Readonly<Record<string, string | number>>;
