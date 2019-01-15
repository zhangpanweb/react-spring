import React from 'react'
import { render, cleanup } from 'react-testing-library'

import createMockRaf from 'mock-raf'
//import { FadeIn } from '../../stories/tests/opacity'

import { Globals } from '../targets/web'
import Controller from '../animated/Controller'

test('update', () => {
  const mockRaf = createMockRaf()
  Globals.injectFrame(mockRaf.raf, mockRaf.cancel)
  Globals.injectNow(mockRaf.now)

  const ctrl = new Controller({ x: 0 })
  expect(ctrl.getValues().x.getValue()).toBe(0)

  ctrl.update({ x: 100 })
  expect(ctrl.getValues().x.getValue()).toBe(0)

  ctrl.start()

  mockRaf.step({ count: 10 })
  expect(ctrl.getValues().x.getValue()).toBeCloseTo(56.4)

  mockRaf.step({ count: 100 })
  expect(ctrl.getValues().x.getValue()).toBe(100)

  /*
  //const { container, getByText, debug } = render(<FadeIn />)

  const box = getByText('test')

  expect(parseFloat(box.style.opacity)).toBe(0)

  mockRaf.step({ count: 10 })

  expect(parseFloat(box.style.opacity)).toBeCloseTo(0.56)

  mockRaf.step({ count: 50 })

  expect(parseFloat(box.style.opacity)).toBeCloseTo(1)

  //cleanup()
  */
})
