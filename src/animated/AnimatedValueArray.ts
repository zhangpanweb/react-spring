import { SpringValue } from '../types/animated'
import { InterpolationConfig } from '../types/interpolation'
import { AnimatedArray } from './Animated'
import AnimatedInterpolation from './AnimatedInterpolation'
import AnimatedValue from './AnimatedValue'

export default class AnimatedValueArray extends AnimatedArray<AnimatedValue>
  implements SpringValue {
  constructor(values: (string | number)[]) {
    super()
    this.payload = values.map(n => new AnimatedValue(n)) // 获取 payload
  }

  public setValue(value: (string | number)[] | string | number, flush = true) {
    if (Array.isArray(value)) { // 如果 value 是数组
      if (value.length === this.payload.length) { // 值长度等于现有 payload 长度
        value.forEach((v, i) => this.payload[i].setValue(v, flush)) // 遍历 value，设置值
      }
    } else { // 否则直接设置 payload
      this.payload.forEach(p => p.setValue(value, flush))
    }
  }

  public getValue() { // 获取 payload
    return this.payload.map(v => v.getValue())
  }

  public interpolate(
    range: number[] | InterpolationConfig | ((...args: any[]) => any),
    output?: (number | string)[]
  ): AnimatedInterpolation { // 获取 AnimatedInterpolation
    return new AnimatedInterpolation(this, range as number[], output!)
  }
}
