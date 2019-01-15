import { useEffect, useRef } from 'react'
import { is } from './shared/helpers'
import { config as constants } from './shared/constants'

export function useChain(refs, timeSteps, timeFrame = 1000) {
  const frames = useRef([])
  const guid = useRef(0)

  useEffect(() => {
    //refs = refs.filter(ref => ref.current)

    const local = ++guid.current

    frames.current.forEach(clearTimeout)
    //refs.forEach(({ current }) => current && current.stop())

    const configs = refs.map(({ current }) =>
      current.controllers.map(c => c.props.config || {})
    )
    /*refs.forEach(({ current }, rI) =>
      current.controllers.forEach((c, cI) => {
        const config = configs[rI][cI]
        config &&
          c.update({
            config: {
              ...config,
              duration: is.und(config.duration)
                ? undefined
                : config.duration * 10,
              mass: (config.mass || 1) * 15,
              friction: (config.friction || constants.default.friction) * 15,
              tension: (config.tension || constants.default.tension) / 15,
            },
          })
      })
    )*/
    // Maybe try slowing stuff down instead of stopping outright

    if (timeSteps) {
      frames.current = []
      refs.forEach(({ current }, rI) =>
        frames.current.push(
          setTimeout(() => {
            current.controllers.forEach((c, cI) =>
              c.update({ config: configs[rI][cI] })
            )
            current.start()
          }, timeFrame * timeSteps[rI])
        )
      )
    } else
      refs.reduce(
        (q, { current }, rI) =>
          (q = q.then(() => {
            current.controllers.forEach((c, cI) => {
              //c.update({ config: configs[rI][cI] })
            })
            if (guid.current === local) {
              return current.start()
            }
          })),
        Promise.resolve()
      )
  }, refs)
}
