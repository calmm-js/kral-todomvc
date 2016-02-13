import Kefir from "kefir"
import L     from "partial.lenses"
import R     from "ramda"

//

function createObj(proto) {
  const F = function() {}
  F.prototype = proto
  return new F()
}

function extend(target) {
  const n = arguments.length
  for (let i=1; i<n; ++i)
    for (const p in arguments[i])
      target[p] = arguments[i][p]
  return target
}

function inherit(Child, Parent) {
  const n = arguments.length
  Child.prototype = createObj(Parent.prototype)
  Child.prototype.constructor = Child
  for (let i=2; i<n; ++i)
    extend(Child.prototype, arguments[i])
  return Child
}

//

export function AbstractMutable() {
  Kefir.Property.call(this)
}

inherit(AbstractMutable, Kefir.Property, {
  set(value) {
    this.modify(() => value)
  },
  lens(l, ...ls) {
    return new Lens(this, ls.length === 0 ? l : L(l, ...ls))
  },
  view(l, ...ls) {
    return this.lens(l, ...ls)
  }
})

//

export function Lens(source, lens) {
  AbstractMutable.call(this)
  this._source = source
  this._lens = lens
  this._$handleValue = null
}

inherit(Lens, AbstractMutable, {
  get() {
    return L.view(this._lens, this._source.get())
  },
  modify(fn) {
    this._source.modify(L.over(this._lens, fn))
  },
  _handleValue(context) {
    const next = L.view(this._lens, context)
    const prev = this._currentEvent
    if (!prev || !R.equals(prev.value, next))
      this._emitValue(next)
  },
  _onActivation() {
    const handleValue = value => this._handleValue(value)
    this._$handleValue = handleValue
    this._source.onValue(handleValue)
  },
  _onDeactivation() {
    this._source.offValue(this._$handleValue)
    this._$handleValue = null
  }
})

//

export function Atom(value) {
  AbstractMutable.call(this)
  this._emitValue(value)
}

inherit(Atom, AbstractMutable, {
  get() {
    return this._currentEvent.value
  },
  modify(fn) {
    const value = fn(this.get())
    if (!R.equals(value, this.get()))
      this._emitValue(value)
  }
})

//

export default value => new Atom(value)
