import Animated from './Animated'
import AnimatedValue from './AnimatedValue'
import AnimatedArray from './AnimatedArray'
import { now, colorNames, requestFrame as raf } from './Globals'
import { addController, removeController } from './FrameLoop'
import {
  interpolateTo,
  withDefault,
  toArray,
  getValues,
  callProp,
  is,
} from '../shared/helpers'

let G = 0
export default class Controller {
  constructor(props) {
    this.id = 'ctrl' + G++
    this.dependents = new Set()
    this.isActive = false
    this.hasChanged = false
    this.props = {}
    this.merged = {}
    this.animations = {}
    this.interpolations = {}
    this.values = {}
    this.configs = []
    this.startTime = undefined
    this.lastTime = undefined
    this.guid = 0
    this.local = 0
    this.last = true

    this.currentTask = undefined
    this.update(props)
  }

  pushTask(task) {
    this.currentTask = task
  }

  popTask(promise) {
    if (this.currentTask) {
      this.currentTask(promise)
      this.currentTask = undefined
    }
  }

  runAsync(props, resolve) {
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
          () => this.local === this.guid && this.update(interpolateTo(fresh))
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
                  return this.update(fresh).then(() => last && res())
                }
              },
              // Cancel
              () => this.stop({ finished: true })
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

    //console.log(props)

    let resolve
    let promise = new Promise(r => (resolve = r))

    if (isArr || isFun) {
      // The to-props is either a function or an array, this means it's going to
      // be processed async, therefore we have to inject an empty to-prop for now
      // and let the asnyc function update itself
      this.diff({ ...props, to: {} })
      this.pushTask(() => this.runAsync(props, resolve))
      if (!props.ref) this.start()
      return promise
    } else {
      this.diff(props)
      if (props.ref) {
        // If the controller bears a reference, then the animation won't start right away
        // So we return a promise and resolve it later
        this.pushTask(promise => promise.then(resolve))
        return promise
      }
    }

    // Only start an animation if the controller bears no reference
    return this.start()
  }

  diff(props) {
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

        let fromValue = !is.und(from[name]) ? from[name] : value
        let toValue = isNumber || isArray ? value : isString ? value : 1
        let toConfig = callProp(config, name)
        if (target) toValue = target.animations[name].parent

        // Detect changes, animated values will be checked in the raf-loop
        if (!is.und(toConfig.decay) || !is.equ(entry.changes, value)) {
          this.hasChanged = true
          let parent, interpolation
          if (isNumber || isString)
            parent = interpolation =
              entry.parent || new AnimatedValue(fromValue)
          else if (isArray)
            parent = interpolation =
              entry.parent || new AnimatedArray(fromValue)
          else {
            const prev =
              entry.interpolation &&
              entry.interpolation.calc(entry.parent.value)
            if (entry.parent) {
              parent = entry.parent
              parent.setValue(0, false)
            } else parent = new AnimatedValue(0)
            const range = {
              output: [prev !== void 0 ? prev : fromValue, value],
            }
            if (entry.interpolation) {
              interpolation = entry.interpolation
              entry.interpolation.updateConfig(range)
            } else interpolation = parent.interpolate(range)
          }

          // Set immediate values
          if (callProp(immediate, name)) parent.setValue(value, false)

          // Reset animated values
          const animatedValues = toArray(parent.getPayload())
          animatedValues.forEach(value => value.prepare(this))

          return {
            ...acc,
            [name]: {
              ...entry,
              name,
              parent,
              interpolation,
              animatedValues,
              changes: value,
              fromValues: toArray(parent.getValue()),
              toValues: toArray(target ? toValue.getPayload() : toValue),
              immediate: callProp(immediate, name),
              delay: withDefault(toConfig.delay, delay || 0),
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
        } else return acc
      },
      this.animations
    )

    if (this.hasChanged) {
      this.configs = getValues(this.animations)
      this.values = {}
      this.interpolations = {}
      for (let key in this.animations) {
        this.interpolations[key] = this.animations[key].interpolation
        this.values[key] = this.animations[key].interpolation.getValue()
      }
    }
  }

  start() {
    // Stop all occuring animations (without resetting change-detection)
    this.stop()
    // This promise tracks the animation until onRest
    const promise = new Promise(res => (this.resolve = res))
    // Execute tasks that could have crept up
    this.popTask(promise)
    // Set start-flags and add the controller to the frameloop
    this.startTime = now()
    this.isActive = true
    if (this.props.onStart) this.props.onStart()
    addController(this)
    return promise
  }

  stop(result = { finished: false }) {
    this.isActive = false
    removeController(this)

    if (result.finished) {
      // Reset collected changes
      getValues(this.animations).forEach(a => (a.changes = undefined))
      // Call onRest if present
      if (this.props.onRest) {
        //console.log(this.id, 'done')
        this.props.onRest(this.merged)
      }
    }

    if (this.resolve) {
      this.resolve()
      this.resolve = undefined
    }
  }

  destroy() {
    removeController(this)
    this.props = {}
    this.merged = {}
    this.animations = {}
    this.interpolations = {}
    this.values = {}
    this.configs = []
    this.local = 0
    this.resolve = undefined
  }

  getValues = () => this.interpolations
}
