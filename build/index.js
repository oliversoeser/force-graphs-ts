var MouseAction;
(function (MouseAction) {
    MouseAction[MouseAction["None"] = 0] = "None";
    MouseAction[MouseAction["MoveCamera"] = 1] = "MoveCamera";
    MouseAction[MouseAction["MoveVertex"] = 2] = "MoveVertex";
})(MouseAction || (MouseAction = {}));
var DT = 1 / 50;
var EXECUTION_FACTOR = 1;
var SPRING_FACTOR = 3;
var ELECTRICAL_FACTOR = 3;
var VELOCITY_FACTOR = 100;
var GRAVITY_FACTOR = 15000;
var IDEAL_SPRING_LENGTH = 50;
var GRAVITY_RADIUS = 700;
var VERTEX_RADIUS = 10;
var VERTEX_STYLE = "black";
var EDGE_STYLE = "black";
var canvas;
var context;
var cameraPos;
var cameraZoom;
var zoomFactor;
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
    function Vertex(pos, key) {
        this.pos = pos;
        this.force = ZERO_VECTOR;
        this.key = key;
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
var Graph = (function () {
    function Graph(data) {
        var _this = this;
        this.vertices = new Array();
        this.edges = new Array();
        this.keyToVertex = {};
        this.adjacency = {};
        degree = {};
        data.vertices.forEach(function (vdata) {
            var vertex = new Vertex(new Vector(Math.random() * canvas.width, Math.random() * canvas.height), vdata.key);
            _this.keyToVertex[vdata.key] = vertex;
            _this.vertices.push(vertex);
            degree[vdata.key] = 0;
            data.vertices.forEach(function (vdata2) {
                _this.adjacency[vdata.key + vdata2.key] = false;
                _this.adjacency[vdata2.key + vdata.key] = false;
            });
        });
        data.edges.forEach(function (edata) {
            _this.edges.push(new Edge(_this.keyToVertex[edata.source], _this.keyToVertex[edata.target]));
            _this.adjacency[edata.source + edata.target] = true;
            _this.adjacency[edata.target + edata.source] = true;
            degree[edata.source] += 1;
            degree[edata.target] += 1;
        });
    }
    Graph.prototype.areAdjacent = function (v1, v2) {
        return this.adjacency[v1.key + v2.key];
    };
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
        context.arc(pos.x, pos.y, VERTEX_RADIUS * zoomFactor * Math.sqrt(degree[vertex.key]), 0, 2 * Math.PI);
        context.stroke();
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
        this.graph.vertices.forEach(function (vertex) {
            vertex.applyForce(_this.gravityOrigin(vertex));
            _this.graph.vertices.forEach(function (other) {
                var adjacent = _this.graph.areAdjacent(vertex, other);
                if (!adjacent) {
                    vertex.applyForce(_this.electricalForceEades(vertex, other));
                }
            });
        });
        this.graph.edges.forEach(function (edge) {
            var force = _this.springForceEades(edge);
            edge.source.applyForce(force);
            edge.target.applyForce(force.mul(-1));
        });
    };
    SpringEmbedder.prototype.stepDraw = function () {
        var _this = this;
        this.renderer.fitCanvasToWindow();
        this.renderer.clear();
        context.strokeStyle = VERTEX_STYLE;
        this.graph.vertices.forEach(function (vertex) {
            vertex.step();
            _this.renderer.drawVertex(vertex);
        });
        context.strokeStyle = EDGE_STYLE;
        this.graph.edges.forEach(function (edge) {
            _this.renderer.drawEdge(edge);
        });
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
        var force = r_vec.mul(1 / d).mul(SPRING_FACTOR * Math.log(d / (IDEAL_SPRING_LENGTH + VERTEX_RADIUS * Math.sqrt(degree[edge.source.key] * degree[edge.target.key]))));
        return force;
    };
    SpringEmbedder.prototype.electricalForceEades = function (v1, v2) {
        var r_vec = v2.pos.to(v1.pos);
        var d = Math.max(r_vec.size(), 1);
        var force = r_vec.mul(1 / d).mul(Math.pow((degree[v1.key] * degree[v2.key]), (1 / 5)) * ELECTRICAL_FACTOR / Math.sqrt(d));
        return force;
    };
    return SpringEmbedder;
}());
var App = (function () {
    function App(data) {
        var _this = this;
        this.springEmbedder = new SpringEmbedder(data);
        this.currentMouseAction = MouseAction.None;
        this.mousePos = ZERO_VECTOR;
        canvas.addEventListener("mousedown", function (ev) {
            _this.currentMouseAction = MouseAction.MoveCamera;
        });
        canvas.addEventListener("mousemove", function (ev) {
            var newMousePos = new Vector(ev.x, ev.y);
            if (_this.currentMouseAction == MouseAction.MoveCamera) {
                var delta = _this.mousePos.to(newMousePos);
                cameraPos = cameraPos.add(delta);
            }
            _this.mousePos = newMousePos;
        });
        canvas.addEventListener("mouseup", function (ev) {
            _this.currentMouseAction = MouseAction.None;
        });
        canvas.addEventListener("wheel", function (ev) {
            cameraZoom += ev.deltaY * -1;
            zoomFactor = _this.zoomFactorFunction(cameraZoom);
        });
    }
    App.prototype.zoomFactorFunction = function (zoom) {
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
