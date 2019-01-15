import React, { useRef, useState, useEffect } from 'react'
import { useSpring, animated } from 'react-spring/hooks'
import Controller from '../../../../src/animated/Controller'

export default function App() {
  const [toggle, set] = useState(false)
  const [ctrl] = useState(() => new Controller({ left: 0 }))
  useEffect(
    () =>
      void ctrl
        .update({
          left: toggle ? 200 : 0,
          config: { tension: 300, friction: 100 },
          onRest: () => console.log('rest'),
        })
        .start(() => console.log('toggle deon'))
  )
  const props = ctrl.getValues()

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <button
        onClick={() =>
          new Promise(r => ctrl.start(r)).then(() =>
            console.log('promise resolved!')
          )
        }>
        Start
      </button>
      <button onClick={() => set(state => !state)}>Toggle</button>
      <button
        onClick={async () => {
          ctrl.update({ config: { friction: 500 } })
          await new Promise(r => setTimeout(r, 500))
          ctrl.update({ config: { friction: 100 } })
        }}>
        Change speed
      </button>
      <button
        onClick={async () => {
          ctrl.update({ left: 200 }).start(() => console.log('queue done!'))
          await new Promise(r => setTimeout(r, 500))
          ctrl.stop(false)
          await new Promise(r => setTimeout(r, 500))
          ctrl.start()
        }}>
        start/stop:false/start
      </button>
      <button onClick={() => ctrl.stop(true)}>Stop:true</button>
      <button onClick={() => ctrl.stop(false)}>Stop: false</button>
      <button onClick={() => void (ctrl.stop(), ctrl.start())}>
        Toggle & Start
      </button>
      <button onClick={() => ctrl.update({ left: 200 })}>go to 200</button>
      <animated.div
        style={{
          ...props,
          position: 'relative',
          width: 50,
          height: 50,
          background: 'black',
        }}
      />
    </div>
  )
}
