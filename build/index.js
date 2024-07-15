var dt = 1 / 50;
var c1 = 2;
var c2 = 30;
var c3 = 1;
var c4 = 1;
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
    function Vertex(pos) {
        this.pos = pos;
        this.force = ZERO_VECTOR;
    }
    Vertex.prototype.applyForce = function (force) { this.force = this.force.add(force); };
    Vertex.prototype.step = function () {
        this.pos = this.pos.add(this.force.mul(c4));
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
    function Graph() {
        this.vertices = new Array();
        this.edges = new Array();
        for (var i = 0; i < 70; i++) {
            this.vertices.push(new Vertex(new Vector(150 + Math.random() * 700, 150 + Math.random() * 700)));
        }
        for (var i = 0; i < 70; i++) {
            this.edges.push(new Edge(this.vertices[i], this.vertices[Math.floor(Math.random() * 70)]));
        }
    }
    Graph.prototype.areAdjacent = function (v1, v2) {
        this.edges.forEach(function (spring) {
            if ((spring.source == v1 && spring.target == v2) || (spring.source == v2 && spring.target == v1)) {
                return true;
            }
        });
        return false;
    };
    return Graph;
}());
var Renderer = (function () {
    function Renderer() {
        this.canvas = document.getElementById("frame");
        this.context = this.canvas.getContext("2d");
        this.fitCanvasToWindow();
    }
    Renderer.prototype.fitCanvasToWindow = function () {
        this.canvas.width = window.innerWidth + 1;
        this.canvas.height = window.innerHeight + 1;
    };
    Renderer.prototype.drawParticle = function (particle) {
        var pos = particle.pos;
        this.context.strokeStyle = "black";
        this.context.beginPath();
        this.context.arc(pos.x, pos.y, 10, 0, 2 * Math.PI);
        this.context.stroke();
    };
    Renderer.prototype.drawSpring = function (spring) {
        var start = spring.source.pos;
        var end = spring.target.pos;
        this.context.strokeStyle = "black";
        this.context.moveTo(start.x, start.y);
        this.context.lineTo(end.x, end.y);
        this.context.stroke();
    };
    Renderer.prototype.clear = function () {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    };
    return Renderer;
}());
var SpringEmbedder = (function () {
    function SpringEmbedder() {
        var _this = this;
        this.renderer = new Renderer();
        this.graph = new Graph();
        this.graph.vertices.forEach(function (particle) {
            _this.renderer.drawParticle(particle);
        });
        this.graph.edges.forEach(function (spring) {
            _this.renderer.drawSpring(spring);
        });
        setInterval(this.step.bind(this), 1000 * dt);
    }
    SpringEmbedder.prototype.step = function () {
        this.stepEades();
        this.stepDraw();
    };
    SpringEmbedder.prototype.stepEades = function () {
        var _this = this;
        this.graph.vertices.forEach(function (particle) {
            particle.applyForce(_this.gravityOrigin(particle));
            _this.graph.vertices.forEach(function (other) {
                var adjacent = _this.graph.areAdjacent(particle, other);
                if (!adjacent) {
                    particle.applyForce(_this.electricalForceEades(particle, other));
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
        this.graph.vertices.forEach(function (particle) {
            particle.step();
            _this.renderer.drawParticle(particle);
        });
        this.graph.edges.forEach(function (spring) {
            _this.renderer.drawSpring(spring);
        });
    };
    SpringEmbedder.prototype.gravityOrigin = function (vertex) {
        var canvas = this.renderer.canvas;
        var r_vec = vertex.pos.to(new Vector(canvas.width / 2, canvas.height / 2));
        var d = Math.max(r_vec.size(), 500);
        var force = r_vec.mul(1 / d).mul(3000 / d);
        return force;
    };
    SpringEmbedder.prototype.springForceEades = function (edge) {
        var r_vec = edge.source.pos.to(edge.target.pos);
        var d = Math.max(r_vec.size(), 1);
        var force = r_vec.mul(1 / d).mul(c1 * Math.log(d / c2));
        return force;
    };
    SpringEmbedder.prototype.electricalForceEades = function (v1, v2) {
        var r_vec = v2.pos.to(v1.pos);
        var d = Math.max(r_vec.size(), 1);
        var force = r_vec.mul(1 / d).mul(c3 / Math.sqrt(d));
        return force;
    };
    return SpringEmbedder;
}());
window.onload = function () {
    new SpringEmbedder();
};
