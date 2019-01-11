import { useSprings } from './useSprings'

/** API
 * const [props, set] = useSpring(() => ({ ... }))
 * const props = useSpring(({ ... }))
 */

export const useSpring = props => {
  const isFn = is.fun(props)
  const [result, set] = useSprings(1, isFn ? props : [props])
  return isFn ? [result[0], set] : result
}
