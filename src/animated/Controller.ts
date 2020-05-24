import {
  callProp,
  interpolateTo,
  is,
  toArray,
  withDefault,
} from '../shared/helpers'
import AnimatedValue from './AnimatedValue'
import AnimatedValueArray from './AnimatedValueArray'
import { start, stop } from './FrameLoop'
import { colorNames, interpolation as interp, now } from './Globals'

type FinishedCallback = (finished?: boolean) => void

type AnimationsFor<P> = { [Key in keyof P]: any }

type ValuesFor<P> = { [Key in keyof P]: any }

type InterpolationsFor<P> = {
  [Key in keyof P]: P[Key] extends ArrayLike<any>
    ? AnimatedValueArray
    : AnimatedValue
}

let G = 0
class Controller<P extends any = {}> {
  id: number

  idle = true
  hasChanged = false
  guid = 0
  local = 0
  props: P = {} as P
  merged: any = {}
  animations = {} as AnimationsFor<P>
  interpolations = {} as InterpolationsFor<P>
  values = {} as ValuesFor<P>
  configs: any = []
  listeners: FinishedCallback[] = []
  queue: any[] = []
  localQueue?: any[]

  constructor() {
    this.id = G++
  }

  /** update(props)
   *  This function filters input props and creates an array of tasks which are executed in .start()
   *  Each task is allowed to carry a delay, which means it can execute asnychroneously */
  // 更新 props，整合传入的 props 数据，获取其中的 delay、to 和 其他属性，分组属性放入 queue 中
  update(args?: P) {
    //this._id = n + this.id

    if (!args) return this // 没有参数直接返回 controller
    // Extract delay and the to-prop from props
    // 从 props 中提取 delay 和 to 属性
    const { delay = 0, to, ...props } = interpolateTo(args) as any
    if (is.arr(to) || is.fun(to)) {
      // If config is either a function or an array queue it up as is
      // 如果 to 是函数或者是数组，把它推入 queue 中
      this.queue.push({ ...props, delay, to })
    } else if (to) {
      // Otherwise go through each key since it could be delayed individually
      let ops: any = {}
      Object.entries(to).forEach(([k, v]) => { // 遍历 to ，k 是 key ，v 是 value
        // Fetch delay and create an entry, consisting of the to-props, the delay, and basic props
        const entry = { to: { [k]: v }, delay: callProp(delay, k), ...props }
        const previous = ops[entry.delay] && ops[entry.delay].to
        // 将所有的 to 根据 delay 进行分组
        ops[entry.delay] = {
          ...ops[entry.delay],
          ...entry,
          to: { ...previous, ...entry.to },
        }
      })
      this.queue = Object.values(ops)
    }
    // Sort queue, so that async calls go last
    // 排序queue
    this.queue = this.queue.sort((a, b) => a.delay - b.delay)

    // Diff the reduced props immediately (they'll contain the from-prop and some config)
    this.diff(props)
    return this
  }

  /** start(onEnd)
   *  This function either executes a queue, if present, or starts the frameloop, which animates */
  start(onEnd?: FinishedCallback) {
    // If a queue is present we must excecute it
    // queue 有值
    if (this.queue.length) {
      this.idle = false

      // Updates can interrupt trailing queues, in that case we just merge values
      // 如果还有 queue，合并属性
      if (this.localQueue) {
        this.localQueue.forEach(({ from = {}, to = {} }) => {
          if (is.obj(from)) this.merged = { ...from, ...this.merged }
          if (is.obj(to)) this.merged = { ...this.merged, ...to }
        })
      }

      // The guid helps us tracking frames, a new queue over an old one means an override
      // We discard async calls in that caseÍ
      const local = (this.local = ++this.guid)
      const queue = (this.localQueue = this.queue)
      this.queue = []

      // Go through each entry and execute it
      // 遍历 queue，执行
      queue.forEach(({ delay, ...props }, index) => {
        const cb: FinishedCallback = finished => {
          // 如果是最后一个，guid 不过期，已完成
          if (index === queue.length - 1 && local === this.guid && finished) {
            this.idle = true // 已 idle
            if (this.props.onRest) this.props.onRest(this.merged) // 有 onRest，执行
          }
          // 有 onEnd，执行
          if (onEnd) onEnd()
        }

        // Entries can be delayed, ansyc or immediate
        let async = is.arr(props.to) || is.fun(props.to)
        if (delay) { // 如果有 delay，则 delay 时间之后执行
          setTimeout(() => {
            if (local === this.guid) { // 如果 local 与 guid 等，说明是一致的
              if (async) this.runAsync(props, cb) // 如果是 async 的，执行 runAsync
              else this.diff(props).start(cb) // 同步的，diff props 然后开始
            }
          }, delay)
        } else if (async) this.runAsync(props, cb) // 如果没有 delay 但是 async，执行 runAsync
        else this.diff(props).start(cb) // 如果没有 delay 但是不 async，diff props 然后开始
      })
    }
    // Otherwise we kick of the frameloop
    else {
      // 如果 onEnd 回调是方法，推到 listeners 中
      if (is.fun(onEnd)) this.listeners.push(onEnd)
      // 如果有 onStart 执行 onStart
      if (this.props.onStart) this.props.onStart()
      // 开始
      start(this)
    }
    return this
  }

