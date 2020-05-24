export default abstract class Animated<Payload = unknown> {
  public abstract getValue(): any
  public getAnimatedValue() {
    return this.getValue()
  }

  protected payload?: Payload
  public getPayload() {
    return this.payload || this // 获取 payload 
  }

  public attach(): void {}

  public detach(): void {}

  private children: Animated[] = []

  public getChildren() { // 获取 children
    return this.children
  }

  public addChild(child: Animated) {
    if (this.children.length === 0) this.attach() // 如果 this.children 长度为 0 ，attach
    this.children.push(child) // 否则 push 到 this.children 中
  }

  public removeChild(child: Animated) {
    const index = this.children.indexOf(child)
    this.children.splice(index, 1) // 找到指定 child 并将其从 children 中去除
    if (this.children.length === 0) this.detach() // 如果 children 空了，执行 detach
  }
}

export abstract class AnimatedArray<Payload = unknown> extends Animated<
  Payload[]
> {
  protected payload = [] as Payload[]

  attach = () =>
    this.payload.forEach(p => p instanceof Animated && p.addChild(this))

  detach = () =>
    this.payload.forEach(p => p instanceof Animated && p.removeChild(this))
}

export abstract class AnimatedObject<
  Payload extends { [key: string]: unknown }
> extends Animated<Payload> {
  protected payload = {} as Payload

  getValue(animated = false) {
    const payload: { [key: string]: any } = {}
    for (const key in this.payload) {
      const value = this.payload[key] // 遍历 this.payload
      if (animated && !(value instanceof Animated)) continue // 如果 animated 为 true 并且 值不是 Animated 的实例，直接忽略
      payload[key] =
        value instanceof Animated
          // 值是 Animated 实例，animated 为 true 时 用 getAnimatedValue 获取值，否则用 getValue 获取值
          ? value[animated ? 'getAnimatedValue' : 'getValue']()
          : value // 否则直接返回值
    }
    return payload
  }

  getAnimatedValue() {
    return this.getValue(true)
  }

  attach = () =>
    Object.values(this.payload).forEach(
      s => s instanceof Animated && s.addChild(this)
    )

  detach = () =>
    Object.values(this.payload).forEach(
      s => s instanceof Animated && s.removeChild(this)
    )
}
