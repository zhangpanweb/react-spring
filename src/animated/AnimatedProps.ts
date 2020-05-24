import { AnimatedObject } from './Animated'
import * as Globals from './Globals'

/**
 * Wraps the `style` property with `AnimatedStyle`.
 */
export default class AnimatedProps<
  Props extends object & { style?: any } = {}
> extends AnimatedObject<Props> {
  update: () => void

  constructor(props: Props, callback: () => void) {
    super()
    this.payload = !props.style
      ? props // 如果 props 没有 style 属性，直接使用 props
      : {
          ...props,
          style: Globals.createAnimatedStyle(props.style), // 有 style 属性，创建 animatedStyle
        }
    this.update = callback // 设置 update 方法
    this.attach()
  }
}
