import { useEffect, useRef } from 'react'
import { getValues } from './shared/helpers'

export function useChain(refs, timeSteps, timeFrame = 1000) {
  const guid = useRef(0)
  const frames = useRef([])

  useEffect(() => {
    const local = ++guid.current
    console.log('useChain', guid.current, local)

    //refs.forEach(({ current }) => current && current.stop())
    if (timeSteps) {
      frames.current.forEach(clearTimeout)
      frames.current = []
      let index = 0
      refs.forEach((ref, i) => {
        //const hasChanges = ref.current.controllers.some(c => c.hasChanged)
        //if (hasChanges)
        frames.current.push(
          setTimeout(() => ref.current.start(), timeFrame * timeSteps[i])
        )
      })
    } else {
      refs.reduce(
        (q, { current }, i) =>
          (q = q.then(() => {
            console.log('  ', current.controllers.length)
            return local === guid.current && current && current.start()
          })),
        Promise.resolve()
      )
    }
  })
}
