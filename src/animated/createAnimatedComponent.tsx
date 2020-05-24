import React, {
  forwardRef,
  MutableRefObject,
  ReactType,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'
import { handleRef, useForceUpdate, is } from '../shared/helpers'
import {
  AnimatedComponentProps,
  CreateAnimatedComponent,
} from '../types/animated'
import AnimatedProps from './AnimatedProps'
import { animatedApi, applyAnimatedValues } from './Globals'

const isFunctionComponent = (val: unknown): boolean =>
  // 是方法并且原型是 React.Component
  is.fun(val) && !(val.prototype instanceof React.Component)

const createAnimatedComponent: CreateAnimatedComponent = <C extends ReactType>(
  Component: C
) => {
  const AnimatedComponent = forwardRef<C, AnimatedComponentProps<C>>(
    (props, ref) => {
      const forceUpdate = useForceUpdate()
      const mounted = useRef(true)
      const propsAnimated: MutableRefObject<AnimatedProps | null> = useRef(null)
      const node: MutableRefObject<C | null> = useRef(null)
      const attachProps = useCallback(props => {
        const oldPropsAnimated = propsAnimated.current // 获取老的props值
        const callback = () => { // 回调的更新方法，用于更新组件
          let didUpdate: false | undefined = false // 初始时未更新
          if (node.current) { // 如果存在 node
            didUpdate = applyAnimatedValues.fn( // 调用 applyAnimatedValues.fn 应用 动画值，实际取更新动画值
              node.current, // 节点
              propsAnimated.current!.getAnimatedValue() // 属性值
            )
          }
          if (!node.current || didUpdate === false) { // 如果 没有 node 并且没有更新，强制更新
            // If no referenced node has been found, or the update target didn't have a
            // native-responder, then forceUpdate the animation ...
            forceUpdate() // 进行强制更新
          }
        }
        propsAnimated.current = new AnimatedProps(props, callback) // 获取新的 propsAnimated
        oldPropsAnimated && oldPropsAnimated.detach() // detach 老的 propsAnimated
      }, [])

      useEffect(
        () => () => {
          // 组件卸载时将 mounted 状态转为 false，detach propsAnimated
          mounted.current = false
          propsAnimated.current && propsAnimated.current.detach()
        },
        []
      )
      useImperativeHandle<C, any>(ref, () =>
        // 暴露 animatedApi 方法
        animatedApi(node as MutableRefObject<C>, mounted, forceUpdate)
      )
      attachProps(props)

      const {
        scrollTop,
        scrollLeft,
        ...animatedProps
      } = propsAnimated.current!.getValue()

      // Functions cannot have refs, see:
      // See: https://github.com/react-spring/react-spring/issues/569
      const refFn = isFunctionComponent(Component)
        ? undefined
        : (childRef: C) => (node.current = handleRef(childRef, ref))
      return <Component {...animatedProps as typeof props} ref={refFn} />
    }
  )
  return AnimatedComponent
}

export default createAnimatedComponent