  stop(finished?: boolean) {
    this.listeners.forEach(onEnd => onEnd(finished))
    this.listeners = []
    return this
  }

  /** Pause sets onEnd listeners free, but also removes the controller from the frameloop */
  pause(finished?: boolean) {
    this.stop(true)
    if (finished) stop(this)
    return this
  }

  runAsync({ delay, ...props }: P, onEnd: FinishedCallback) {
    const local = this.local
    // If "to" is either a function or an array it will be processed async, therefor "to" should be empty right now
    // If the view relies on certain values "from" has to be present
    let queue = Promise.resolve(undefined)
    if (is.arr(props.to)) {
      for (let i = 0; i < props.to.length; i++) {
        const index = i
        const fresh = { ...props, ...interpolateTo(props.to[index]) }
        if (is.arr(fresh.config)) fresh.config = fresh.config[index]
        queue = queue.then(
          (): Promise<any> | void => {
            //this.stop()
            if (local === this.guid)
              return new Promise(r => this.diff(fresh).start(r))
          }
        )
      }
    } else if (is.fun(props.to)) {
      let index = 0
      let last: Promise<any>
      queue = queue.then(() =>
        props
          .to(
            // next(props)
            (p: P) => {
              const fresh = { ...props, ...interpolateTo(p) }
              if (is.arr(fresh.config)) fresh.config = fresh.config[index]
              index++
              //this.stop()
              if (local === this.guid)
                return (last = new Promise(r => this.diff(fresh).start(r)))
              return
            },
            // cancel()
            (finished = true) => this.stop(finished)
          )
          .then(() => last)
      )
    }
    queue.then(onEnd)
  }

