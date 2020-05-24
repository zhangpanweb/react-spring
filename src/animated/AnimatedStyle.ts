import Animated, { AnimatedObject } from './Animated'
import * as Globals from './Globals'

export default class AnimatedStyle<
  Payload extends object & { transform?: Animated } = {}
> extends AnimatedObject<Payload> {
  constructor(style: Payload = {} as Payload) {
    super()
    // 如果存在 style.transform，并且 style.transform 不是 Animated 的实例，转化 style
    if (style.transform && !(style.transform instanceof Animated)) {
      style = Globals.applyAnimatedValues.transform(style)
    }
    this.payload = style
  }
}
