var MouseAction;
(function (MouseAction) {
    MouseAction[MouseAction["None"] = 0] = "None";
    MouseAction[MouseAction["MoveCamera"] = 1] = "MoveCamera";
    MouseAction[MouseAction["MoveVertex"] = 2] = "MoveVertex";
})(MouseAction || (MouseAction = {}));
var DT = 1 / 20;
var SPRING_FACTOR = 0.1;
var ELECTRICAL_FACTOR = 2000;
var VELOCITY_FACTOR = 10;
var GRAVITY_FACTOR = 0;
var IDEAL_SPRING_LENGTH = 25;
var GRAVITY_RADIUS = 5000;
var VERTEX_STROKE = "#023047";
var VERTEX_FILL = "#8ECAE6";
var EDGE_STROKE = "grey";
var SELECTION_FILL = "black";
var BACKGROUND_COLOR = "rgb(245, 245, 245)";
var biology = ["bich", "bilg", "bite", "cebi", "debi", "eclg", "evbi", "gene", "idbi", "immu", "mlbi", "moge", "pgbi", "plsc", "zlgy"];
var chemistry = ["chem", "chph", "scbi"];
var engineering = ["chee", "cive", "elee", "maee", "mece", "pgee", "scee"];
var geosciences = ["easc", "ecsc", "envi", "gegr", "gesc", "mete", "pgge", "prge"];
var informatics = ["infr"];
var mathematics = ["math"];
var physics = ["pgph", "phys"];
function getColor(name) {
    name = name.substring(0, 4);
    if (biology.includes(name))
        return "#24F07C";
    else if (chemistry.includes(name))
        return "#4B9B6D";
    else if (engineering.includes(name))
        return "#F0CF24";
    else if (geosciences.includes(name))
        return "#706A49";
    else if (informatics.includes(name))
        return "#949F99";
    else if (mathematics.includes(name))
        return "#F03424";
    else if (physics.includes(name))
        return "#2F24F0";
    else
        VERTEX_FILL;
}
var canvas;
var context;
var cameraPos;
var cameraZoom;
var zoomFactor;
var selectedVertex;
var mousePos;
var mouseActive = false;
function degreeToRadius(degree) {
    return 10 * zoomFactor * (0.7 * sigmoid(degree - 5) + 0.5);
}
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
            this.vertices.push(new Vertex(new Vector(Math.random() * canvas.width, Math.random() * canvas.height), id, vdata.name, vdata.title, getColor(vdata.name)));
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
        var fill = context.fillStyle;
        context.fillStyle = vertex.color;
        context.beginPath();
        context.arc(pos.x, pos.y, degreeToRadius(degree[vertex.id]), 0, 2 * Math.PI);
        context.fill();
        context.stroke();
        context.fillStyle = fill;
    };
    Renderer.prototype.drawRelatedVertex = function (vertex, color) {
        var stroke = context.strokeStyle;
        var fill = context.fillStyle;
        var pos = vertex.pos.add(cameraPos).mul(zoomFactor);
        context.strokeStyle = color;
        context.fillStyle = color;
        context.beginPath();
        context.arc(pos.x, pos.y, 3 + degreeToRadius(degree[vertex.id]), 0, 2 * Math.PI);
        context.fill();
        context.stroke();
        context.strokeStyle = stroke;
        context.fillStyle = fill;
    };
    Renderer.prototype.drawVertexInfo = function (vertex) {
        var pos = vertex.pos.add(cameraPos).mul(zoomFactor);
        var size = 14 + 8 / (1 + Math.exp(18 - 10 * Math.cbrt(degree[vertex.id])));
        context.fillStyle = "black";
        context.font = "".concat(size, "px Arial");
        var width = context.measureText(vertex.title).width;
        context.fillStyle = "rgba(255, 255, 255, 0.4)";
        context.fillRect(pos.x - 1.01 * width / 2, pos.y - size, 1.01 * width, size * 1.5);
        context.fillStyle = "black";
        context.fillText(vertex.title, pos.x - width / 2, pos.y);
        context.fillStyle = VERTEX_STROKE;
    };
    Renderer.prototype.drawEdge = function (edge) {
        var start = edge.source.pos.add(cameraPos).mul(zoomFactor);
        var end = edge.target.pos.add(cameraPos).mul(zoomFactor);
        if (selectedVertex == undefined) { }
        else if (edge.source.id == selectedVertex.id) {
            context.lineWidth = 3;
            context.strokeStyle = "green";
            context.beginPath();
            context.moveTo(start.x, start.y);
            context.lineTo(end.x, end.y);
            context.stroke();
            context.lineWidth = 1;
            context.strokeStyle = EDGE_STROKE;
            var line = end.to(start);
            var len = line.size();
            var u_dir = line.mul(1 / len);
            var normal_dir = new Vector(-u_dir.y, u_dir.x);
            var midpoint = end.add(u_dir.mul(len / 2));
            var a = midpoint.add(normal_dir.mul(7));
            var b = midpoint.sub(normal_dir.mul(7));
            var c = midpoint.add(u_dir.mul(-8));
            context.lineWidth = 5;
            context.strokeStyle = "green";
            context.beginPath();
            context.moveTo(a.x, a.y);
            context.lineTo(b.x, b.y);
            context.stroke();
            context.beginPath();
            context.moveTo(c.x, c.y);
            context.lineTo(b.x, b.y);
            context.stroke();
            context.beginPath();
            context.moveTo(a.x, a.y);
            context.lineTo(c.x, c.y);
            context.stroke();
            context.lineWidth = 1;
            context.strokeStyle = EDGE_STROKE;
            this.drawRelatedVertex(edge.target, "green");
            return;
        }
        else if (edge.target.id == selectedVertex.id) {
            context.lineWidth = 3;
            context.strokeStyle = "red";
            context.beginPath();
            context.moveTo(start.x, start.y);
            context.lineTo(end.x, end.y);
            context.stroke();
            context.lineWidth = 1;
            context.strokeStyle = EDGE_STROKE;
            var line = start.to(end);
            var len = line.size();
            var u_dir = line.mul(1 / len);
            var normal_dir = new Vector(-u_dir.y, u_dir.x);
            var midpoint = start.add(u_dir.mul(len / 2));
            var a = midpoint.add(normal_dir.mul(7));
            var b = midpoint.sub(normal_dir.mul(7));
            var c = midpoint.add(u_dir.mul(8));
            context.lineWidth = 5;
            context.strokeStyle = "red";
            context.beginPath();
            context.moveTo(a.x, a.y);
            context.lineTo(b.x, b.y);
            context.stroke();
            context.beginPath();
            context.moveTo(c.x, c.y);
            context.lineTo(b.x, b.y);
            context.stroke();
            context.beginPath();
            context.moveTo(a.x, a.y);
            context.lineTo(c.x, c.y);
            context.stroke();
            context.lineWidth = 1;
            context.strokeStyle = EDGE_STROKE;
            this.drawRelatedVertex(edge.source, "red");
            return;
        }
        context.beginPath();
        context.moveTo(start.x, start.y);
        context.lineTo(end.x, end.y);
        context.stroke();
    };
    Renderer.prototype.drawSidebar = function (edges) {
        context.fillStyle = "rgba(255, 255, 255, 0.7)";
        var width = 250 * (1 + sigmoid(canvas.width / 200 - 7));
        context.fillRect(canvas.width - width, 0, width, canvas.height);
        context.fillStyle = "black";
        context.font = "30px Arial";
        var title = "Click to Select";
        if (selectedVertex != undefined)
            title = selectedVertex.title;
        var lines = splitText(title, width - 20);
        for (var i_1 = 0; i_1 < lines.length; i_1++) {
            context.fillText(lines[i_1], canvas.width - width + 10, 50 + 30 * i_1);
        }
        if (selectedVertex == undefined)
            return;
        context.font = "18px Arial";
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
        context.font = "26px Arial";
        context.fillText("Predecessors:", canvas.width - width + 10, 0.8 * canvas.height / 5);
        context.fillText("Successors:", canvas.width - width + 10, 0.8 * canvas.height / 5 + 30 * (pre.length + 3));
        context.font = "18px Arial";
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
        for (var i = 0; i < 0; i++) {
            this.stepEades();
        }
        setInterval(this.step.bind(this), DT * SECOND);
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
        if (selectedVertex != undefined && mouseActive && currentMouseAction == MouseAction.MoveVertex) {
            selectedVertex.applyForce(this.mousePullForce(selectedVertex));
        }
        this.graph.vertices.forEach(function (vertex) {
            vertex.step();
        });
    };
    SpringEmbedder.prototype.stepDraw = function () {
        var _this = this;
        this.renderer.fitCanvasToWindow();
        this.renderer.clear();
        context.strokeStyle = EDGE_STROKE;
        this.graph.edges.forEach(function (edge) {
            _this.renderer.drawEdge(edge);
        });
        if (selectedVertex != undefined) {
            this.renderer.drawRelatedVertex(selectedVertex, "orange");
        }
        context.lineWidth = 1;
        context.strokeStyle = VERTEX_STROKE;
        context.fillStyle = VERTEX_FILL;
        this.graph.vertices.forEach(function (vertex) {
            _this.renderer.drawVertex(vertex);
        });
        context.fillStyle = SELECTION_FILL;
        this.graph.vertices.forEach(function (vertex) {
            if (vertex.pos.add(cameraPos).mul(zoomFactor).to(mousePos).size() < degreeToRadius(degree[vertex.id])) {
                _this.renderer.drawVertexInfo(vertex);
            }
        });
        this.renderer.drawSidebar(this.graph.edges);
    };
    SpringEmbedder.prototype.gravityOrigin = function (vertex) {
        var r_vec = vertex.pos.to(new Vector(canvas.width / 2, canvas.height / 2));
        var d = Math.max(r_vec.size(), GRAVITY_RADIUS);
        var force = r_vec.mul(1 / d).mul(GRAVITY_FACTOR / d);
        return force;
    };
    SpringEmbedder.prototype.springForceEades = function (edge) {
        var r_vec = edge.source.pos.to(edge.target.pos);
        var d = r_vec.size();
        var force = r_vec.mul(1 / d).mul(SPRING_FACTOR * (d - IDEAL_SPRING_LENGTH));
        return force;
    };
    SpringEmbedder.prototype.electricalForceEades = function (v1, v2) {
        var r_vec = v2.pos.to(v1.pos);
        var d = Math.max(r_vec.size(), 15);
        var force = r_vec.mul(1 / d).mul(ELECTRICAL_FACTOR / (d * d));
        return force;
    };
    SpringEmbedder.prototype.mousePullForce = function (vertex) {
        var r_vec = vertex.pos.add(cameraPos).mul(zoomFactor).to(mousePos);
        var force = r_vec.mul(1 / 7);
        return force;
    };
    return SpringEmbedder;
}());
var currentMouseAction;
var App = (function () {
    function App(data) {
        var _this = this;
        this.springEmbedder = new SpringEmbedder(data);
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
                var delta = mousePos.to(newMousePos);
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
