var DT = 1 / 50;
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
var Graph = (function () {
    function Graph(data) {
        var _this = this;
        this.vertices = new Array();
        this.edges = new Array();
        this.keyToVertex = {};
        data.vertices.forEach(function (vdata) {
            var vertex = new Vertex(new Vector(Math.random() * canvas.width, Math.random() * canvas.height), vdata.key);
            _this.keyToVertex[vdata.key] = vertex;
            _this.vertices.push(vertex);
        });
        data.edges.forEach(function (edata) {
            _this.edges.push(new Edge(_this.keyToVertex[edata.source], _this.keyToVertex[edata.target]));
        });
    }
    Graph.prototype.areAdjacent = function (v1, v2) {
        this.edges.forEach(function (edge) {
            if ((edge.source == v1 && edge.target == v2) || (edge.source == v2 && edge.target == v1)) {
                return true;
            }
        });
        return false;
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
        var pos = vertex.pos;
        context.beginPath();
        context.arc(pos.x, pos.y, VERTEX_RADIUS, 0, 2 * Math.PI);
        context.stroke();
    };
    Renderer.prototype.drawEdge = function (edge) {
        var start = edge.source.pos;
        var end = edge.target.pos;
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
        setInterval(this.step.bind(this), 1000 * DT);
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
        var force = r_vec.mul(1 / d).mul(SPRING_FACTOR * Math.log(d / IDEAL_SPRING_LENGTH));
        return force;
    };
    SpringEmbedder.prototype.electricalForceEades = function (v1, v2) {
        var r_vec = v2.pos.to(v1.pos);
        var d = Math.max(r_vec.size(), 1);
        var force = r_vec.mul(1 / d).mul(ELECTRICAL_FACTOR / Math.sqrt(d));
        return force;
    };
    return SpringEmbedder;
}());
window.onload = function () {
    fetch('../data/graph.json')
        .then(function (response) { return response.json(); })
        .then(function (json) { return start(json); });
};
function start(data) {
    canvas = document.getElementById("frame");
    context = canvas.getContext("2d");
    new SpringEmbedder(data);
}