  diff(props: any) {
    // 合并 props
    this.props = { ...this.props, ...props }
    let {
      from = {},
      to = {},
      config = {},
      reverse,
      attach,
      reset,
      immediate,
    } = this.props

    // Reverse values when requested
    if (reverse) {
      ;[from, to] = [to, from]
    }

    // This will collect all props that were ever set, reset merged props when necessary
    // 合并数据
    this.merged = { ...from, ...this.merged, ...to }

    this.hasChanged = false
    // Attachment handling, trailed springs can "attach" themselves to a previous spring
    let target = attach && attach(this)
    // Reduces input { name: value } pairs into animated values
    this.animations = Object.entries<any>(this.merged).reduce(
      (acc, [name, value]) => {
        // Issue cached entries, except on reset
        let entry = acc[name] || {}

        // Figure out what the value is supposed to be
        const isNumber = is.num(value)
        const isString =
          is.str(value) && // 是字符串
          !value.startsWith('#') && // 并且不是以 # 开头
          !/\d/.test(value) && // 如果包含数字
          !colorNames[value] // 并且不是颜色名称
        const isArray = is.arr(value)
        const isInterpolation = !isNumber && !isArray && !isString

        let fromValue = !is.und(from[name]) ? from[name] : value
        let toValue = isNumber || isArray ? value : isString ? value : 1
        let toConfig = callProp(config, name)
        if (target) toValue = target.animations[name].parent

        let parent = entry.parent,
          interpolation = entry.interpolation,
          toValues = toArray(target ? toValue.getPayload() : toValue),
          animatedValues

        let newValue = value // 新的值
        if (isInterpolation)
          newValue = interp({ // 如果新值是 interpolation，interp 值
            range: [0, 1],
            output: [value as string, value as string],
          })(1)
        let currentValue = interpolation && interpolation.getValue() // 获取现在的值

        // Change detection flags
        const isFirst = is.und(parent) // 如果 parent 不存在，说明是第一次进来
        const isActive = // 不是第一次，并且 animatedValues 里面还有未完成的，说明还属于活跃状态
          !isFirst && entry.animatedValues.some((v: AnimatedValue) => !v.done)
        const currentValueDiffersFromGoal = !is.equ(newValue, currentValue) // 比较新值和现有值
        const hasNewGoal = !is.equ(newValue, entry.previous) // 新老值是否等
        const hasNewConfig = !is.equ(toConfig, entry.config) // 新老配置是否相等

        // Change animation props when props indicate a new goal (new value differs from previous one)
        // and current values differ from it. Config changes trigger a new update as well (though probably shouldn't?)
        if (
          reset || // 如果设置了reset
          (hasNewGoal && currentValueDiffersFromGoal) || // 有新的目标或者新值和现有值不同
          hasNewConfig // 有新的配置
        ) {
          // Convert regular values into animated values, ALWAYS re-use if possible
          if (isNumber || isString) // 如果 number 或者 string
            parent = interpolation = // 获取 parent 或者构造一个
              entry.parent || new AnimatedValue(fromValue)
          else if (isArray) // 是数组
            parent = interpolation =
              entry.parent || new AnimatedValueArray(fromValue)
          else if (isInterpolation) { // 是 interpolation
            let prev =
              entry.interpolation &&
              entry.interpolation.calc(entry.parent.value) // 获取前值
            prev = prev !== void 0 && !reset ? prev : fromValue // 如果前值存在且没有设置reset，使用前值，否则使用配置的from值
            if (entry.parent) { // 如果 parent 存在
              parent = entry.parent // 获取并设置 parent
              parent.setValue(0, false)
            } else parent = new AnimatedValue(0) // 否则，设置new一个parent
            const range = { output: [prev, value] } // 构造 range
            if (entry.interpolation) { // 获取 interpolation，如果存在，更新range
              interpolation = entry.interpolation
              entry.interpolation.updateConfig(range)
            } else interpolation = parent.interpolate(range) // 如果不存在，通过 parent 获取
          }

          toValues = toArray(target ? toValue.getPayload() : toValue)
          animatedValues = toArray(parent.getPayload())
          // 如果设置了 reset 并且值不是 interpolation，用from 值设置 parent
          if (reset && !isInterpolation) parent.setValue(fromValue, false)

          this.hasChanged = true
          // Reset animated values
          animatedValues.forEach(value => {
            value.startPosition = value.value // 开始位置
            value.lastPosition = value.value
            value.lastVelocity = isActive ? value.lastVelocity : undefined // 速率
            value.lastTime = isActive ? value.lastTime : undefined // lastTime
            value.startTime = now() // 开始时间
            value.done = false // 是否已经结束
            value.animatedStyles.clear() // 清除 animatedStyle
          })

          // Set immediate values
          if (callProp(immediate, name)) {
            parent.setValue(isInterpolation ? toValue : value, false)
          }

          return {
            ...acc,
            [name]: { // 设置 name
              ...entry,
              name,
              parent,
              interpolation,
              animatedValues,
              toValues,
              previous: newValue,
              config: toConfig,
              fromValues: toArray(parent.getValue()),
              immediate: callProp(immediate, name),
              initialVelocity: withDefault(toConfig.velocity, 0), // 初始 velocity
              clamp: withDefault(toConfig.clamp, false), // 初始 clamp
              precision: withDefault(toConfig.precision, 0.01), // 初始 precision 设置为 0.01
              tension: withDefault(toConfig.tension, 170),
              friction: withDefault(toConfig.friction, 26),
              mass: withDefault(toConfig.mass, 1),
              duration: toConfig.duration,
              easing: withDefault(toConfig.easing, (t: number) => t),
              decay: toConfig.decay,
            },
          }
        } else {
          if (!currentValueDiffersFromGoal) { // 如果新值和现有值相等
            // So ... the current target value (newValue) appears to be different from the previous value,
            // which normally constitutes an update, but the actual value (currentValue) matches the target!
            // In order to resolve this without causing an animation update we silently flag the animation as done,
            // which it technically is. Interpolations also needs a config update with their target set to 1.
            if (isInterpolation) {
              parent.setValue(1, false)
              interpolation.updateConfig({ output: [newValue, newValue] })
            }

            parent.done = true
            this.hasChanged = true
            return { ...acc, [name]: { ...acc[name], previous: newValue } }
          }
          return acc
        }
      },
      this.animations
    )

    if (this.hasChanged) {
      // Make animations available to frameloop
      this.configs = Object.values(this.animations)
      this.values = {} as ValuesFor<P>
      this.interpolations = {} as InterpolationsFor<P>
      for (let key in this.animations) {
        this.interpolations[key] = this.animations[key].interpolation
        this.values[key] = this.animations[key].interpolation.getValue()
      }
    }
    return this
  }

  destroy() {
    this.stop()
    this.props = {} as P
    this.merged = {}
    this.animations = {} as AnimationsFor<P>
    this.interpolations = {} as InterpolationsFor<P>
    this.values = {} as ValuesFor<P>
    this.configs = []
    this.local = 0
  }

  getValues = () => this.interpolations
}

export default Controller
