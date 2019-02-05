import {
  ForwardRefExoticComponent,
  ComponentPropsWithRef,
  ReactType,
} from 'react'
import { animated } from './renderprops-universal'
export * from './renderprops-universal'

import * as konva from 'react-konva'

type KonvaComponents = Pick<
  typeof konva,
  {
    [K in keyof typeof konva]: typeof konva[K] extends ReactType ? K : never
  }[keyof typeof konva]
>

declare const augmentedAnimated: typeof animated &
  {
    [Tag in keyof KonvaComponents]: ForwardRefExoticComponent<
      ComponentPropsWithRef<KonvaComponents[Tag]>
    >
  }

export { augmentedAnimated as animated }
