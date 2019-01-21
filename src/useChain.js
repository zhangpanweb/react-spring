import { useEffect, useRef } from 'react'
import { is } from './shared/helpers'
import { config as constants } from './shared/constants'
import { isActive } from './animated/FrameLoop'
//import { now } from './Globals'

export function useChain(refs, timeSteps, timeFrame = 1000) {
  useEffect(() => {
    console.log('-----------------------------------')
    // TODO, only run queues on ref changes, otherwise start immediately
    if (timeSteps) {
      let index = 0
      refs.forEach(({ current }) => {
        if (current) {
          const ctrls = current.controllers
          if (ctrls.length) {
            const time = timeFrame * timeSteps[index]
            ctrls.forEach(ctrl => {
              ctrl.queue = ctrl.queue.map(entry => ({
                ...entry,
                delay: entry.delay + time,
              }))
              ctrl.start()
            })
            index++
          }
        }
      })
    } else
      refs.reduce(
        (q, { current }, rI) => (q = q.then(() => current.start())),
        Promise.resolve()
      )
  })
}
