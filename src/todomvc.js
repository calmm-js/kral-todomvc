import React from "react"
import ReactDOM from "react-dom"

import persist from "./persist"

import Todos from "./todos-control"

ReactDOM.render(<Todos todos={persist({key: "todos-react.kefir", value: []})}/>,
                document.getElementById("app"))
