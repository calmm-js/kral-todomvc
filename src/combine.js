import Kefir from "kefir"
import R     from "ramda"

function extract(template, observables) {
  if (template instanceof Kefir.Observable) {
    observables.push(template)
  } else {
    const constructor = template && template.constructor

    if (constructor === Array)
      for (let i=0, n=template.length; i<n; ++i)
        extract(template[i], observables)
    else if (constructor === Object)
      for (const k in template)
        extract(template[k], observables)
  }
  return observables
}

function combine(template, state) {
  if (template instanceof Kefir.Observable) {
    return state.values[++state.index]
  } else {
    const constructor = template && template.constructor

    if (constructor === Array) {
      const result = []
      for (let i=0, n=template.length; i<n; ++i)
        result[i] = combine(template[i], state)
      return result
    } else if (constructor === Object) {
      const result = {}
      for (const k in template)
        result[k] = combine(template[k], state)
      return result
    }

    return template
  }
}

function invoke(xs) {
  if (!(xs instanceof Array))
    return xs

  const nm1 = xs.length-1
  const f = xs[nm1]
  return f instanceof Function
    ? f(...xs.slice(0, nm1))
    : xs
}

class CombineMany extends Kefir.Property {
  constructor(template) {
    super()
    this._template = template
  }

  _onActivation() {
    this._handlers = Array()
    this._observables = extract(this._template, [])
    this._values = Array()
    this._observables.forEach((obs, i) => {
      const handler = e => this._handleAny(i, e)
      this._handlers[i] = handler
      obs.onAny(handler)
    })
  }

  _handleAny(i, e) {
    switch (e.type) {
      case "value": {
        this._values[i] = e.value

        if (Object.keys(this._values).length === this._observables.length) {
          const next =
            invoke(combine(this._template, {index: -1, values: this._values}))

          const prev = this._currentEvent
          if (!prev || !R.equals(prev.value, next))
            this._emitValue(next)
        }

        break
      }

      case "error": {
        this._emitError(e.value)

        break
      }

      case "end": {
        delete this._observables[i]
        delete this._handlers[i]

        if (Object.keys(this._observables).length === 0) {
          delete this._handlers
          delete this._observables
          delete this._values
          this._emitEnd()
        }

        break
      }
    }
  }

  _onDeactivation() {
    const {_handlers, _observables} = this
    delete this._handlers
    delete this._observables
    delete this._values
    _observables.forEach((obs, i) => obs.offAny(_handlers[i]))
  }
}

class CombineOne extends Kefir.Property {
  constructor(template) {
    super()
    this._template = template
  }

  _onActivation() {
    this._observables = extract(this._template, [])[0]
    this._handlers = e => this._handleAny(e)
    this._observables.onAny(this._handlers)
  }

  _handleAny(e) {
    switch (e.type) {
      case "value": {
        const next =
          invoke(combine(this._template, {index: -1, values: [e.value]}))
        const prev = this._currentEvent
        if (!prev || !R.equals(prev.value, next))
          this._emitValue(next)
        break
      }
      case "error": {
        this._emitError(e.value)
        break
      }
      case "end": {
        delete this._handlers
        delete this._observables
        this._emitEnd()
        break
      }
    }
  }

  _onDeactivation() {
    const {_handlers, _observables} = this
    delete this._handlers
    delete this._observables
    _observables.offAny(_handlers)
  }
}

class CombineOneWith extends Kefir.Property {
  constructor(x, fn) {
    super()
    this._observables = x
    this._fn = fn
  }

  _onActivation() {
    this._handlers = e => this._handleAny(e)
    this._observables.onAny(this._handlers)
  }

  _handleAny(e) {
    switch (e.type) {
      case "value": {
        const next = this._fn(e.value)
        const prev = this._currentEvent
        if (!prev || !R.equals(prev.value, next))
          this._emitValue(next)
        break
      }
      case "error": {
        this._emitError(e.value)
        break
      }
      case "end": {
        this._handlers = null
        this._emitEnd()
        break
      }
    }
  }

  _onDeactivation() {
    const {_handlers, _observables} = this
    delete this._handlers
    _observables.offAny(_handlers)
  }
}

export default (...template) => {
  switch (extract(template, []).length) {
    case 0: return invoke(template)
    case 1: return (template.length === 2 &&
                    template[0] instanceof Kefir.Observable &&
                    template[1] instanceof Function
                    ? new CombineOneWith(template[0], template[1])
                    : new CombineOne(template))
    default: return new CombineMany(template)
  }
}
