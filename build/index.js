var MouseAction;
(function (MouseAction) {
    MouseAction[MouseAction["None"] = 0] = "None";
    MouseAction[MouseAction["MoveCamera"] = 1] = "MoveCamera";
    MouseAction[MouseAction["MoveVertex"] = 2] = "MoveVertex";
})(MouseAction || (MouseAction = {}));
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
var DT = 1 / 20;
var SPRING_FACTOR = 1;
var ELECTRICAL_FACTOR = 20000;
var IDEAL_SPRING_LENGTH = 25;
var GRAPH_DATA_PATH = "../data/graph.json";
var SUCCESSOR_EDGE = "green";
var PREDECESSOR_EDGE = "red";
var HIGHLIGHT_COLOR = "orange";
var TEXT_COLOR = "black";
var TEXT_FONT = "Arial";
var SIZE_H1 = 30;
var SIZE_H3 = 26;
var SIZE_H4 = 18;
var SIDEBAR_STYLE = "rgba(255, 255, 255, 0.7)";
var INFO_BG_STYLE = "rgba(255, 255, 255, 0.4)";
var VERTEX_STROKE = "#023047";
var VERTEX_FILL = "#8ECAE6";
var EDGE_STROKE = "grey";
var SELECTION_FILL = "black";
var BACKGROUND_COLOR = "rgb(245, 245, 245)";
var BIOLOGY = ["bich", "bilg", "bite", "cebi", "debi", "eclg", "evbi", "gene", "idbi", "immu", "mlbi", "moge", "pgbi", "plsc", "zlgy"];
var CHEMISTRY = ["chem", "chph", "scbi"];
var ENGINEERING = ["chee", "cive", "elee", "maee", "mece", "pgee", "scee"];
var GEOSCIENCES = ["easc", "ecsc", "envi", "gegr", "gesc", "mete", "pgge", "prge"];
var INFORMATICS = ["infr"];
var MATHEMATICS = ["math"];
var PHYSICS = ["pgph", "phys"];
var BIOLOGY_COLOR = "#24F07C";
var CHEMISTRY_COLOR = "#4B9B6D";
var ENGINEERING_COLOR = "#F0CF24";
var GEOSCIENCES_COLOR = "#706A49";
var INFORMATICS_COLOR = "#949F99";
var MATHEMATICS_COLOR = "#F03424";
var PHYSICS_COLOR = "#2F24F0";
var ZERO_VECTOR = new Vector(0, 0);
var SECOND = 1000;
var cameraPos = ZERO_VECTOR;
var cameraZoom = 0;
var zoomFactor = 1;
var selectedVertex;
var mousePos = ZERO_VECTOR;
var mouseActive = false;
var currentMouseAction = MouseAction.None;
var canvas;
var context;
var degree;
function sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
}
function splitText(text, maxWidth) {
    var words = text.split(" ");
    var lines = [];
    var substring = words[0];
    for (var i = 1; i < words.length; i++) {
        if (context.measureText(substring + " " + words[i]).width >= maxWidth) {
            lines.push(substring);
            substring = words[i];
        }
        else {
            substring += " " + words[i];
        }
    }
    lines.push(substring);
    return lines;
}
function degreeToRadius(degree) {
    return 10 * zoomFactor * (0.7 * sigmoid(degree - 5) + 0.5);
}
function getColor(name) {
    name = name.substring(0, 4);
    if (BIOLOGY.includes(name))
        return BIOLOGY_COLOR;
    else if (CHEMISTRY.includes(name))
        return CHEMISTRY_COLOR;
    else if (ENGINEERING.includes(name))
        return ENGINEERING_COLOR;
    else if (GEOSCIENCES.includes(name))
        return GEOSCIENCES_COLOR;
    else if (INFORMATICS.includes(name))
        return INFORMATICS_COLOR;
    else if (MATHEMATICS.includes(name))
        return MATHEMATICS_COLOR;
    else if (PHYSICS.includes(name))
        return PHYSICS_COLOR;
    else
        VERTEX_FILL;
}
function fillTriangle(a, b, c) {
    context.beginPath();
    context.moveTo(a.x, a.y);
    context.lineTo(b.x, b.y);
    context.lineTo(c.x, c.y);
    context.lineTo(a.x, a.y);
    context.fill();
}
var Vertex = (function () {
    function Vertex(pos, id, name, title, color) {
        this.pos = pos;
        this.force = ZERO_VECTOR;
        this.id = id;
        this.name = name;
        this.title = title;
        this.color = color;
    }
    Vertex.prototype.applyForce = function (force) { this.force = this.force.add(force); };
    Vertex.prototype.step = function () {
        this.pos = this.pos.add(this.force.mul(DT));
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
        this.nameToId = {};
        degree = new Array();
        for (var id = 0; id < data.vertices.length; id++) {
            var vdata = data.vertices[id];
            this.nameToId[vdata.name] = id;
            this.vertices.push(new Vertex(new Vector(Math.random() * canvas.width, Math.random() * canvas.height), id, vdata.name, vdata.title, getColor(vdata.name)));
            degree.push(0);
        }
        data.edges.forEach(function (edata) {
            var sId = _this.nameToId[edata.sourcename];
            var tId = _this.nameToId[edata.targetname];
            _this.edges.push(new Edge(_this.vertices[sId], _this.vertices[tId]));
            degree[sId]++;
            degree[tId]++;
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
        context.fillStyle = vertex.color;
        context.strokeStyle = VERTEX_STROKE;
        context.lineWidth = 1;
        context.beginPath();
        context.arc(pos.x, pos.y, degreeToRadius(degree[vertex.id]), 0, 2 * Math.PI);
        context.fill();
        context.stroke();
    };
    Renderer.prototype.drawRelatedVertex = function (vertex, color) {
        var pos = vertex.pos.add(cameraPos).mul(zoomFactor);
        context.strokeStyle = color;
        context.fillStyle = color;
        context.beginPath();
        context.arc(pos.x, pos.y, 3 + degreeToRadius(degree[vertex.id]), 0, 2 * Math.PI);
        context.fill();
    };
    Renderer.prototype.drawVertexInfo = function (vertex) {
        var pos = vertex.pos.add(cameraPos).mul(zoomFactor);
        var size = 14 + 8 / (1 + Math.exp(18 - 10 * Math.cbrt(degree[vertex.id])));
        context.fillStyle = TEXT_COLOR;
        context.font = "".concat(size, "px ").concat(TEXT_FONT);
        var width = context.measureText(vertex.title).width;
        context.fillStyle = INFO_BG_STYLE;
        context.fillRect(pos.x - 1.01 * width / 2, pos.y - size, 1.01 * width, size * 1.5);
        context.fillStyle = TEXT_COLOR;
        context.fillText(vertex.title, pos.x - width / 2, pos.y);
    };
    Renderer.prototype.drawEdge = function (edge) {
        var start = edge.source.pos.add(cameraPos).mul(zoomFactor);
        var end = edge.target.pos.add(cameraPos).mul(zoomFactor);
        if (selectedVertex == undefined) { }
        else if (edge.source.id == selectedVertex.id) {
            context.lineWidth = 3;
            context.strokeStyle = SUCCESSOR_EDGE;
            context.fillStyle = SUCCESSOR_EDGE;
            context.beginPath();
            context.moveTo(start.x, start.y);
            context.lineTo(end.x, end.y);
            context.stroke();
            var line = end.to(start);
            var len = line.size();
            var u_dir = line.mul(1 / len);
            var normal_dir = new Vector(-u_dir.y, u_dir.x);
            var midpoint = end.add(u_dir.mul(len / 2));
            var a = midpoint.add(normal_dir.mul(7));
            var b = midpoint.sub(normal_dir.mul(7));
            var c = midpoint.add(u_dir.mul(-8));
            fillTriangle(a, b, c);
            this.drawRelatedVertex(edge.target, SUCCESSOR_EDGE);
            return;
        }
        else if (edge.target.id == selectedVertex.id) {
            context.lineWidth = 3;
            context.strokeStyle = PREDECESSOR_EDGE;
            context.fillStyle = PREDECESSOR_EDGE;
            context.beginPath();
            context.moveTo(start.x, start.y);
            context.lineTo(end.x, end.y);
            context.stroke();
            var line = start.to(end);
            var len = line.size();
            var u_dir = line.mul(1 / len);
            var normal_dir = new Vector(-u_dir.y, u_dir.x);
            var midpoint = start.add(u_dir.mul(len / 2));
            var a = midpoint.add(normal_dir.mul(7));
            var b = midpoint.sub(normal_dir.mul(7));
            var c = midpoint.add(u_dir.mul(8));
            fillTriangle(a, b, c);
            this.drawRelatedVertex(edge.source, PREDECESSOR_EDGE);
            return;
        }
        context.lineWidth = 1;
        context.strokeStyle = EDGE_STROKE;
        context.beginPath();
        context.moveTo(start.x, start.y);
        context.lineTo(end.x, end.y);
        context.stroke();
    };
    Renderer.prototype.drawSidebar = function (edges) {
        context.fillStyle = SIDEBAR_STYLE;
        var width = 250 * (1 + sigmoid(canvas.width / 200 - 7));
        context.fillRect(canvas.width - width, 0, width, canvas.height);
        context.fillStyle = TEXT_COLOR;
        context.font = "".concat(SIZE_H1, "px ").concat(TEXT_FONT);
        var title = "Click to Select";
        if (selectedVertex != undefined)
            title = selectedVertex.title;
        var lines = splitText(title, width - 20);
        for (var i_1 = 0; i_1 < lines.length; i_1++) {
            context.fillText(lines[i_1], canvas.width - width + 10, 50 + 30 * i_1);
        }
        if (selectedVertex == undefined)
            return;
        context.font = "".concat(SIZE_H4, "px ").concat(TEXT_FONT);
        var pre = [];
        var suc = [];
        for (var i = 0; i < edges.length; i++) {
            var edge = edges[i];
            if (edge.source.id == selectedVertex.id) {
                suc = suc.concat(splitText(edge.target.title, width - 20));
            }
            else if (edge.target.id == selectedVertex.id) {
                pre = pre.concat(splitText(edge.source.title, width - 20));
            }
        }
        context.font = "".concat(SIZE_H3, "px ").concat(TEXT_FONT, "}");
        context.fillText("Predecessors:", canvas.width - width + 10, 0.8 * canvas.height / 5);
        context.fillText("Successors:", canvas.width - width + 10, 0.8 * canvas.height / 5 + 30 * (pre.length + 3));
        context.font = "".concat(SIZE_H4, "px ").concat(TEXT_FONT);
        for (var i_2 = 0; i_2 < pre.length; i_2++) {
            context.fillText(pre[i_2], canvas.width - width + 10, 0.8 * canvas.height / 5 + 30 * (i_2 + 1));
        }
        for (var i_3 = 0; i_3 < suc.length; i_3++) {
            context.fillText(suc[i_3], canvas.width - width + 10, 0.8 * canvas.height / 5 + 30 * (i_3 + 1 + pre.length + 3));
        }
    };
    Renderer.prototype.clear = function () {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.rect(0, 0, canvas.width, canvas.height);
        context.fillStyle = BACKGROUND_COLOR;
        context.fill();
    };
    return Renderer;
}());
var PhysicsEngine = (function () {
    function PhysicsEngine(data) {
        var _this = this;
        this.renderer = new Renderer();
        this.graph = new Graph(data);
        this.graph.vertices.forEach(function (vertex) {
            _this.renderer.drawVertex(vertex);
        });
        this.graph.edges.forEach(function (edge) {
            _this.renderer.drawEdge(edge);
        });
        setInterval(this.step.bind(this), DT * SECOND);
    }
    PhysicsEngine.prototype.step = function () {
        this.stepPhysics();
        this.stepDraw();
    };
    PhysicsEngine.prototype.stepPhysics = function () {
        var _this = this;
        var _loop_1 = function (id) {
            var vertex = this_1.graph.vertices[id];
            this_1.graph.vertices.forEach(function (other) {
                vertex.applyForce(_this.electricalForce(vertex, other));
            });
        };
        var this_1 = this;
        for (var id = 0; id < this.graph.vertices.length; id++) {
            _loop_1(id);
        }
        this.graph.edges.forEach(function (edge) {
            var force = _this.springForce(edge);
            edge.source.applyForce(force);
            edge.target.applyForce(force.mul(-1));
        });
        if (selectedVertex != undefined && mouseActive && currentMouseAction == MouseAction.MoveVertex) {
            selectedVertex.applyForce(this.mousePullForce(selectedVertex));
        }
        this.graph.vertices.forEach(function (vertex) {
            vertex.step();
        });
    };
    PhysicsEngine.prototype.stepDraw = function () {
        var _this = this;
        this.renderer.fitCanvasToWindow();
        this.renderer.clear();
        this.graph.edges.forEach(function (edge) {
            _this.renderer.drawEdge(edge);
        });
        if (selectedVertex != undefined) {
            this.renderer.drawRelatedVertex(selectedVertex, HIGHLIGHT_COLOR);
        }
        this.graph.vertices.forEach(function (vertex) {
            _this.renderer.drawVertex(vertex);
        });
        this.graph.vertices.forEach(function (vertex) {
            if (vertex.pos.add(cameraPos).mul(zoomFactor).to(mousePos).size() < degreeToRadius(degree[vertex.id])) {
                _this.renderer.drawVertexInfo(vertex);
            }
        });
        this.renderer.drawSidebar(this.graph.edges);
    };
    PhysicsEngine.prototype.springForce = function (edge) {
        var r_vec = edge.source.pos.to(edge.target.pos);
        var d = r_vec.size();
        var force = r_vec.mul(1 / d).mul(SPRING_FACTOR * (d - IDEAL_SPRING_LENGTH));
        return force;
    };
    PhysicsEngine.prototype.electricalForce = function (v1, v2) {
        var r_vec = v2.pos.to(v1.pos);
        var d = Math.max(r_vec.size(), 17);
        var force = r_vec.mul(1 / d).mul(ELECTRICAL_FACTOR / (d * d));
        return force;
    };
    PhysicsEngine.prototype.mousePullForce = function (vertex) {
        var r_vec = vertex.pos.add(cameraPos).mul(zoomFactor).to(mousePos);
        var force = r_vec;
        return force;
    };
    return PhysicsEngine;
}());
var App = (function () {
    function App(data) {
        var _this = this;
        this.springEmbedder = new PhysicsEngine(data);
        currentMouseAction = MouseAction.None;
        mousePos = ZERO_VECTOR;
        selectedVertex = undefined;
        canvas.addEventListener("mousedown", function (ev) {
            currentMouseAction = MouseAction.MoveCamera;
            mouseActive = true;
            _this.springEmbedder.graph.vertices.forEach(function (vertex) {
                if (vertex.pos.add(cameraPos).mul(zoomFactor).to(new Vector(ev.x, ev.y)).size() < degreeToRadius(degree[vertex.id])) {
                    selectedVertex = vertex;
                    currentMouseAction = MouseAction.MoveVertex;
                }
            });
        });
        canvas.addEventListener("mousemove", function (ev) {
            var newMousePos = new Vector(ev.x, ev.y);
            if (currentMouseAction == MouseAction.MoveCamera) {
                var delta = mousePos.to(newMousePos).mul(1 / zoomFactor);
                cameraPos = cameraPos.add(delta);
            }
            mousePos = newMousePos;
        });
        canvas.addEventListener("mouseup", function (ev) {
            currentMouseAction = MouseAction.None;
            mouseActive = false;
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
    fetch(GRAPH_DATA_PATH)
        .then(function (response) { return response.json(); })
        .then(function (json) { return start(json); });
};
function start(data) {
    canvas = document.getElementById("frame");
    context = canvas.getContext("2d");
    new App(data);
}
