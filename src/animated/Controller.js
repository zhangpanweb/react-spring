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

export default class Controller {
  constructor(props) {
    this.dependents = new Set()
    this.isActive = false
    this.hasChanged = false
    this.props = {}
    this.merged = {}
    this.animations = {}
    this.interpolations = {}
    this.values = {}
    this.configs = []
    this.frame = undefined
    this.startTime = undefined
    this.lastTime = undefined
    this.guid = 0
    this.localGuid = 0
    this.update(props)
  }

  update(props = {}) {
    let { from = {}, to = {}, ...rest } = interpolateTo(props)
    let isArray = is.arr(to)
    let isFunction = is.fun(to)

    //console.log(props)

    if (isArray) {
      let q = Promise.resolve()
      for (let i = 0; i < to.length; i++) {
        let index = i
        let newProps = { ...props, to: to[index] }
        let last = index === to.length - 1
        q = q.then(
          () =>
            this.curGuid === this.guid && this.update(interpolateTo(newProps))
        )
      }
    } else if (isFunction) {
      let index = 0
      let fn = to
      Promise.resolve().then(() =>
        fn(
          // Next
          p =>
            this.localGuid === this.guid &&
            this.update({ ...props, ...interpolateTo(p) }),
          // Cancel
          this.stop
        )
      )
    }

    // If "to" is either a function or an array it will be processed async, therefor "to" should be empty right now
    // If the view relies on certain values "from" has to be present
    if (isArray || isFunction) {
      this.localGuid = ++this.guid
      to = {}
    }

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

    // TODO: start REF, if (!ref && start.length) this.start(...start)*/

    return this.start()
  }

  start() {
    if (this.resolve) this.resolve({ finished: !this.isActive })
    this.startTime = now()
    if (this.isActive) this.stop()
    this.isActive = true
    if (this.props.onStart) this.props.onStart()
    addController(this)
    return new Promise(res => (this.resolve = res))
  }

  stop(result = { finished: false }) {
    removeController(this)
    // Reset collected changes
    if (result.finished)
      getValues(this.animations).forEach(a => (a.changes = undefined))
    this.isActive = false
    if (this.props.onRest && result.finished) this.props.onRest(this.merged)
    if (this.resolve) this.resolve(result)
    this.resolve = undefined
  }

  destroy() {
    removeController(this)
    this.props = {}
    this.merged = {}
    this.animations = {}
    this.interpolations = {}
    this.values = {}
    this.configs = []
    this.localGuid = 0
    this.resolve = undefined
  }

  getValues = () => this.interpolations
}
