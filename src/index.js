import React from 'react'
import SpringImpl from './Spring'
import Trail from './Trail'
import DurationTrail from './DurationTrail'
import Transition from './Transition'

export default class Spring extends React.Component {
  render() {
    const { to, trail, ...rest } = this.props
    if (to) {
      if (trail) {
        const TrailImpl = typeof trail === 'boolean' ? Trail : DurationTrail
        return <TrailImpl to={to} trail={trail} {...rest} />
      } else return <SpringImpl to={to} {...rest} />
    } else return <Transition trail={trail} {...rest} />
  }
}
