import Atom from "./kefir.atom"
import K, {bind, classes} from "./kefir.react.html"
import Kefir from "kefir"
import L from "partial.lenses"
import R from "ramda"
import React from "react"
import ReactDOM from "react-dom"

const hash = Kefir.fromEvents(window, "hashchange")
             .merge(Kefir.constant(0)).toProperty()
             .map(() => window.location.hash)

const TodoItem = ({model, editing = Atom(false)}) =>
  <K.li {...classes(K(model, m => m.completed && "completed"),
                    K(editing, e => e && "editing"))}>
    <K.input className="toggle" type="checkbox" hidden={editing}
             {...bind({checked: model.lens("completed")})}/>
    <K.label onDoubleClick={() => editing.set(true)}
             className="view">{model.view("title")}</K.label>
    <button className="destroy" onClick={() => model.set()}/>
    {K(editing, e => e && (() => {
      const exit = () => editing.set(false)
      const save = e =>
        {const newTitle = e.target.value.trim()
         exit()
         newTitle === "" ? model.set()
                         : model.lens("title").set(newTitle)}
      return <K.input type="text" onBlur={save} className="edit" key="x"
               mount={c => c && c.focus()} defaultValue={model.view("title")}
               onKeyDown={e => e.which === 13 && save(e) ||
                               e.which === 27 && exit()}/>})())}
  </K.li>

const TodoApp = ({model: m}) => {
  const routes = [{hash: "#/",          filter: () => true, title: "All"},
                  {hash: "#/active",    filter: active,     title: "Active"},
                  {hash: "#/completed", filter: completed,  title: "Completed"}]

  const route = K(hash, h => R.find(r => r.hash === h, routes) || routes[0])
  const indices = K(m.all, route, (all, {filter}) =>
                    R.flatten(all.map((it, i) => filter(it) ? [i] : [])))

  return <div>
    <section className="todoapp">
      <header className="header">
        <h1>todos</h1>
        <input type="text" className="new-todo" autoFocus
           placeholder="What needs to be done?" onKeyDown={e => {
             const t = e.target.value.trim()
             if (e.which === 13 && t !== "") {
               m.addItem({title: t}); e.target.value = ""}}}/>
      </header>

      <section className="main">
        <K.input type="checkbox" className="toggle-all" hidden={m.isEmpty}
          {...bind({checked: m.allDone})}/>
        <K.ul className="todo-list">{Kefir.fromIds(indices, i =>
          <TodoItem key={i} model={m.all.lens(i)}/>)}</K.ul>
      </section>
      <K.footer className="footer" hidden={m.isEmpty}>
        <K.span className="todo-count">{K(K(m.all, R.filter(active)),
          i => `${i.length} item${i.length === 1 ? "" : "s"} left`)}</K.span>
        <ul className="filters">{routes.map(r => <li key={r.title}>
            <K.a {...classes(route.map(cr => cr.hash === r.hash && "selected"))}
               href={r.hash}>{r.title}</K.a>
          </li>)}</ul>
        <K.button className="clear-completed" onClick={m.clean}
                  hidden={K(m.all, R.all(active))}>
          Clear completed</K.button>
      </K.footer>

    </section>
    <footer className="info"><p>Double-click to edit a todo</p></footer>
  </div>
}

const active = i => !i.completed
const completed = i => i.completed

TodoApp.model = (all = Atom([])) => ({
  all: all.lens(L.define([])),
  isEmpty: K(all, a => a.length === 0),
  addItem: ({title, completed = false}) =>
    all.modify(R.append({title, completed})),
  allDone: all.lens(L.lens(
    R.all(completed),
    (completed, items) => items.map(i => ({...i, completed})))),
  clean: () => all.modify(R.filter(active))
})

const storeKey = "todos-react.kefir"

const m = TodoApp.model(Atom(JSON.parse(localStorage.getItem(storeKey) || "[]")))
m.all.onValue(is => localStorage.setItem(storeKey, JSON.stringify(is)))

ReactDOM.render(<TodoApp model={m}/>, document.getElementById("app"))
