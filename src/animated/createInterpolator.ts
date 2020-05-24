import { EasingFunction, InterpolationConfig } from '../types/interpolation'
import * as Globals from './Globals'

export type ExtrapolateType = InterpolationConfig['extrapolate']

// The most generic interpolation value, possible with custom interpolation functions.
type IpValue = string | number | (string | number)[]

function createInterpolator<
  Interpolator extends (...input: IpValue[]) => IpValue
>(interpolator: Interpolator): Interpolator
function createInterpolator<
  In extends number | string,
  Out extends number | string
>(config: InterpolationConfig<Out>): (input: In) => Out
function createInterpolator<
  In extends number | string,
  Out extends number | string
>(
  range: number[],
  output: Out[],
  extrapolate: ExtrapolateType
): (input: In) => Out
function createInterpolator(
  range: number[] | InterpolationConfig | ((...input: IpValue[]) => IpValue),
  output?: (number | string)[],
  extrapolate?: ExtrapolateType
) {
  if (typeof range === 'function') { // 如果 range 是函数，直接用 range
    return range
  }
  if (Array.isArray(range)) { // 如果 range 是数组
    return createInterpolator({ range, output: output!, extrapolate })
  }
  if (Globals.interpolation && typeof range.output[0] === 'string') { // 如果有注入的 interpolation ，使用并返回
    return Globals.interpolation(range as InterpolationConfig<string>)
  }
  const config = range as InterpolationConfig<number>
  const outputRange = config.output
  const inputRange = config.range || [0, 1]

  const extrapolateLeft =
    config.extrapolateLeft || config.extrapolate || 'extend'
  const extrapolateRight =
    config.extrapolateRight || config.extrapolate || 'extend'
  const easing = config.easing || (t => t)

  return (input: number) => { // input
    const range = findRange(input, inputRange)
    return interpolate(
      input,
      inputRange[range],
      inputRange[range + 1],
      outputRange[range],
      outputRange[range + 1],
      easing,
      extrapolateLeft,
      extrapolateRight,
      config.map
    )
  }
}

function interpolate(
  input: number,
  inputMin: number,
  inputMax: number,
  outputMin: number,
  outputMax: number,
  easing: EasingFunction,
  extrapolateLeft: ExtrapolateType,
  extrapolateRight: ExtrapolateType,
  map?: (x: number) => number
) {
  let result = map ? map(input) : input // 先使用 map 转化 input
  // Extrapolate
  if (result < inputMin) { // 转化后的值小于 inputMin
    if (extrapolateLeft === 'identity') return result // 如果是 identity，直接返回
    else if (extrapolateLeft === 'clamp') result = inputMin // 是 clamp，result 设置为 inputMin
  }
  if (result > inputMax) {
    if (extrapolateRight === 'identity') return result
    else if (extrapolateRight === 'clamp') result = inputMax
  }
  if (outputMin === outputMax) return outputMin
  if (inputMin === inputMax) return input <= inputMin ? outputMin : outputMax
  // Input Range
  if (inputMin === -Infinity) result = -result
  else if (inputMax === Infinity) result = result - inputMin
  else result = (result - inputMin) / (inputMax - inputMin)
  // Easing
  result = easing(result) // 对 result 使用 easing
  // Output Range
  if (outputMin === -Infinity) result = -result
  else if (outputMax === Infinity) result = result + outputMin
  else result = result * (outputMax - outputMin) + outputMin
  return result // 返回值
}

function findRange(input: number, inputRange: number[]) {
  // 获取 inputRange 中离 input 最近的一个值的位置
  for (var i = 1; i < inputRange.length - 1; ++i)
    if (inputRange[i] >= input) break
  return i - 1
}

export default createInterpolator
