var MouseAction;
(function (MouseAction) {
    MouseAction[MouseAction["None"] = 0] = "None";
    MouseAction[MouseAction["MoveCamera"] = 1] = "MoveCamera";
    MouseAction[MouseAction["MoveVertex"] = 2] = "MoveVertex";
})(MouseAction || (MouseAction = {}));
var DT = 1 / 30;
var EXECUTION_FACTOR = 1;
var SPRING_FACTOR = 3;
var ELECTRICAL_FACTOR = 3;
var VELOCITY_FACTOR = 100;
var GRAVITY_FACTOR = 15000;
var IDEAL_SPRING_LENGTH = 50;
var GRAVITY_RADIUS = 700;
var VERTEX_RADIUS = 10;
var VERTEX_STROKE = "#023047";
var VERTEX_FILL = "#8ECAE6";
var EDGE_STROKE = "grey";
var SELECTION_FILL = "black";
var BACKGROUND_COLOR = "white";
var canvas;
var context;
var cameraPos;
var cameraZoom;
var zoomFactor;
var selectedVertex;
var mousePos;
var Vector = (function () {
    function Vector(x, y) {
        this.x = x;
        this.y = y;
    }
    Vector.prototype.add = function (other) { return new Vector(this.x + other.x, this.y + other.y); };
    Vector.prototype.sub = function (other) { return new Vector(this.x - other.x, this.y - other.y); };
    Vector.prototype.to = function (other) { return new Vector(other.x - this.x, other.y - this.y); };
    Vector.prototype.size = function () { return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2)); };
    Vector.prototype.mul = function (factor) { return new Vector(this.x * factor, this.y * factor); };
    return Vector;
}());
var ZERO_VECTOR = new Vector(0, 0);
var SECOND = 1000;
var Vertex = (function () {
    function Vertex(pos, id, name, title) {
        this.pos = pos;
        this.force = ZERO_VECTOR;
        this.id = id;
        this.name = name;
        this.title = title;
    }
    Vertex.prototype.applyForce = function (force) { this.force = this.force.add(force); };
    Vertex.prototype.step = function () {
        this.pos = this.pos.add(this.force.mul(VELOCITY_FACTOR * DT));
        this.force = ZERO_VECTOR;
    };
    return Vertex;
}());
var Edge = (function () {
    function Edge(source, target) {
        this.source = source;
        this.target = target;
    }
    return Edge;
}());
var degree;
var adjacency;
var Graph = (function () {
    function Graph(data) {
        var _this = this;
        this.vertices = new Array();
        this.edges = new Array();
        this.nameToId = {};
        degree = new Array();
        adjacency = new Array();
        for (var id = 0; id < data.vertices.length; id++) {
            var vdata = data.vertices[id];
            this.nameToId[vdata.name] = id;
            this.vertices.push(new Vertex(new Vector(Math.random() * canvas.width, Math.random() * canvas.height), id, vdata.name, vdata.title));
            degree.push(0);
            adjacency.push([]);
            for (var j = 0; j < data.vertices.length; j++) {
                adjacency[id][j] = 0;
            }
        }
        data.edges.forEach(function (edata) {
            var sId = _this.nameToId[edata.sourcename];
            var tId = _this.nameToId[edata.targetname];
            _this.edges.push(new Edge(_this.vertices[sId], _this.vertices[tId]));
            degree[sId]++;
            degree[tId]++;
            adjacency[sId][tId] = 1;
            adjacency[tId][sId] = 1;
        });
    }
    return Graph;
}());
var Renderer = (function () {
    function Renderer() {
        this.fitCanvasToWindow();
    }
    Renderer.prototype.fitCanvasToWindow = function () {
        canvas.width = window.innerWidth + 1;
        canvas.height = window.innerHeight + 1;
    };
    Renderer.prototype.drawVertex = function (vertex) {
        var pos = vertex.pos.add(cameraPos).mul(zoomFactor);
        context.beginPath();
        context.arc(pos.x, pos.y, VERTEX_RADIUS * zoomFactor * Math.sqrt(degree[vertex.id]), 0, 2 * Math.PI);
        context.fill();
        context.stroke();
    };
    Renderer.prototype.drawSelectionInfo = function () {
        if (selectedVertex == undefined)
            return;
        var vertex = selectedVertex;
        var pos = vertex.pos.add(cameraPos).mul(zoomFactor);
        context.font = "".concat(14 + 8 / (1 + Math.exp(18 - 10 * Math.cbrt(degree[vertex.id]))), "px Arial");
        context.fillText(vertex.title, pos.x - context.measureText(vertex.title).width / 2, pos.y);
        context.fillStyle = VERTEX_STROKE;
    };
    Renderer.prototype.drawEdge = function (edge) {
        var start = edge.source.pos.add(cameraPos).mul(zoomFactor);
        var end = edge.target.pos.add(cameraPos).mul(zoomFactor);
        context.moveTo(start.x, start.y);
        context.lineTo(end.x, end.y);
        context.stroke();
    };
    Renderer.prototype.clear = function () {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.rect(0, 0, canvas.width, canvas.height);
        context.fillStyle = BACKGROUND_COLOR;
        context.fill();
    };
    return Renderer;
}());
var SpringEmbedder = (function () {
    function SpringEmbedder(data) {
        var _this = this;
        this.renderer = new Renderer();
        this.graph = new Graph(data);
        this.graph.vertices.forEach(function (vertex) {
            _this.renderer.drawVertex(vertex);
        });
        this.graph.edges.forEach(function (edge) {
            _this.renderer.drawEdge(edge);
        });
        setInterval(this.step.bind(this), EXECUTION_FACTOR * DT * SECOND);
    }
    SpringEmbedder.prototype.step = function () {
        this.stepEades();
        this.stepDraw();
    };
    SpringEmbedder.prototype.stepEades = function () {
        var _this = this;
        var _loop_1 = function (id) {
            var vertex = this_1.graph.vertices[id];
            vertex.applyForce(this_1.gravityOrigin(vertex));
            this_1.graph.vertices.forEach(function (other) {
                if (!adjacency[vertex.id][other.id]) {
                    vertex.applyForce(_this.electricalForceEades(vertex, other));
                }
            });
        };
        var this_1 = this;
        for (var id = 0; id < this.graph.vertices.length; id++) {
            _loop_1(id);
        }
        this.graph.edges.forEach(function (edge) {
            var force = _this.springForceEades(edge);
            edge.source.applyForce(force);
            edge.target.applyForce(force.mul(-1));
        });
        if (selectedVertex != undefined) {
            selectedVertex.applyForce(this.mousePullForce(selectedVertex));
        }
    };
    SpringEmbedder.prototype.stepDraw = function () {
        var _this = this;
        this.renderer.fitCanvasToWindow();
        this.renderer.clear();
        context.strokeStyle = EDGE_STROKE;
        this.graph.edges.forEach(function (edge) {
            _this.renderer.drawEdge(edge);
        });
        context.strokeStyle = VERTEX_STROKE;
        context.fillStyle = VERTEX_FILL;
        this.graph.vertices.forEach(function (vertex) {
            vertex.step();
            _this.renderer.drawVertex(vertex);
        });
        context.fillStyle = SELECTION_FILL;
        this.renderer.drawSelectionInfo();
    };
    SpringEmbedder.prototype.gravityOrigin = function (vertex) {
        var r_vec = vertex.pos.to(new Vector(canvas.width / 2, canvas.height / 2));
        var d = Math.max(r_vec.size(), GRAVITY_RADIUS);
        var force = r_vec.mul(1 / d).mul(GRAVITY_FACTOR / d);
        return force;
    };
    SpringEmbedder.prototype.springForceEades = function (edge) {
        var r_vec = edge.source.pos.to(edge.target.pos);
        var d = Math.max(r_vec.size(), 1);
        var force = r_vec.mul(1 / d).mul(SPRING_FACTOR * Math.log(d / (IDEAL_SPRING_LENGTH + VERTEX_RADIUS * Math.sqrt(degree[edge.source.id] * degree[edge.target.id]))));
        return force;
    };
    SpringEmbedder.prototype.electricalForceEades = function (v1, v2) {
        var r_vec = v2.pos.to(v1.pos);
        var d = Math.max(r_vec.size(), 1);
        var force = r_vec.mul(1 / d).mul(Math.pow((degree[v1.id] * degree[v2.id]), (1 / 5)) * ELECTRICAL_FACTOR / Math.sqrt(d));
        return force;
    };
    SpringEmbedder.prototype.mousePullForce = function (vertex) {
        var r_vec = vertex.pos.add(cameraPos).mul(zoomFactor).to(mousePos);
        var force = r_vec.mul(1 / 7);
        return force;
    };
    return SpringEmbedder;
}());
var App = (function () {
    function App(data) {
        var _this = this;
        this.springEmbedder = new SpringEmbedder(data);
        this.currentMouseAction = MouseAction.None;
        mousePos = ZERO_VECTOR;
        selectedVertex = undefined;
        canvas.addEventListener("mousedown", function (ev) {
            _this.currentMouseAction = MouseAction.MoveCamera;
            _this.springEmbedder.graph.vertices.forEach(function (vertex) {
                if (vertex.pos.add(cameraPos).mul(zoomFactor).to(new Vector(ev.x, ev.y)).size() < VERTEX_RADIUS * zoomFactor * Math.sqrt(degree[vertex.id])) {
                    selectedVertex = vertex;
                    _this.currentMouseAction = MouseAction.MoveVertex;
                }
            });
        });
        canvas.addEventListener("mousemove", function (ev) {
            var newMousePos = new Vector(ev.x, ev.y);
            if (_this.currentMouseAction == MouseAction.MoveCamera) {
                var delta = mousePos.to(newMousePos);
                cameraPos = cameraPos.add(delta);
            }
            mousePos = newMousePos;
        });
        canvas.addEventListener("mouseup", function (ev) {
            _this.currentMouseAction = MouseAction.None;
            selectedVertex = undefined;
        });
        canvas.addEventListener("wheel", function (ev) {
            cameraZoom += ev.deltaY * -1;
            zoomFactor = _this.zoomFactor(cameraZoom);
        });
    }
    App.prototype.zoomFactor = function (zoom) {
        return Math.max(Math.exp(zoom / 5000), 0.2);
    };
    return App;
}());
window.onload = function () {
    fetch('../data/graph.json')
        .then(function (response) { return response.json(); })
        .then(function (json) { return start(json); });
};
function start(data) {
    canvas = document.getElementById("frame");
    context = canvas.getContext("2d");
    cameraPos = ZERO_VECTOR;
    cameraZoom = 0;
    zoomFactor = 1;
    new App(data);
}
