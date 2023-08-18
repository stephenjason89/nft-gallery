import type { Prefix as ChainPrefix } from '@kodadot1/static'

export type Prefix = ChainPrefix
export type PartialConfig<T> = {
  [K in Prefix]?: T
}
