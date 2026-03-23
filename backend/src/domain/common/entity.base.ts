export abstract class EntityBase<TId = string> {
  protected constructor(public readonly id: TId) {}
}

