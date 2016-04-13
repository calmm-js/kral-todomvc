import * as L from "partial.lenses"
import * as R from "ramda"

const completed = "completed"
const isCompleted = R.prop(completed)
const isActive = R.complement(isCompleted)

export const Todo = {
  create: ({title, completed = false}) => ({title, completed}),
  completed,
  title: "title",
  isCompleted,
  isActive,
  remove: () => {}
}

export const All = {
  allDone: L.lens(R.all(isCompleted),
                  (completed, its) => its.map(it => ({...it, completed}))),
  allActive: R.all(isActive),
  numActive: R.pipe(R.filter(isActive), R.length),
  isEmpty: R.pipe(R.length, R.equals(0)),
  append: R.append,
  clean: R.filter(isActive)
}

export const Todos = {
  all: L.define([])
}
