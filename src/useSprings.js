import { useMemo, useRef, useImperativeHandle, useEffect } from 'react'
import Ctrl from './animated/Controller'
import { callProp, is } from './shared/helpers'

/** API
 * const props = useSprings(number, [{ ... }, { ... }, ...])
 * const [props, set] = useSprings(number, (i, controller) => ({ ... }))
 */

export const useSprings = (length, props) => {
  const mounted = useRef(false)
  const ctrl = useRef() // 存储现在的 controller
  const isFn = is.fun(props)

  // The controller maintains the animation values, starts and stops animations
  const [controllers, ref] = useMemo(() => {
    // Remove old controllers
    if (ctrl.current) { // 去除原有的 controller
      ctrl.current.map(c => c.destroy())
      ctrl.current = undefined
    }
    let ref
    return [
      new Array(length).fill().map((_, i) => {
        const ctrl = new Ctrl() // 初始化一个 controller
        const newProps = isFn ? callProp(props, i, ctrl) : props[i]
        if (i === 0) ref = newProps.ref
        ctrl.update(newProps)
        if (!ref) ctrl.start()
        return ctrl
      }),
      ref,
    ]
  }, [length])

  // 把 controller 存储在 ctrl.current
  ctrl.current = controllers

  // The hooks reference api gets defined here ...
  const api = useImperativeHandle(ref, () => ({
    start: () =>
      // 所有 controller 都开始并且完成
      Promise.all(ctrl.current.map(c => new Promise(r => c.start(r)))),
    stop: finished => ctrl.current.forEach(c => c.stop(finished)), // 停止所有 controller
    get controllers() { // 获取现有的 controller
      return ctrl.current
    },
  }))

  // This function updates the controllers
  // 更新 controller 的方法
  const updateCtrl = useMemo(
    () => updateProps =>
      ctrl.current.map((c, i) => { // 遍历 controller 调用 update
        c.update(isFn ? callProp(updateProps, i, c) : updateProps[i])
        if (!ref) c.start() // 如果 ref 不存在，直接开始
      }),
    [length]
  )

  // Update controller if props aren't functional
  useEffect(() => {
    if (mounted.current) {
      if (!isFn) updateCtrl(props)
    } else if (!ref) ctrl.current.forEach(c => c.start())
  })

  // Update mounted flag and destroy controller on unmount
  useEffect(
    () => (
      // 先把 mounted 的值设置为true，然后返回后面的方法
      // 组件卸载的时候，destroy 掉每个 controller
      (mounted.current = true), () => ctrl.current.forEach(c => c.destroy())
    ),
    []
  )

  // Return animated props, or, anim-props + the update-setter above
  // 获取所有 controller 的值
  const propValues = ctrl.current.map(c => c.getValues())
  // 如果 props 是方法，返回数组 值、更新controller的方法、暂停方法
  // 如果 props 不是方法，直接返回 controller 的值
  return isFn
    ? [
        propValues,
        updateCtrl,
        finished => ctrl.current.forEach(c => c.pause(finished)),
      ]
    : propValues
}
