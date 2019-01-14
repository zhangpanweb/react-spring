import { useEffect, useRef } from 'react'
import { getValues } from './shared/helpers'

export function useChain(refs, timeSteps, timeFrame = 1000) {
  const guid = useRef(0)
  const frames = useRef([])

  useEffect(() => {
    const local = ++guid.current
    //console.log('useChain', refs, timeSteps, guid.current, local)
    frames.current.forEach(clearTimeout)

    //refs.forEach(({ current }) => current && current.stop({ force: true }))
    if (timeSteps) {
      frames.current = []
      let index = 0
      refs.forEach((ref, i) => {
        //const hasChanges = ref.current.controllers.some(c => c.hasChanged)
        //if (hasChanges)
        frames.current.push(
          setTimeout(() => {
            if (local === guid.current) {
              //console.log("  starting timeout", ref.current.controllers.length)
              ref.current.start()
            }
          }, timeFrame * timeSteps[i])
        )
      })
    } else {
      refs.reduce(
        (q, { current }, i) =>
          (q = q.then(() => {
            if (local === guid.current) {
              //console.log("  starting async", current.controllers.length)
              return current.start()
            }
          })),
        Promise.resolve()
      )
    }
  })
}
