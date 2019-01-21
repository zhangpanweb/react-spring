import {
  useRef,
  useState,
  useEffect,
  useMemo,
  useImperativeMethods,
} from 'react'
import Ctrl from './animated/Controller'
import { is, toArray, callProp } from './shared/helpers'
import { requestFrame } from './animated/Globals'

/** API
 * const transitions = useTransition({ ... })
 */

let guid = 0
let mapKeys = (items, keys) =>
  (typeof keys === 'function' ? items.map(keys) : toArray(keys)).map(String)
let get = props => {
  let { items, keys = item => item, ...rest } = props
  items = toArray(items !== void 0 ? items : null)
  return { items, keys: mapKeys(items, keys), ...rest }
}

export function useTransition(props) {
  const {
    lazy = true,
    unique = false,
    reset = false,
    enter,
    leave,
    update,
    onDestroyed,
    keys,
    items,
    onFrame,
    onRest,
    onStart,
    ref,
    ...extra
  } = get(props)

  const [, forceUpdate] = useState()
  const mounted = useRef(false)
  const state = useRef({
    mounted: false,
    first: true,
    deleted: [],
    current: {},
    transitions: [],
    prevProps: {},
    paused: !!props.ref,
    instances: !mounted.current && new Map(),
    forceUpdate,
  })

  useImperativeMethods(props.ref, () => ({
    name: 'I T E M S',
    start: () =>
      Promise.all(
        Array.from(state.current.instances).map(
          ([, c]) => new Promise(r => c.start(r))
        )
      ),
    stop: finished =>
      Array.from(state.current.instances).forEach(([, c]) => c.stop(finished)),
    get controllers() {
      return Array.from(state.current.instances).map(([, c]) => c)
    },
  }))

  useMemo(
    () => {
      // Update state
      state.current = diffItems(state.current, props)
      state.current.transitions.forEach(transition => {
        const { slot, from, to, config, trail, key, item } = transition
        if (!state.current.instances.has(key))
          state.current.instances.set(key, new Ctrl())

        // update the map object
        const ctrl = state.current.instances.get(key)
        const newProps = {
          ...extra,
          to,
          from,
          config,
          ref,
          onRest: values => {
            if (state.current.mounted) {
              // console.log('  onRest', ctrl.id, props.enter)
              if (transition.destroyed) {
                // If no ref is given delete destroyed items immediately
                if (!lazy) cleanUp(state, key)
                if (onDestroyed) onDestroyed(item)
                console.log('  onRest:destroy.single', ctrl.id, props.enter)
              }

              // A transition comes to rest once all its springs conclude
              const curInstances = Array.from(state.current.instances)
              const active = curInstances.some(([, c]) => !c.idle)
              if (!active) {
                // If this transition is referenced, only remove items when all springs conclude
                if (lazy && state.current.deleted.length > 0) {
                  console.log('  onRest:destroy.all', ctrl.id, props.enter)
                  cleanUp(state)
                }
                if (onRest) onRest(item)
              }
            }
          },
          onStart: onStart && (() => onStart(item, slot)),
          onFrame: onFrame && (values => onFrame(item, slot, values)),
          delay: trail,
          reset: reset && slot === 'enter',
        }

        // console.log(ctrl.id, slot, newProps)
        // Update controller
        ctrl.update(newProps)
        if (!state.current.paused) ctrl.start()
      })
    },
    [mapKeys(items, keys).join('')]
  )

  useEffect(() => {
    state.current.mounted = mounted.current = true
    return () => {
      state.current.mounted = mounted.current = false
      Array.from(state.current.instances).map(([, c]) => c.destroy())
      state.current.instances.clear()
    }
  }, [])

  console.log('useTransition.return', state.current.transitions)
  return state.current.transitions.map(({ item, slot, key }) => {
    return {
      item,
      key,
      state: slot,
      props: state.current.instances.get(key).getValues(),
    }
  })
}

function cleanUp(state, filterKey) {
  const deleted = state.current.deleted
  for (let { key } of deleted) {
    const filter = t => t.key !== key
    if (is.und(filterKey) || filterKey === key) {
      state.current.instances.delete(key)
      state.current.transitions = state.current.transitions.filter(filter)
      state.current.deleted = state.current.deleted.filter(filter)
    }
  }
  state.current.forceUpdate()
}

function diffItems({ first, prevProps, ...state }, props) {
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

  added.forEach((key, index) => {
    // In unique mode, remove fading out transitions if their key comes in again
    if (unique && deleted.find(d => d.originalKey === key)) {
      deleted = deleted.filter(t => t.originalKey !== key)
      //trail = 0
    }

    // TODO: trail shouldn't apply to the first item, no matter if it's enter, leave or update!

    const keyIndex = keys.indexOf(key)
    const item = items[keyIndex]
    const slot = 'enter'
    current[key] = {
      slot,
      originalKey: key,
      key: unique ? String(key) : guid++,
      item,
      trail: (delay = delay + (index > 0 ? trail : 0)),
      config: callProp(config, item, slot),
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
    const slot = 'leave'
    deleted.unshift({
      ...current[key],
      slot,
      destroyed: true,
      left: _keys[Math.max(0, keyIndex - 1)],
      right: _keys[Math.min(_keys.length, keyIndex + 1)],
      trail: (delay = delay + trail),
      config: callProp(config, item, slot),
      to: callProp(leave, item),
    })
    delete current[key]
  })

  updated.forEach(key => {
    const keyIndex = keys.indexOf(key)
    const item = items[keyIndex]
    const slot = 'update'
    current[key] = {
      ...current[key],
      item,
      slot,
      trail: (delay = delay + trail),
      config: callProp(config, item, slot),
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
