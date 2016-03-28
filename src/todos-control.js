import Atom                        from "kefir.atom"
import K, {bind, classes, fromIds} from "kefir.react.html"
import * as L                      from "partial.lenses"
import R                           from "ramda"
import React                       from "react"

import {hash} from "./window"

import * as M from "./todos-meta"

const routes =
  [{hash: "#/",          filter: () => true,         title: "All"},
   {hash: "#/active",    filter: M.Todo.isActive,    title: "Active"},
   {hash: "#/completed", filter: M.Todo.isCompleted, title: "Completed"}]

const route = K(hash, h => routes.find(r => r.hash === h) || routes[0])

const Todo = ({todo, editing = Atom(false)}) =>
  <K.li {...classes(K(todo, todo =>
                      L.view(M.Todo.completed, todo) && "completed"),
                    K(editing, "editing", R.and))}>
    <K.input className="toggle"
             type="checkbox"
             hidden={editing}
             {...bind({checked: todo.lens(M.Todo.completed)})}/>
    <K.label className="view"
             onDoubleClick={() => editing.set(true)}>
      {todo.view(M.Todo.title)}
    </K.label>
    <button className="destroy"
            onClick={() => todo.modify(M.Todo.remove)}/>
    {K(editing, e => e && (() => {
      const focus = e => {e.focus(); e.selectionStart = e.value.length}
      const exit = () => editing.set(false)
      const save = e =>
        {const newTitle = e.target.value.trim()
         exit()
         newTitle ? todo.lens(M.Todo.title).set(newTitle)
                  : todo.modify(M.Todo.remove)}
      return <K.input className="edit"
                      type="text"
                      onBlur={save}
                      key="x"
                      mount={c => c && focus(c)}
                      defaultValue={todo.view(M.Todo.title)}
                      onKeyDown={e => e.key === "Enter"  && save(e)
                                   || e.key === "Escape" && exit()}/>})())}
  </K.li>

const NewTodo = ({onEntry}) =>
  <input className="new-todo"
         type="text"
         autoFocus
         placeholder="What needs to be done?"
         onKeyDown={({which, target}) => {
           const title = target.value.trim()
           if (which === 13 && title !== "") {
             onEntry(title)
             target.value = ""
           }
         }}/>

const Filters = () =>
  <ul className="filters">
    {routes.map(r =>
      <li key={r.title}>
        <K.a {...classes(K(route, c => c.hash === r.hash && "selected"))}
             href={r.hash}>
          {r.title}
        </K.a>
      </li>)}
  </ul>

const All = ({all}) =>
  <div>
    <section className="todoapp">
      <header className="header">
        <h1>todos</h1>
        <NewTodo onEntry={
          title => all.modify(M.All.append(M.Todo.create({title})))}/>
      </header>
      <section className="main">
        <K.input type="checkbox"
                 className="toggle-all"
                 hidden={K(all, M.All.isEmpty)}
                 {...bind({checked: all.lens(M.All.allDone)})}/>
        <K.ul className="todo-list">
          {fromIds(K(route, all, ({filter}, all) =>
                     R.flatten(all.map((it, i) => filter(it) ? [i] : []))),
                   i => <Todo key={i} todo={all.lens(i)}/>)}
        </K.ul>
      </section>
      <K.footer className="footer" hidden={K(all, M.All.isEmpty)}>
        <K.span className="todo-count">
          {K(all, R.pipe(M.All.numActive, n =>
                         `${n} item${n === 1 ? "" : "s"} left`))}
        </K.span>
        <Filters/>
        <K.button className="clear-completed"
                  onClick={() => all.modify(M.All.clean)}
                  hidden={K(all, M.All.allActive)}>
          Clear completed
        </K.button>
      </K.footer>
    </section>
    <footer className="info">
      <p>Double-click to edit a todo</p>
      <p><a href="https://github.com/calmm-js/kral-todomvc">GitHub</a></p>
    </footer>
  </div>

export default ({todos}) => <All all={todos.lens(M.Todos.all)}/>
