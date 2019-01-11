import { useState, useRef, useImperativeMethods, useEffect } from 'react'
import Ctrl from './animated/Controller'
import { callProp, is } from './shared/helpers'

export const useSpring = args => {
  const mounted = useRef(false)
  // Extract animation props and hook-specific props, can be a function or an obj
  const props = callProp(args)
  // The controller maintains the animation values, starts and tops animations
  const [ctrl] = useState(() => new Ctrl(props))

  // The hooks reference api gets defined here ...
  useImperativeMethods(props.ref, () => ({
    start: ctrl.start,
    stop: ctrl.stop,
    get isActive() {
      return ctrl.isActive
    },
  }))

  // Update controller if props aren't functional
  useEffect(() => void (mounted.current && !is.fun(args) && ctrl.update(props)))

  // Update mounted flag and destroy controller on unmount
  useEffect(() => ((mounted.current = true), ctrl.destroy), [])

  // Return animated props, or, anim-props + the update-setter above
  const propValues = ctrl.getValues()
  return is.fun(args) ? [propValues, ctrl.update, ctrl.stop] : propValues
}
