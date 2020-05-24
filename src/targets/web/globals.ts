import AnimatedStyle from '../../animated/AnimatedStyle'
import * as Globals from '../../animated/Globals'
import colorNames from '../../shared/colors'
import createStringInterpolator from '../../shared/stringInterpolation'

let isUnitlessNumber: { [key: string]: true } = {
  animationIterationCount: true,
  borderImageOutset: true,
  borderImageSlice: true,
  borderImageWidth: true,
  boxFlex: true,
  boxFlexGroup: true,
  boxOrdinalGroup: true,
  columnCount: true,
  columns: true,
  flex: true,
  flexGrow: true,
  flexPositive: true,
  flexShrink: true,
  flexNegative: true,
  flexOrder: true,
  gridRow: true,
  gridRowEnd: true,
  gridRowSpan: true,
  gridRowStart: true,
  gridColumn: true,
  gridColumnEnd: true,
  gridColumnSpan: true,
  gridColumnStart: true,
  fontWeight: true,
  lineClamp: true,
  lineHeight: true,
  opacity: true,
  order: true,
  orphans: true,
  tabSize: true,
  widows: true,
  zIndex: true,
  zoom: true,
  // SVG-related properties
  fillOpacity: true,
  floodOpacity: true,
  stopOpacity: true,
  strokeDasharray: true,
  strokeDashoffset: true,
  strokeMiterlimit: true,
  strokeOpacity: true,
  strokeWidth: true,
}

const prefixKey = (prefix: string, key: string) =>
  prefix + key.charAt(0).toUpperCase() + key.substring(1)
const prefixes = ['Webkit', 'Ms', 'Moz', 'O']

isUnitlessNumber = Object.keys(isUnitlessNumber).reduce((acc, prop) => {
  prefixes.forEach(prefix => (acc[prefixKey(prefix, prop)] = acc[prop]))
  return acc
}, isUnitlessNumber)

function dangerousStyleValue(
  name: string,
  value: string | number | boolean | null,
  isCustomProperty: boolean
) {
  if (value == null || typeof value === 'boolean' || value === '') return ''
  if (
    !isCustomProperty &&
    typeof value === 'number' &&
    value !== 0 &&
    !(isUnitlessNumber.hasOwnProperty(name) && isUnitlessNumber[name])
  )
    return value + 'px'
  // Presumes implicit 'px' suffix for unitless numbers
  return ('' + value).trim()
}

const attributeCache: { [key: string]: string } = {}
Globals.injectCreateAnimatedStyle(style => new AnimatedStyle(style))
Globals.injectDefaultElement('div')
Globals.injectStringInterpolator(createStringInterpolator)
Globals.injectColorNames(colorNames)
Globals.injectApplyAnimatedValues(
  (instance, props) => {
    if (instance.nodeType && instance.setAttribute !== undefined) {
      const { style, children, scrollTop, scrollLeft, ...attributes } = props
      const filter =
        instance.nodeName === 'filter' ||
        (instance.parentNode && instance.parentNode.nodeName === 'filter')

      // 更新 scrollTop 和 scrollLeft 属性
      if (scrollTop !== void 0) instance.scrollTop = scrollTop
      if (scrollLeft !== void 0) instance.scrollLeft = scrollLeft

      // Set textContent, if children is an animatable value
      // 如果 children 是 动画值，更新节点 textContent
      if (children !== void 0) instance.textContent = children

      // Set styles ...
      // 遍历设置 style
      for (let styleName in style) {
        if (!style.hasOwnProperty(styleName)) continue
        var isCustomProperty = styleName.indexOf('--') === 0
        var styleValue = dangerousStyleValue(
          styleName,
          style[styleName],
          isCustomProperty
        )
        if (styleName === 'float') styleName = 'cssFloat' // 设置 float
        if (isCustomProperty) instance.style.setProperty(styleName, styleValue) // 更新对应节点的对应样式值
        else instance.style[styleName] = styleValue
      }

      // Set attributes ...
      // 遍历设置 attributes
      for (let name in attributes) {
        // Attributes are written in dash case
        const dashCase = filter
          ? name
          : attributeCache[name] ||
            (attributeCache[name] = name.replace(
              /([A-Z])/g,
              n => '-' + n.toLowerCase()
            ))
        if (typeof instance.getAttribute(dashCase) !== 'undefined')
          instance.setAttribute(dashCase, attributes[name])
      }
      return
    } else return false
  },
  style => style
)
