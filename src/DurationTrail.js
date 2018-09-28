import React from 'react'
import Spring from './Spring'

export default class DurationTrail extends React.Component {
  getValues() {
    return this.instance && this.instance.getValues()
  }

  componentDidMount() {
    this.instance && this.instance.flush()
  }

  componentDidUpdate() {
    this.instance && this.instance.flush()
  }

  render() {
    const {
      children,
      trail = 200,
      reverse = false,
      config = {},
      keys,
      onRest,
      ...props
    } = this.props
    const len = children.length
    return children.map((child, i) => (
      <Spring
        ref={ref => i === 0 && (this.instance = ref)}
        key={keys[i]}
        {...props}
        config={{
          ...config,
          delay: (config.delay || 0) + (reverse ? len - i : i) * trail,
        }}
        onRest={i === (reverse ? 0 : children.length - 1) ? onRest : null}
        children={child}
      />
    ))
  }
}
