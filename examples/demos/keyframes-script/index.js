import React, { useEffect } from 'react'
import { useSpring, animated } from 'react-spring'
import './styles.css'

export default function App() {
  const props = useSpring({
    from: { left: '0%', top: '0%', width: '0%', height: '0%' },
    to: async next => {
      while (1) {
        await next({
          left: '0%',
          top: '0%',
          width: '100%',
          height: '100%',
        })
        await next({ height: '50%' })
        await next({ width: '50%', left: '50%' })
        await next({ top: '0%', height: '100%' })
        await next({ top: '50%', height: '50%' })
        await next({ width: '100%', left: '0%' })
        await next({ width: '50%' })
        await next({ top: '0%', height: '100%' })
        await next({ width: '100%' })
      }
    },
  })
  return (
    <div className="script-main">
      <animated.div className="script-box" style={props} />
    </div>
  )
}
