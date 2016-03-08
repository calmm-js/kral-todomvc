import Kefir from "kefir"

export const hash =
  Kefir.fromEvents(window, "hashchange")
  .merge(Kefir.constant(0)).toProperty()
  .map(() => window.location.hash)
