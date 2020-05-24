import { MutableRefObject, Ref, useCallback, useState } from 'react'

export const is = {
  arr: Array.isArray,
  obj: (a: unknown): a is object =>
    Object.prototype.toString.call(a) === '[object Object]',
  fun: (a: unknown): a is Function => typeof a === 'function',
  str: (a: unknown): a is string => typeof a === 'string',
  num: (a: unknown): a is number => typeof a === 'number',
  und: (a: unknown): a is undefined => a === void 0,
  nul: (a: unknown): a is null => a === null,
  set: (a: unknown): a is Set<any> => a instanceof Set,
  map: (a: unknown): a is Map<any, any> => a instanceof Map,
  equ(a: any, b: any) {
    if (typeof a !== typeof b) return false // 类型不等，肯定不等
    if (is.str(a) || is.num(a)) return a === b // 如果是 string 或者 number，直接比较
    if (
      is.obj(a) &&
      is.obj(b) &&
      Object.keys(a).length + Object.keys(b).length === 0
    ) // 都是对象，但是都没有 key，都是空对象
      return true
    let i
    for (i in a) if (!(i in b)) return false // b 中不包含所有 a 中的key，不等
    for (i in b) if (a[i] !== b[i]) return false // b 中包含 a 中所有key，但是值不同，不等
    return is.und(i) ? a === b : true // 如果 i 不是undefined，key 和 值都等，相等，否则 a === b
  },
}

export function merge(target: any, lowercase: boolean = true) {
  return (object: object) =>
    // object 是数组，reduce数组；如果不是，reduce key值
    (is.arr(object) ? object : Object.keys(object)).reduce(
      (acc: any, element) => {
        const key = lowercase // lowercase 为 true，把第一个字母变成大写
          ? element[0].toLowerCase() + element.substring(1)
          : element
        acc[key] = target(key) // 使用 key 调用 target ，返回值再挂载在 targe 的 key 属性下
        return acc
      },
      target
    )
}

export function useForceUpdate() {
  const [, f] = useState(false)
  const forceUpdate = useCallback(() => f(v => !v), []) // 将状态值变为相反，从而达到强制刷新的目的
  return forceUpdate
}

export function withDefault<T, DT>(value: T, defaultValue: DT) {
  // 如果 value 是 undefined 或者是 null，使用 defaultValue，否则使用原值 value
  return is.und(value) || is.nul(value) ? defaultValue : value
}

export function toArray<T>(a?: T | T[]): T[] {
  // a 是 undefined ，返回 []
  // a 不是 undefined，如果 a 是数组，直接返回 a，否则返回 [a]
  return !is.und(a) ? (is.arr(a) ? a : [a]) : []
}

export function callProp<T>(
  obj: T,
  ...args: any[]
): T extends (...args: any[]) => infer R ? R : T {
  return is.fun(obj) ? obj(...args) : obj
}

type PartialExcludedProps = Partial<{
  to: any
  from: any
  config: any
  onStart: any
  onRest: any
  onFrame: any
  children: any
  reset: any
  reverse: any
  force: any
  immediate: any
  delay: any
  attach: any
  destroyed: any
  interpolateTo: any
  ref: any
  lazy: any
}> &
  object

export type ForwardedProps<T> = Pick<
  T,
  Exclude<keyof T, keyof PartialExcludedProps>
>

// 获取 forward 属性，不是 PartialExcludedProps 范围内的属性就是 forward 属性
function getForwardProps<P extends PartialExcludedProps>(
  props: P
): ForwardedProps<P> {
  const {
    to,
    from,
    config,
    onStart,
    onRest,
    onFrame,
    children,
    reset,
    reverse,
    force,
    immediate,
    delay,
    attach,
    destroyed,
    interpolateTo,
    ref,
    lazy,
    ...forward
  } = props
  return forward
}

interface InterpolateTo<T> extends PartialExcludedProps {
  to: ForwardedProps<T>
}
export function interpolateTo<T extends PartialExcludedProps>(
  props: T
): InterpolateTo<T> {
  // 获取对应的 to 属性
  const forward: ForwardedProps<T> = getForwardProps(props)
  // 如果 to 属性没有，直接返回
  if (is.und(forward)) return { to: forward, ...props }
  const rest = Object.keys(props).reduce<PartialExcludedProps>(
    (a: PartialExcludedProps, k: string) =>
      // 遍历 props，如果 to 属性有值，返回对应的属性值
      !is.und((forward as any)[k]) ? a : { ...a, [k]: (props as any)[k] },
    {}
  )
  return { to: forward, ...rest }
}

// 把 ref 给 forward ref，也就是把 ref 给上层
// 然后返回 ref
export function handleRef<T>(ref: T, forward: Ref<T>) {
  if (forward) { // 如果 forward 存在
    // If it's a function, assume it's a ref callback
    if (is.fun(forward)) forward(ref) // 如果 forward 是函数，则表示是一个 callback ref
    else if (is.obj(forward)) { // 如果是 对象 并且有 current 属性，则表示是一个 ref 对象
      // If it's an object and has a 'current' property, assume it's a ref object
      ;(forward as MutableRefObject<T>).current = ref
    }
  }
  return ref
}
