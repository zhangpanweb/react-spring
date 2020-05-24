export type EasingFunction = (t: number) => number

export type ExtrapolateType = 'identity' | 'clamp' | 'extend'

/**
 * Long-form configuration options for an interpolation.
 */
export type InterpolationConfig<
  Out extends number | string = number | string
> = {
  /**
   * What happens when the spring goes below its target value.
   *
   *  - `extend` continues the interpolation past the target value
   *  - `clamp` limits the interpolation at the max value
   *  - `identity` sets the value to the interpolation input as soon as it hits the boundary
   *
   * @default 'extend'
   */
  /**
   * 设置当值低于目标值的做法
   */
  extrapolateLeft?: ExtrapolateType

  /**
   * What happens when the spring exceeds its target value.
   *
   *  - `extend` continues the interpolation past the target value
   *  - `clamp` limits the interpolation at the max value
   *  - `identity` sets the value to the interpolation input as soon as it hits the boundary
   *
   * @default 'extend'
   */
  /**
   * 设置当值高于目标值的做法
   */
  extrapolateRight?: ExtrapolateType

  /**
   * What happens when the spring exceeds its target value.
   * Shortcut to set `extrapolateLeft` and `extrapolateRight`.
   *
   *  - `extend` continues the interpolation past the target value
   *  - `clamp` limits the interpolation at the max value
   *  - `identity` sets the value to the interpolation input as soon as it hits the boundary
   *
   * @default 'extend'
   */
  extrapolate?: ExtrapolateType

  /**
   * Input ranges mapping the interpolation to the output values.
   *
   * @example
   *
   *   range: [0, 0.5, 1], output: ['yellow', 'orange', 'red']
   *
   * @default [0,1]
   */
  range?: number[]

  /**
   * Output values from the interpolation function. Should match the length of the `range` array.
   */
  output: Out[]

  /**
   * Transformation to apply to the value before interpolation.
   * interpolation前作用于值的转化
   */
  map?: (value: number) => number

  /**
   * Custom easing to apply in interpolator.
   * 应用于interpolation的自定义easing函数
   */
  easing?: EasingFunction
}
