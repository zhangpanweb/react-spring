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

/*let guid = 0
let mapKeys = (items, keys) =>
  (typeof keys === 'function' ? items.map(keys) : toArray(keys)).map(String)
let get = props => {
  let { items, keys = states => states, ...rest } = props
  items = toArray(items !== void 0 ? items : null)
  return { items, keys: mapKeys(items, keys), ...rest }
}*/

let guid = 0
let mapKeys = (items, keys) =>
  (typeof keys === 'function' ? items.map(keys) : toArray(keys)).map(String)
let get = props => {
  let { items, keys = item => item, ...rest } = props
  items = toArray(items !== void 0 ? items : null)
  return { items, keys: mapKeys(items, keys), ...rest }
}

function calculateDiffInItems({ first, prevProps, ...state }, props) {
  let {
    items,
    keys,
    initial,
    from,
    enter,
    leave,
    update,
    trail = 0,
    unique,
    config,
  } = get(props)
  let { keys: _keys, items: _items } = get(prevProps)
  let current = { ...state.current }
  let deleted = [...state.deleted]

  // Compare next keys with current keys
  let currentKeys = Object.keys(current)
  let currentSet = new Set(currentKeys)
  let nextSet = new Set(keys)
  let added = keys.filter(item => !currentSet.has(item))
  let removed = state.transitions
    .filter(item => !item.destroyed && !nextSet.has(item.originalKey))
    .map(i => i.originalKey)
  let updated = keys.filter(item => currentSet.has(item))
  let delay = 0

  added.forEach(key => {
    // In unique mode, remove fading out transitions if their key comes in again
    if (unique && deleted.find(d => d.originalKey === key))
      deleted = deleted.filter(t => t.originalKey !== key)

    const keyIndex = keys.indexOf(key)
    const item = items[keyIndex]
    const state = 'enter'
    current[key] = {
      state,
      originalKey: key,
      key: unique ? String(key) : guid++,
      item,
      trail: (delay = delay + trail),
      config: callProp(config, item, state),
      from: callProp(
        first ? (initial !== void 0 ? initial || {} : from) : from,
        item
      ),
      to: callProp(enter, item),
    }
  })

  removed.forEach(key => {
    const keyIndex = _keys.indexOf(key)
    const item = _items[keyIndex]
    const state = 'leave'
    deleted.unshift({
      ...current[key],
      state,
      destroyed: true,
      left: _keys[Math.max(0, keyIndex - 1)],
      right: _keys[Math.min(_keys.length, keyIndex + 1)],
      trail: (delay = delay + trail),
      config: callProp(config, item, state),
      to: callProp(leave, item),
    })
    delete current[key]
  })

  updated.forEach(key => {
    const keyIndex = keys.indexOf(key)
    const item = items[keyIndex]
    const state = 'update'
    current[key] = {
      ...current[key],
      item,
      state,
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

  return {
    ...state,
    first: first && added.length === 0,
    transitions: out,
    current,
    deleted,
    prevProps: props,
  }
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
    prevProps: {},
  })

  // Prop changes effect
  //console.log("memo", [mapKeys(items, keys).join(''), state.current.ignoreRef])
  useMemo(
    () => {
      // Update state
      state.current = calculateDiffInItems(state.current, props)

      state.current.transitions.forEach(
        ({ state: name, from, to, config, trail, key, item, destroyed }) => {
          if (!instances.current.has(key))
            instances.current.set(key, new Ctrl())

          // update the map object
          const ctrl = instances.current.get(key)
          const newProps = {
            to,
            from,
            config,
            ref,
            onRest: values => {
              const transition = state.current.transitions.findIndex(
                t => t.key === key
              )
              if (mounted.current && transition !== -1) {
                //console.log('  onRest', ctrl.id)

                // Clean up internal state when items unmount, this doesn't need to trigger a forceUpdate
                if (destroyed) {
                  //console.log('    onDestroyed.1', ctrl.id)
                  if (onDestroyed) onDestroyed(item)
                  //delete state.current.active[key]
                  state.current = {
                    ...state.current,
                    deleted: state.current.deleted.filter(t => t.key !== key),
                    // This update has caused a remove, but postpone it until all springs have come to rest
                    deletions: true,
                  }
                }

                if (onRest) onRest(item, name, values)

                // Only when everything's come to rest we enforce a complete dom clean-up
                const curInstances = Array.from(instances.current)
                const deletions = state.current.deletions
                if (deletions && !curInstances.some(([, c]) => c.isActive)) {
                  //console.log('    onDestroyed.2', ctrl.id)
                  state.current = {
                    ...calculateDiffInItems(state.current, props),
                    // This update should be allowed to pass without pause!
                    ignoreRef: true,
                    // Remove deletions flag
                    deletions: false,
                  }
                  requestFrame(forceUpdate)
                }
              }
            },
            onStart: onStart && (() => onStart(item, name)),
            onFrame: onFrame && (values => onFrame(item, name, values)),
            delay: trail,
            reset: reset && name === 'enter',
            ...extra,
          }

          //console.log(ctrl.id, name, newProps)
          // Update controller
          // If this is a referenced transition it will be paused,
          // unless the call to render comes from an forceUpdate (onRest > destroyed)
          ctrl.update(newProps, !!ref && state.current.ignoreRef !== true)
        }
      )

      state.current = {
        ...state.current,
        ignoreRef: false,
      }
    },
    [mapKeys(items, keys).join(''), state.current.ignoreRef]
  )

  useImperativeMethods(ref, () => ({
    start: () =>
      Promise.all(
        Array.from(instances.current).map(
          ([, c]) => new Promise(r => c.start(r))
        )
      ),
    stop: args =>
      Array.from(instances.current).forEach(
        ([, c]) => c.isActive && c.stop(args)
      ),
    get controllers() {
      return Array.from(instances.current).map(([, c]) => c)
    },
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
