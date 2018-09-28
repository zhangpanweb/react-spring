import React from 'react'
import SpringImpl from './Spring'
import Trail from './Trail'
import DurationTrail from './DurationTrail'
import Transition from './Transition'

export default class Spring extends React.Component {
  setRef = r => (this.ref = r)
  getValues = () => this.ref && this.ref.getValues()
  render() {
    const { to, trail, ...rest } = this.props
    if (to) {
      if (trail) {
        const TrailImpl = typeof trail === 'boolean' ? Trail : DurationTrail
        return <TrailImpl ref={this.setRef} to={to} trail={trail} {...rest} />
      } else return <SpringImpl ref={this.setRef} to={to} {...rest} />
    } else return <Transition ref={this.setRef} trail={trail} {...rest} />
  }
}

// TODO: forwardref
