import { SpringValue } from '../types/animated'
import { InterpolationConfig } from '../types/interpolation'
import Animated, { AnimatedArray } from './Animated'
import createInterpolator, { ExtrapolateType } from './createInterpolator'

type IpValue = string | number | (string | number)[]
// The widest possible interpolator type, possible if interpolate() is passed
// a custom interpolation function.
type Interpolator = (...input: IpValue[]) => IpValue

export default class AnimatedInterpolation extends AnimatedArray<Animated>
  implements SpringValue {
  calc: Interpolator

  constructor(
    parents: Animated | Animated[],
    range: number[] | InterpolationConfig | Interpolator,
    output?: (number | string)[],
    extrapolate?: ExtrapolateType
  ) {
    super()
    this.payload = // 获取 payload
      parents instanceof AnimatedArray &&
      !(parents instanceof AnimatedInterpolation)
        ? (parents.getPayload() as Animated[]) // 如果是 Animated 类值，获取 payload
        : Array.isArray(parents) // 否则返回 parents array
        ? parents
        : [parents]
    this.calc = createInterpolator( // 创建 interpolator
      range as number[],
      output!,
      extrapolate
    ) as Interpolator
  }

  public getValue() { // 获取值
    return this.calc(...this.payload.map(value => value.getValue()))
  }

  public updateConfig(
    range: number[] | InterpolationConfig | Interpolator,
    output?: (number | string)[],
    extrapolate?: ExtrapolateType
  ) { // 更新配置，也就是创建新的 interpolator
    this.calc = createInterpolator(
      range as number[],
      output!,
      extrapolate
    ) as Interpolator
  }

  public interpolate(
    range: number[] | InterpolationConfig | ((...args: any[]) => IpValue),
    output?: (number | string)[],
    extrapolate?: ExtrapolateType
  ): AnimatedInterpolation { // 返回新的 AnimatedInterpolation
    return new AnimatedInterpolation(
      this,
      range as number[],
      output!,
      extrapolate
    )
  }
}
