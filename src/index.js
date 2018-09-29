import React from 'react'
import SpringImpl from './Spring'
import Trail from './Trail'
import DurationTrail from './DurationTrail'
import Transition from './Transition'

class Spring extends React.Component {
  render() {
    const { forwardRef, to, trail, ...rest } = this.props
    if (to) {
      if (trail) {
        const TrailImpl = typeof trail === 'boolean' ? Trail : DurationTrail
        return <TrailImpl ref={forwardRef} to={to} trail={trail} {...rest} />
      } else return <SpringImpl ref={forwardRef} to={to} {...rest} />
    } else return <Transition ref={forwardRef} trail={trail} {...rest} />
  }
}

export default React.forwardRef((props, ref) => (
  <Spring {...props} forwardRef={ref} />
))
