import Animated from './Animated'
import Controller from './Controller'
import { now, requestFrame, manualFrameloop } from './Globals'

let active = false
const controllers = new Set()

const update = () => {
  if (!active) return false // 如果不是活跃状态，直接停止
  let time = now() // 获取时间戳
  for (let controller of controllers) { // 遍历 controllers
    let isActive = false // 初始状态非活跃

    for ( // 遍历 controller.configs
      let configIdx = 0;
      configIdx < controller.configs.length;
      configIdx++
    ) {
      let config = controller.configs[configIdx]
      let endOfAnimation, lastTime
      for (let valIdx = 0; valIdx < config.animatedValues.length; valIdx++) {
        let animation = config.animatedValues[valIdx]

        // If an animation is done, skip, until all of them conclude
        // 如果这个 animation 已经完成了，继续下一个
        if (animation.done) continue

        let from = config.fromValues[valIdx]
        let to = config.toValues[valIdx]
        let position = animation.lastPosition
        let isAnimated = to instanceof Animated
        let velocity = Array.isArray(config.initialVelocity)
          ? config.initialVelocity[valIdx]
          : config.initialVelocity
        if (isAnimated) to = to.getValue()

        // Conclude animation if it's either immediate, or from-values match end-state
        // 如果是 immediate，则直接跳到 to 的值
        if (config.immediate) {
          animation.setValue(to)
          animation.done = true
          continue
        }

        // Break animation when string values are involved
        // 如果 from 或者 to 是 string，也直接到 to 值
        if (typeof from === 'string' || typeof to === 'string') {
          animation.setValue(to)
          animation.done = true
          continue
        }

        if (config.duration !== void 0) { // 如果 duration 存在
          /** Duration easing */
          position = // 获取应该到的 position
            from +
            config.easing((time - animation.startTime) / config.duration) *
              (to - from)
          endOfAnimation = time >= animation.startTime + config.duration
        } else if (config.decay) { // 如果存在 decay
          /** Decay easing */
          position =
            from +
            (velocity / (1 - 0.998)) *
              (1 - Math.exp(-(1 - 0.998) * (time - animation.startTime)))
          endOfAnimation = Math.abs(animation.lastPosition - position) < 0.1
          if (endOfAnimation) to = position
        } else {
          /** Spring easing */
          lastTime = animation.lastTime !== void 0 ? animation.lastTime : time
          velocity =
            animation.lastVelocity !== void 0
              ? animation.lastVelocity
              : config.initialVelocity

          // If we lost a lot of frames just jump to the end.
          // 如果错过了很多帧，直接跳到最后
          if (time > lastTime + 64) lastTime = time
          // http://gafferongames.com/game-physics/fix-your-timestep/
          let numSteps = Math.floor(time - lastTime)
          for (let i = 0; i < numSteps; ++i) {
            let force = -config.tension * (position - to)
            let damping = -config.friction * velocity
            let acceleration = (force + damping) / config.mass
            velocity = velocity + (acceleration * 1) / 1000
            position = position + (velocity * 1) / 1000
          }

          // Conditions for stopping the spring animation
          let isOvershooting = // 是否已经过了结束点
            config.clamp && config.tension !== 0
              ? from < to
                ? position > to
                : position < to
              : false
          let isVelocity = Math.abs(velocity) <= config.precision
          let isDisplacement =
            config.tension !== 0
              ? Math.abs(to - position) <= config.precision
              : true
          endOfAnimation = isOvershooting || (isVelocity && isDisplacement)
          animation.lastVelocity = velocity
          animation.lastTime = time
        }

        // Trails aren't done until their parents conclude
        if (isAnimated && !config.toValues[valIdx].done) endOfAnimation = false

        if (endOfAnimation) {
          // Ensure that we end up with a round value
          if (animation.value !== to) position = to
          animation.done = true
        } else isActive = true

        animation.setValue(position)
        animation.lastPosition = position
      }

      // Keep track of updated values only when necessary
      if (controller.props.onFrame)
        controller.values[config.name] = config.interpolation.getValue()
    }
    // Update callbacks in the end of the frame
    if (controller.props.onFrame) controller.props.onFrame(controller.values)

    // Either call onEnd or next frame
    if (!isActive) {
      controllers.delete(controller)
      controller.stop(true)
    }
  }

  // Loop over as long as there are controllers ...
  if (controllers.size) {
    if (manualFrameloop) manualFrameloop()
    else requestFrame(update)
  } else {
    active = false
  }
  return active
}

const start = (controller: Controller) => {
  // 存下 controller
  if (!controllers.has(controller)) controllers.add(controller)
  // 如果不处于活跃状态
  if (!active) {
    active = true // 设置为 活跃状态
    if (manualFrameloop) requestFrame(manualFrameloop)
    else requestFrame(update)
  }
}

const stop = (controller: Controller) => {
  if (controllers.has(controller)) controllers.delete(controller)
}

export { start, stop, update }
