import Atom from "kefir.atom"

export default ({key, value, debounce = 250}) => {
  const item = localStorage.getItem(key)
  const atom = Atom(item ? JSON.parse(item) : value)
  atom.changes().debounce(debounce).onValue(
    v => localStorage.setItem(key, JSON.stringify(v)))
  return atom
}
