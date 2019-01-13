import React, { useState, useMemo, useRef, useEffect } from 'react'
import { useTransition, useChain, config, animated } from 'react-spring/hooks'
import shuffle from 'lodash-es/shuffle'
import flatten from 'lodash-es/flatten'
import './styles.css'

export default function Container() {
  const [, forceUpdate] = useState()
  const [items, setItems] = useState([1, 2, 3, 4, 5, 6, 7, 8])
  const [visible, setVisible] = useState(false)
  const shuffleItems = useMemo(() => () => setItems(shuffle), items.length)
  const addItem = useMemo(
    () => () => setItems(items => [...items, Math.max(...items) + 1]),
    items.length
  )
  const removeItem = useMemo(
    () => id => setItems(items => items.filter(item => item !== id)),
    items.length
  )
  const toggle = useMemo(() => () => setVisible(state => !state), items.length)

  return (
    <div className="fts-p-4">
      <div>
        <div>
          <button className="fts-btn" onClick={toggle}>
            view exit animation <small>(in theory lol)</small>
          </button>
          {visible && (
            <>
              <button className="fts-btn fts-fade-in" onClick={addItem}>
                add an item
              </button>
              <button className="fts-btn fts-fade-in" onClick={shuffleItems}>
                shuffle items
              </button>
              <button className="fts-btn fts-fade-in" onClick={forceUpdate}>
                force update
              </button>
            </>
          )}
        </div>
      </div>
      <div>
        <TransitionGrid
          items={items}
          visible={visible}
          removeItem={removeItem}
        />
      </div>
    </div>
  )
}

const TransitionGrid = ({ visible, items, removeItem }) => {
  const containerRef = useRef()
  const containerTransition = useTransition({
    config: config.stiff,
    items: visible,
    from: { opacity: 0, x: -1000 },
    enter: { opacity: 1, x: 0 },
    leave: { opacity: 0, x: 1000 },
    ref: containerRef,
  })

  const itemsRef = useRef()
  const itemsTransition = useTransition({
    config: config.stiff,
    from: { opacity: 0, scale: 0 },
    enter: { opacity: 1, scale: 1 },
    leave: { opacity: 0, scale: 0 },
    items: visible ? items : [],
    trail: 400 / items.length,
    unique: true,
    reset: true,
    ref: itemsRef,
  })

  useChain(visible ? [containerRef, itemsRef] : [itemsRef, containerRef], [
    0,
    visible ? 0.1 : 0.8,
  ])

  return (
    <div style={{ padding: '2rem' }}>
      {containerTransition.map(
        ({ item, key, props: { x, opacity } }) =>
          item && (
            <animated.div
              key={key}
              style={{
                opacity,
                transform: x.interpolate(x => `translateX(${x}px)`),
              }}
              className="fts-grid fts-animated-grid">
              {itemsTransition.map(
                ({ item, key, props: { scale, opacity } }) => (
                  <animated.div
                    className="fts-card"
                    key={key}
                    style={{
                      opacity,
                      transform: scale.interpolate(s => `scale(${s})`),
                    }}
                    onClick={() => removeItem(item)}>
                    <div className="fts-close-card">&#x2715;</div>
                    <div>{item}</div>
                  </animated.div>
                )
              )}
            </animated.div>
          )
      )}
    </div>
  )
}
