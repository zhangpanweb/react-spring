import Animated from './Animated'
import AnimatedValue from './AnimatedValue'
import AnimatedArray from './AnimatedArray'
import Interpolation from './Interpolation'
import {
  interpolation as interp,
  now,
  colorNames,
  requestFrame as raf,
} from './Globals'
import { addController, removeController } from './FrameLoop'
import {
  interpolateTo,
  withDefault,
  toArray,
  getValues,
  callProp,
  is,
} from '../shared/helpers'

let o1 = {}
let o2 = {}
console.log(is.equ(o1, o2))

let G = 0
export default class Controller {
  constructor(props) {
    this.id = 'ctrl' + G++
    this.idle = true
    this.hasChanged = false
    this.props = {}
    this.merged = {}
    this.animations = {}
    this.interpolations = {}
    this.values = {}
    this.configs = []
    this.listeners = []
    this.startTime = undefined
    this.lastTime = undefined
    this.guid = 0
    this.local = 0
    this.update(props)
  }

  runAsync(props) {
    this.local = ++this.guid
    // If "to" is either a function or an array it will be processed async, therefor "to" should be empty right now
    // If the view relies on certain values "from" has to be present
    let queue = Promise.resolve()
    if (is.arr(props.to)) {
      for (let i = 0; i < props.to.length; i++) {
        const index = i
        const last = index === props.to.length - 1
        const fresh = { ...props, to: props.to[index] }
        if (!last) fresh.onRest = undefined
        if (is.arr(fresh.config)) fresh.config = fresh.config[index]
        queue = queue.then(
          () =>
            this.local === this.guid &&
            new Promise(r => this.update(interpolateTo(fresh).start(r)))
        )
      }
    } else if (is.fun(props.to)) {
      let index = 0
      let fn = props.to
      queue = queue.then(
        () =>
          new Promise(res =>
            fn(
              // Next
              (p, last = false) => {
                if (this.local === this.guid) {
                  const fresh = { ...props, ...interpolateTo(p) }
                  if (!last) fresh.onRest = undefined
                  if (is.arr(fresh.config)) fresh.config = fresh.config[index]
                  index++
                  return new Promise(r => this.update(fresh).start(r)).then(
                    () => last && res()
                  )
                }
              },
              // Cancel
              () => this.stop(true)
            )
          )
      )
    }
    // Resolve outer promise when done
    queue.then(resolve)
  }

  update(props = {}) {
    let isArr = is.arr(props.to)
    let isFun = is.fun(props.to)

    if (isArr || isFun) {
      // The to-props is either a function or an array, this means it's going to
      // be processed async, therefore we have to inject an empty to-prop for now
      // and let the asnyc function update itself
      this.diff({ ...props, to: {} })
      raf(() => this.runAsync(props))
    } else {
      this.diff(props)
    }
    return this
  }

