import { SpringValue } from '../types/animated'
import { InterpolationConfig } from '../types/interpolation'
import Animated from './Animated'
import AnimatedInterpolation from './AnimatedInterpolation'
import AnimatedProps from './AnimatedProps'
import { ExtrapolateType } from './createInterpolator'

/**
 * Animated works by building a directed acyclic graph of dependencies
 * transparently when you render your Animated components.
 *
 *               new Animated.Value(0)
 *     .interpolate()        .interpolate()    new Animated.Value(1)
 *         opacity               translateY      scale
 *          style                         transform
 *         View#234                         style
 *                                         View#123
 *
 * A) Top Down phase
 * When an AnimatedValue is updated, we recursively go down through this
 * graph in order to find leaf nodes: the views that we flag as needing
 * an update.
 *
 * B) Bottom Up phase
 * When a view is flagged as needing an update, we recursively go back up
 * in order to build the new value that it needs. The reason why we need
 * this two-phases process is to deal with composite props such as
 * transform which can receive values from multiple parents.
 */

function addAnimatedStyles(
  node: Animated | AnimatedProps,
  styles: Set<AnimatedProps>
) {
  if ('update' in node) { // 如果 node 有 update 方法，把 node 添加到 styles
    styles.add(node)
  } else { // 递归调用，styles 添加 node
    node.getChildren().forEach(child => addAnimatedStyles(child, styles))
  }
}

export default class AnimatedValue extends Animated implements SpringValue {
  private animatedStyles = new Set<AnimatedProps>()

  public value: number | string
  public startPosition: number | string
  public lastPosition: number | string
  public lastVelocity?: number
  public startTime?: number
  public lastTime?: number
  public done = false

  constructor(value: number | string) {
    super()
    this.value = value // 值
    this.startPosition = value // 开始位置
    this.lastPosition = value // 上一次位置
  }

  private flush() {
    if (this.animatedStyles.size === 0) { // 如果 animatedStyles 没有内容了
      addAnimatedStyles(this, this.animatedStyles) // animatedStyles 添加 node
    }
    // 遍历 animatedStyles 进行 更新
    this.animatedStyles.forEach(animatedStyle => animatedStyle.update())
  }

  public clearStyles() { // 清除 animatedStyles
    this.animatedStyles.clear()
  }

  public setValue = (value: number | string, flush = true) => { // 设置 value
    this.value = value
    if (flush) this.flush()
  }

  public getValue() {
    return this.value
  }

  public interpolate(
    range: number[] | InterpolationConfig | ((...args: any[]) => any),
    output?: (number | string)[],
    extrapolate?: ExtrapolateType
  ): AnimatedInterpolation {
    return new AnimatedInterpolation(
      this,
      range as number[],
      output!,
      extrapolate
    )
  }
}
