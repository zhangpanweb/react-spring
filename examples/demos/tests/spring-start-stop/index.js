import React, { useRef, useState, useEffect } from 'react'
import { useSpring, animated } from 'react-spring/hooks'
import Controller from '../../../../src/animated/Controller'

export default function App() {
  const [toggle, set] = useState(false)
  const [ctrl1] = useState(
    () => new Controller({ from: { left: 0, background: 'red' } })
  )
  const [ctrl2] = useState(
    () => new Controller({ from: { left: 0, background: 'green' } })
  )
  const props1 = ctrl1.getValues()
  const props2 = ctrl2.getValues()

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <button
        onClick={async () => {
          ctrl1.update({ left: 400, background: 'green' }).start()
          ctrl2
            .update({
              left: 400,
              background: 'red',
              delay: n => (n === 'left' ? 4000 : 0),
              onRest: () => console.log('onrest1'),
            })
            .start(() => console.log('rest1'))
          await new Promise(r => setTimeout(r, 1000))
          ctrl2
            .update({
              left: 200,
              background: 'red',
              delay: n => (n === 'left' ? 1000 : 0),
              onRest: () => console.log('onrest2'),
            })
            .start(() => console.log('rest2'))
          /*await new Promise(r => ctrl2.update({ delay: 400 }).start(r))

          ctrl1.update({ left: 0, background: 'red' }).start()
          await new Promise(r => ctrl2.update({ delay: 400, left: 0, background: 'green' }).start(r))

          await new Promise(r => setTimeout(r, 50))>*/
          /*console.log('start new')
          await new Promise(r =>
            ctrl2.update({ left: 200, background: 'green' }).start(r)
          )*/
        }}>
        Change speed
      </button>
      <animated.div
        style={{
          ...props1,
          position: 'relative',
          width: 50,
          height: 50,
          margin: 10,
        }}
      />
      <animated.div
        style={{
          ...props2,
          position: 'relative',
          width: 50,
          height: 50,
          margin: 10,
        }}
      />
    </div>
  )
}
