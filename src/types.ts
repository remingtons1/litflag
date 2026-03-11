export type FlagRule = {
  match: Record<string, string | number | boolean | string[]>
  value: boolean
}

export type FlagDefinition =
  | boolean
  | {
      enabled: boolean
      rules?: FlagRule[]
      percentage?: number
    }

export type FlagConfig = Record<string, FlagDefinition>

export type FlagContext = Record<string, string | number | boolean>

export interface FlagInstance<T extends FlagConfig> {
  isEnabled<K extends keyof T & string>(name: K, context?: FlagContext): boolean
  getAll(context?: FlagContext): Record<keyof T, boolean>
  override<K extends keyof T & string>(name: K, value: boolean): void
  clearOverrides(): void
}
