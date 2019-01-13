import { useMemo, useRef, useImperativeMethods, useEffect } from 'react'
import Ctrl from './animated/Controller'
import { callProp, is } from './shared/helpers'

/** API
 * const [props, set] = useSprings(number, (i, controller) => ({ ... }))
 * const props = useSprings(number, { ... })
 */

export const useSprings = (length, props) => {
  const mounted = useRef(false)
  const isFn = is.fun(props)

  // The controller maintains the animation values, starts and tops animations
  const [controllers, ref] = useMemo(
    () => {
      let ref
      return [
        new Array(length).fill().map((_, i) => {
          const ctrl = new Ctrl()
          const newProps = isFn ? callProp(props, i, ctrl) : props[i]
          if (i === 0) ref = newProps.ref
          ctrl.update(newProps, !!ref)
          return ctrl
        }),
        ref,
      ]
    },
    [length]
  )

  const ctrl = useRef()
  ctrl.current = controllers

  // The hooks reference api gets defined here ...
  const api = useImperativeMethods(ref, () => ({
    start: () =>
      Promise.all(ctrl.current.map(c => new Promise(r => c.start(r)))),
    stop: () => ctrl.current.forEach(c => c.stop()),
    get controllers() {
      return ctrl.current
    },
  }))

  // This function updates the controllers
  const updateCtrl = useMemo(
    () => updateProps =>
      Promise.all(
        ctrl.current.map((c, i) =>
          c.update(isFn ? callProp(updateProps, i, c) : updateProps[i], !!ref)
        )
      ),
    [length]
  )

  // Update controller if props aren't functional
  useEffect(() => void (mounted.current && !isFn && updateCtrl(props)))

  // Update mounted flag and destroy controller on unmount
  useEffect(
    () => (
      (mounted.current = true), () => ctrl.current.forEach(c => c.destroy())
    ),
    []
  )

  // Return animated props, or, anim-props + the update-setter above
  const propValues = ctrl.current.map(c => c.getValues())
  return isFn
    ? [propValues, updateCtrl, () => ctrl.current.forEach(c => c.stop())]
    : propValues
}