  diff(props) {
    //console.log('diff', props)
    let { from = {}, to = {}, ...rest } = interpolateTo(props)
    this.props = { ...this.props, ...rest }
    let {
      config = {},
      delay,
      reverse,
      attach,
      reset,
      immediate,
      ref,
    } = this.props

    // Reverse values when requested
    if (reverse) {
      ;[from, to] = [to, from]
    }

    // This will collect all props that were ever set, reset merged props when necessary
    let extra = reset ? {} : this.merged
    this.merged = { ...from, ...extra, ...to }

    this.hasChanged = false
    // Attachment handling, trailed springs can "attach" themselves to a previous spring
    let target = attach && attach(this)

    // Reduces input { name: value } pairs into animated values
    this.animations = Object.entries(this.merged).reduce(
      (acc, [name, value], i) => {
        // Issue cached entries, except on reset
        let entry = (!reset && acc[name]) || {}

        // Figure out what the value is supposed to be
        const isNumber = is.num(value)
        const isString =
          is.str(value) &&
          !value.startsWith('#') &&
          !/\d/.test(value) &&
          !colorNames[value]
        const isArray = is.arr(value)
        const isInterpolation = !isNumber && !isArray && !isString

        let fromValue = !is.und(from[name]) ? from[name] : value
        let toValue = isNumber || isArray ? value : isString ? value : 1
        let toConfig = callProp(config, name)
        if (target) toValue = target.animations[name].parent

        // this is all wrong, change detection has to start here! or else interpolated values will always move between
        // 0-1 every time the animation is updated, which makes no sense at all!

        let parent = entry.parent,
          interpolation = entry.interpolation,
          toValues = toArray(target ? toValue.getPayload() : toValue),
          animatedValues

        let newValue = value
        if (isInterpolation)
          newValue = interp({ range: [0, 1], output: [value, value] })(1)
        let currentValue = interpolation && interpolation.getValue()

        // Change detection flags
        const isFirst = is.und(parent)
        const isActive = !isFirst && !this.idle
        const currentValueDiffersFromGoal = !is.equ(newValue, currentValue)
        const hasNewGoal = !is.equ(newValue, entry.previous)
        const hasNewConfig = !is.equ(toConfig, entry.config)

        // console.log('  > diff', name, currentValue, '>', newValue, 'prev:', entry.previous)
        // Change animation props when props indicate a new goal (new value differs from previous one)
        // and current values differ from it. Config changes trigger a new update as well (though probably shouldn't?)
        if ((hasNewGoal && currentValueDiffersFromGoal) || hasNewConfig) {
          // Convert regular values into animated values, ALWAYS re-use if possible
          if (isNumber || isString)
            parent = interpolation =
              entry.parent || new AnimatedValue(fromValue)
          else if (isArray)
            parent = interpolation =
              entry.parent || new AnimatedArray(fromValue)
          else if (isInterpolation) {
            let prev =
              entry.interpolation &&
              entry.interpolation.calc(entry.parent.value)
            prev = prev !== void 0 ? prev : fromValue
            if (entry.parent) {
              parent = entry.parent
              parent.setValue(0, false)
            } else parent = new AnimatedValue(0)
            const range = { output: [prev, value] }
            if (entry.interpolation) {
              interpolation = entry.interpolation
              entry.interpolation.updateConfig(range)
            } else interpolation = parent.interpolate(range)
          }

          toValues = toArray(target ? toValue.getPayload() : toValue)
          animatedValues = toArray(parent.getPayload())

          this.hasChanged = true
          // Reset animated values
          animatedValues.forEach(value => {
            value.startPosition = value.value
            value.lastPosition = value.value
            value.lastVelocity = isActive ? value.lastVelocity : undefined
            value.lastTime = isActive ? value.lastTime : undefined
            value.done = false
            value.animatedStyles.clear()
          })
          // Set immediate values
          if (callProp(immediate, name)) parent.setValue(value, false)

          return {
            ...acc,
            [name]: {
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
              delay:
                isActive && toConfig.cancelDelay
                  ? 0
                  : withDefault(toConfig.delay, delay || 0),
              initialVelocity: withDefault(toConfig.velocity, 0),
              clamp: withDefault(toConfig.clamp, false),
              precision: withDefault(toConfig.precision, 0.01),
              tension: withDefault(toConfig.tension, 170),
              friction: withDefault(toConfig.friction, 26),
              mass: withDefault(toConfig.mass, 1),
              duration: toConfig.duration,
              easing: withDefault(toConfig.easing, t => t),
              decay: toConfig.decay,
            },
          }
        } else {
          console.log('    noop')
          if (!currentValueDiffersFromGoal) {
            // So ... the current target value (newValue) appears to be different from the previous value,
            // which normally constitutes an update, but the actual value (currentValue) matches the target!
            // In order to resolve this without causing an animation update we silently flag the animation as done,
            // which it technically is. Interpolations also needs a config update with their target set to 1.
            console.log('    reset silently')
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
      this.configs = getValues(this.animations)
      this.values = {}
      this.interpolations = {}
      for (let key in this.animations) {
        this.interpolations[key] = this.animations[key].interpolation
        this.values[key] = this.animations[key].interpolation.getValue()
      }
    }
  }

  start(onEnd) {
    if (is.fun(onEnd)) this.listeners.push(onEnd)
    this.startTime = now()
    if (this.props.onStart) this.props.onStart()
    addController(this)
    return this
  }

  stop(finished, noChange) {
    this.idle = true
    this.listeners.forEach(onEnd => onEnd())
    this.listeners = []

    // Stop probably should just freeze/reset values (done + interpolation & previous)
    removeController(this)

    if (finished) {
      getValues(this.animations).forEach(a => (a.done = true))
      if (this.props.onRest) this.props.onRest(this.merged)
    }
    return this
  }

  destroy() {
    this.stop()
    this.props = {}
    this.merged = {}
    this.animations = {}
    this.interpolations = {}
    this.values = {}
    this.configs = []
    this.local = 0
  }

  getValues = () => this.interpolations
}
