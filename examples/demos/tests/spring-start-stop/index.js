import React, { useRef, useState, useEffect } from 'react'
import { useSpring, animated } from 'react-spring/hooks'
import Controller from '../../../../src/animated/Controller'

export default function App() {
  const [toggle, set] = useState(false)
  const [ctrl] = useState(() => new Controller({ background: 'black' }))
  const props = ctrl.getValues()

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <button
        onClick={async () => {
          ctrl.start(() => console.log('done'))

          await new Promise(r => setTimeout(r, 300))
          ctrl.update({ background: 'red' })
          ctrl.update({ background: 'black' })

          //ctrl.update({ config: { friction: 100 } })
        }}>
        Change speed
      </button>
      <animated.div
        style={{
          ...props,
          position: 'relative',
          width: 50,
          height: 50,
        }}
      />
    </div>
  )
}
