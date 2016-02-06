import Kefir from "kefir"
import R     from "ramda"
import React from "react"

const toObservable = x =>
  x instanceof Kefir.Observable ? x : Kefir.constant(x)

function array() { return Array.from(arguments) }

const combineAsArray = obs =>
  obs.length === 1
  ? toObservable(obs[0]).map(array)
  : Kefir.combine(obs.map(toObservable), array)

const combineAsObject = template => {
  const values = []
  const keys = []
  for (const key in template) {
    keys.push(key)
    values.push(toObservable(template[key]))
  }
  return combineAsArray(values).map(values => {
    const result = {}
    const n = keys.length
    for (let i=0; i<n; ++i)
      result[keys[i]] = values[keys[i]]
    return result
  })
}

//

export const config = {
  onError: e => {throw e}
}

const nullState = {dispose: null, rendered: null}

const common = {
  getInitialState() {
    return nullState
  },
  tryDispose() {
    const {dispose} = this.state
    if (dispose)
      dispose()
  },
  componentWillReceiveProps(nextProps) {
    this.trySubscribe(nextProps)
  },
  componentWillMount() {
    this.trySubscribe(this.props)
  },
  shouldComponentUpdate(np, ns) {
    return ns.rendered !== this.state.rendered
  },
  componentWillUnmount() {
    this.tryDispose()
    this.setState(nullState)
  },
  render() {
    return this.state.rendered
  }
}

//

const FromKefir = React.createClass({
  ...common,
  trySubscribe({kefir}) {
    this.tryDispose()

    const callback = rendered => this.setState({rendered})

    this.setState({dispose: () => kefir.offValue(callback)})
  }
})

export const fromKefir = kefir =>
  React.createElement(FromKefir, {kefir})

//

const FromClass = React.createClass({
  ...common,
  trySubscribe({props}) {
    this.tryDispose()

    const vals = {}
    const obsKeys = []
    const obsStreams = []

    for (const key in props) {
      const val = props[key]
      const keyOut = "mount" === key ? "ref" : key
      if (val instanceof Kefir.Observable) {
        obsKeys.push(keyOut)
        obsStreams.push(val)
      } else if ("children" === key &&
                 val instanceof Array &&
                 val.find(c => c instanceof Kefir.Observable)) {
        obsKeys.push(keyOut)
        obsStreams.push(combineAsArray(val))
      } else {
        vals[keyOut] = val
      }
    }

    const callback = obsVals => {
      const props = {}
      let children = null
      for (const key in vals) {
        const val = vals[key]
        if ("children" === key) {children = val} else {props[key] = val}
      }
      for (let i=0, n=obsKeys.length; i<n; ++i) {
        const key = obsKeys[i]
        const val = obsVals[i]
        if ("children" === key) {children = val} else {props[key] = val}
      }
      this.setState({rendered: React.createElement(this.props.Class,
                                                   props,
                                                   children)})
    }

    const observable = combineAsArray(obsStreams)

    observable.onValue(callback)

    this.setState({dispose: () => observable.offValue(callback)})
  }
})

export const fromClass =
  Class => props => React.createElement(FromClass, {Class, props})

export const fromClasses = classes => {
  const result = {}
  for (const k in classes)
    result[k] = fromClass(classes[k])
  return result
}

//

function K() {
  const nm1 = arguments.length-1
  if (1 === nm1) {
    return toObservable(arguments[0]).map(arguments[1])
      .skipDuplicates(R.equals).toProperty()
  } else {
    const xs = Array(nm1)
    for (let i=0; i<nm1; ++i) {
      const x = arguments[i]
      const c = x && x.constructor
      if (c === Array)
        xs[i] = combineAsArray(x)
      else if (c === Object)
        xs[i] = combineAsObject(x)
      else
        xs[i] = toObservable(x)
    }
    return Kefir.combine(xs, arguments[nm1]).skipDuplicates(R.equals)
  }
}

["a", "abbr", "address", "area", "article", "aside", "audio",
 "b", "base", "bdi", "bdo", "big", "blockquote", "body", "br", "button",
 "canvas", "caption", "circle", "cite", "clipPath", "code", "col", "colgroup",
 "data", "datalist", "dd", "defs", "del", "details", "dfn", "dialog", "div", "dl", "dt",
 "ellipse", "em", "embed",
 "fieldset", "figcaption", "figure", "footer", "form",
 "g",
 "h1", "h2", "h3", "h4", "h5", "h6", "head", "header", "hgroup", "hr", "html",
 "i", "iframe", "image", "img", "input", "ins",
 "kbd", "keygen",
 "label", "legend",
 "li", "line", "linearGradient", "link",
 "main", "map", "mark", "mask", "menu", "menuitem", "meta", "meter",
 "nav", "noscript",
 "object", "ol", "optgroup", "option", "output",
 "p", "param", "path", "pattern", "picture", "polygon", "polyline", "pre", "progress",
 "q",
 "radialGradient", "rect", "rp", "rt", "ruby",
 "s", "samp", "script", "section", "select", "small", "source", "span", "stop", "strong", "style", "sub", "summary", "sup", "svg",
 "table", "tbody", "td", "text", "textarea", "tfoot", "th", "thead", "time", "title", "tr", "track", "tspan",
 "u", "ul",
 "var", "video",
 "wbr"].forEach(c => K[c] = fromClass(c))

// Helpers

const classesImmediate = cs => {
  let result = ""
  for (let i=0, n=cs.length; i<n; ++i) {
    const a = cs[i]
    if (a) {
      if (result)
        result += " "
      result += a
    }
  }
  return result
}

export const classes = (...cs) =>
  ({className: (cs.find(c => c instanceof Kefir.Observable)
                ? combineAsArray(cs).map(classesImmediate)
                : classesImmediate(cs))})

export const bind = template => ({...template, onChange: ({target}) => {
  for (const k in template)
    template[k].set(target[k])
}})

//

Kefir.fromIds = (ids, fromId) =>
  ids.scan(([oldIds], ids) => {
    const newIds = {}
    const newVs = []
    ids.forEach(id => {
      const newV = id in oldIds ? oldIds[id] : fromId(id)
      newIds[id] = newV
      newVs.push(newV)
    })
    return [newIds, newVs]
  }, [{}, []]).map(s => s[1])

//

export default K
