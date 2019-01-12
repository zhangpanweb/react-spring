import {
  useRef,
  useState,
  useEffect,
  useMemo,
  useImperativeMethods,
} from 'react'
import Ctrl from './animated/Controller'
import { toArray, callProp } from './shared/helpers'
import { requestFrame } from './animated/Globals'

/** API
 * const transitions = useTransition({ ... })
 */

let guid = 0
let mapKeys = (items, keys) =>
  (typeof keys === 'function' ? items.map(keys) : toArray(keys)).map(String)
let get = props => {
  let { items, keys = states => states, ...rest } = props
  items = toArray(items !== void 0 ? items : null)
  return { items, keys: mapKeys(items, keys), ...rest }
}

export function useTransition(props) {
  const {
    initial,
    from,
    enter,
    leave,
    update,
    onDestroyed,
    keys,
    items,
    onFrame,
    onRest,
    onStart,
    trail,
    config,
    children,
    unique,
    reset,
    ref,
    ...extra
  } = get(props)

  const mounted = useRef(false)
  const instances = useRef(!mounted.current && new Map())

  const [, forceUpdate] = useState()
  const state = useRef({
    first: true,
    active: {},
    deleted: [],
    current: {},
    transitions: [],
    prevProps: null,
    prevState: undefined,
  })

  // Prop changes effect
  useMemo(
    () => {
      const { transitions, ...rest } = calculateDiffInItems(
        state.current,
        props
      )

      transitions.forEach(
        ({ state: name, from, to, config, trail, key, item, destroyed }) => {
          if (!instances.current.has(key))
            instances.current.set(key, new Ctrl())

          // update the map object
          const ctrl = instances.current.get(key)
          if (name === 'update' || name !== state.current.active[key]) {
            state.current.active[key] = name

            const newProps = {
              to,
              from,
              config,
              onRest: onRest && (values => onRest(item, name, values)),
              onStart: onStart && (() => onStart(item, name)),
              onFrame: onFrame && (values => onFrame(item, name, values)),
              delay: trail,
              ...extra,
            }

            ctrl.update(newProps).then(() => {
              if (mounted.current) {
                if (destroyed && onDestroyed) onDestroyed(item)
                // Clean up internal state when items unmount, this doesn't necessrily trigger a forceUpdate
                if (destroyed) {
                  delete state.current.active[key]
                  state.current = {
                    ...state.current,
                    deleted: state.current.deleted.filter(t => t.key !== key),
                    transitions: state.current.transitions.filter(
                      t => t.key !== key
                    ),
                  }

                  // Only when everything's come to rest we enforce a complete dom clean-up
                  const currentInstances = Array.from(instances.current)
                  if (!currentInstances.some(([, c]) => c.isActive))
                    requestFrame(() => forceUpdate())
                }
              }
            })
          }
        }
      )

      state.current = {
        ...state.current,
        transitions,
        prevProps: props,
        first: false,
        ...rest,
      }
    },
    [items, mapKeys(items, keys).join('')]
  )

  useImperativeMethods(ref, () => ({
    start: () =>
      Promise.all(Array.from(instances.current).map(([, c]) => c.start())),
    stop: () =>
      Array.from(instances.current).forEach(
        ([, c]) => c.isActive && c.stop(/*{ finished: true }*/)
      ),
  }))

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      Array.from(instances.current).map(([, c]) => c.destroy())
      instances.clear()
    }
  }, [])

  return state.current.transitions.map(({ item, state, key }) => {
    return { item, key, state, props: instances.current.get(key).getValues() }
  })
}

function calculateDiffInItems({ first, prevProps, ...state }, props) {
  const { keys: _keys } = get(prevProps || {})
  const {
    keys,
    items,
    initial,
    from,
    unique,
    trail = 0,
    update,
    enter,
    leave,
    config,
  } = get(props)
  const currSet = new Set(keys)
  const prevSet = new Set(_keys)
  let deleted = [...state.deleted]
  let current = { ...state.current }

  const removed = state.transitions.filter(
    ({ destroyed, originalKey }) => !destroyed && !currSet.has(originalKey)
  )

  const added = keys.filter(key => !prevSet.has(key))
  const updated = _keys.filter(key => currSet.has(key))

  // if n
  let delay = (!trail && props.delay) || 0

  // Make sure trailed transitions start at 0
  if (trail) delay -= trail

  added.forEach(key => {
    const keyIndex = keys.indexOf(key)
    const item = items[keyIndex]
    const state = 'enter'

    if (unique && deleted.find(d => d.originalKey === key))
      deleted = deleted.filter(t => t.originalKey !== key)

    current[key] = {
      item,
      state,
      trail: (delay = delay + trail),
      key: unique ? String(key) : guid++,
      originalKey: key,
      destroyed: false,
      config: callProp(config, item, state),
      to: callProp(enter, item),
      from: callProp(
        first ? (initial !== void 0 ? initial || {} : from) : from,
        item
      ),
    }
  })

  removed.forEach(({ item, originalKey, ...rest }) => {
    const keyIndex = _keys.indexOf(originalKey)
    const state = 'leave'
    deleted.unshift({
      ...rest,
      originalKey,
      item,
      state,
      left: _keys[Math.max(0, keyIndex - 1)],
      destroyed: true,
      trail: (delay = delay + trail),
      config: callProp(config, item, state),
      to: callProp(leave, item),
    })
    delete current[item.originalKey]
  })

  updated.forEach(key => {
    const keyIndex = keys.indexOf(key)
    const item = items[keyIndex]
    const state = 'update'
    current[key] = {
      ...current[key],
      item,
      state,
      destroyed: false,
      trail: (delay = delay + trail),
      config: callProp(config, item, state),
      to: callProp(update, item),
    }
  })

  let out = keys.map(key => current[key])

  // This tries to restore order for deleted items by finding their last known siblings
  // only using the left sibling to keep order placement consistent for all deleted items
  deleted.forEach(({ left, right, ...item }) => {
    let pos
    // Was it the element on the left, if yes, move there ...
    if ((pos = out.findIndex(t => t.originalKey === left)) !== -1) pos += 1
    // And if nothing else helps, move it to the start ¯\_(ツ)_/¯
    pos = Math.max(0, pos)
    out = [...out.slice(0, pos), item, ...out.slice(pos)]
  })

  return { deleted, updated, current, transitions: out }
}
