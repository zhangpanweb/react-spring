import { useMemo, useRef, useImperativeMethods, useEffect } from 'react'
import Ctrl from './animated/Controller'
import { callProp, is } from './shared/helpers'

/** API
 * const [props, set] = useSprings(number, (i, controller) => ({ ... }), initialProps)
 * const props = useSprings(number, ({ ... }), initialProps)
 */

export const useSprings = (length, props, initialProps = {}) => {
  const mounted = useRef(false)

  // The controller maintains the animation values, starts and tops animations
  const isFn = is.fun(props)
  const controllers = useMemo(
    () =>
      new Array(length).fill().map((_, i) => {
        const ctrl = new Ctrl()
        ctrl.update(isFn ? callProp(props, i, ctrl) : props[i])
        return ctrl
      }),
    [length]
  )

  const ctrl = useRef()
  ctrl.current = controllers

  // The hooks reference api gets defined here ...
  useImperativeMethods(initialProps.ref, () => ({
    start: () => Promise.all(ctrl.current.map(c => c.start())),
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
          c.update(isFn ? callProp(updateProps, i, c) : updateProps[i])
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
