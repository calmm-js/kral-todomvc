import Atom     from "kefir.atom"
import React    from "react"
import ReactDOM from "react-dom"
import Stored   from "atom.storage"

import Todos from "./todos-control"

ReactDOM.render(<Todos todos={Stored({key: "todos-react.kefir",
                                      value: [],
                                      Atom,
                                      debounce: 250,
                                      storage: localStorage})}/>,
                document.getElementById("app"))
