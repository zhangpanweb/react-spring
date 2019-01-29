import React, {
  forwardRef,
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  useCallback,
  useMemo,
} from 'react'
import AnimatedProps from './AnimatedProps'
import { handleRef, is } from '../shared/helpers'
import { applyAnimatedValues } from './Globals'

export default function createAnimatedComponent(Component) {
  const AnimatedComponent = forwardRef((props, ref) => {
    const forceUpdate = useState()[1]
    const mounted = useRef(true)
    const propsAnimated = useRef()
    const node = useRef()

    const setNativeProps = useCallback(props => {
      const didUpdate = ApplyAnimatedValues(node.current, props)
      if (!didUpdate) mounted.current && forceUpdate()
    }, [])

    const attachProps = useCallback((props, state) => {
      const oldPropsAnimated = propsAnimated.current
      const callback = () => {
        if (node.current) {
          const didUpdate = applyAnimatedValues.fn(
            node.current,
            propsAnimated.current.getAnimatedValue()
          )
          if (didUpdate === false) forceUpdate()
        }
      }
      propsAnimated.current = new AnimatedProps(props, callback)
      oldPropsAnimated && oldPropsAnimated.detach()
    }, [])

    useEffect(
      () => () => {
        mounted.current = false
        propsAnimated.current && propsAnimated.current.detach()
      },
      []
    )

    useImperativeHandle(ref, () => ({ setNativeProps }))
    attachProps(props)

    const {
      scrolTop,
      scrollLeft,
      ...animatedProps
    } = propsAnimated.current.getValue()
    return (
      <Component
        {...animatedProps}
        ref={childRef => (node.current = handleRef(childRef, ref))}
      />
    )
  })
  return AnimatedComponent
}

/*
shouldComponentUpdate(props) {
      const { style, ...nextProps } = props
      const { style: currentStyle, ...currentProps } = this.props
      if (!is.equ(currentProps, nextProps) || !is.equ(currentStyle, style)) {
        this.attachProps(props)
        return true
      }
      return false
    }
    */
