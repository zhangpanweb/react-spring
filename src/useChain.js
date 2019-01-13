import { useEffect, useRef } from 'react'

export function useChain(refs, timeSteps, timeFrame = 1000) {
  const guid = useRef(0)
  const frames = useRef([])
  const local = useRef()

  useEffect(() => {
    const local = ++guid.current
    console.log('useChain', guid.current, local.current)

    //refs.forEach(({ current }) => current && current.stop({ finished: true }))
    if (timeSteps) {
      frames.current.forEach(clearTimeout)
      frames.current = []
      let index = 0
      refs.forEach(ref => {
        const hasChanges = ref.current.controllers.some(c => c.hasChanged)
        if (hasChanges)
          frames.current.push(
            setTimeout(
              () => ref.current.start(),
              timeFrame * timeSteps[index++]
            )
          )
      })
    } else {
      refs.reduce(
        (q, { current }, i) =>
          (q = q.then(() => {
            if (guid.current === local) console.log('  starting', i)
            else console.log('         x', i)
            return guid.current === local && current && current.start()
          })),
        Promise.resolve()
      )
    }
  })
}
