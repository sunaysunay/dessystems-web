import { type CreateCaseDTO, type ChannelKind } from '../types';

export interface ChannelAdapter {
  readonly kind: ChannelKind;
  parse(input: unknown): Promise<CreateCaseDTO>;
}
