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
    Vector.prototype.normal = function () { return new Vector(-this.y, this.x); };
    return Vector;
}());
var DT = 1 / 30;
var SPRING_FACTOR = 2;
var MOUSE_SPRING_FACTOR = 10;
var ELECTRICAL_FACTOR = 20000;
var MAX_VELOCITY = 500;
var MAX_FRICTION = 25;
var IDEAL_SPRING_LENGTH = 25;
var GRAPH_DATA_PATH = "../data/graph.json";
var SUCCESSOR_EDGE = "#3a86ff";
var PREDECESSOR_EDGE = "#ff006e";
var HIGHLIGHT_COLOR = "#8338ec";
var TEXT_COLOR = "black";
var TEXT_FONT = "Arial";
var SIZE_H1 = 30;
var SIZE_H2 = 26;
var SIZE_H3 = 22;
var SIZE_H4 = 18;
var ARROW_SIZE = 7;
var TEXT_VMARGIN = 10;
var TEXT_HMARGIN = 10;
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
function sigmoid(x) {
    return (1 / (1 + Math.exp(-x)));
}
function logistic(supremum, growthRate, midpoint, x) {
    return (supremum * sigmoid(growthRate * (x - midpoint)));
}
function splitText(text, width) {
    var words = text.split(" ");
    var lines = [];
    var line = "";
    words.forEach(function (word) {
        if (context.measureText(line + word).width > width) {
            lines.push(line);
            line = "";
        }
        line += word + " ";
    });
    lines.push(line);
    return lines;
}
function degreeToRadius(degree) {
    return zoomFactor * (logistic(7, 1, 5, degree) + 5);
}
function font(size, family) {
    return "".concat(size, "px ").concat(family);
}
function textHeight(text) {
    var metrics = context.measureText(text);
    return metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
}
function getColor(key) {
    key = key.substring(0, 4);
    if (BIOLOGY.includes(key))
        return BIOLOGY_COLOR;
    else if (CHEMISTRY.includes(key))
        return CHEMISTRY_COLOR;
    else if (ENGINEERING.includes(key))
        return ENGINEERING_COLOR;
    else if (GEOSCIENCES.includes(key))
        return GEOSCIENCES_COLOR;
    else if (INFORMATICS.includes(key))
        return INFORMATICS_COLOR;
    else if (MATHEMATICS.includes(key))
        return MATHEMATICS_COLOR;
    else if (PHYSICS.includes(key))
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
function circlePath(pos, radius) {
    context.beginPath();
    context.arc(pos.x, pos.y, radius, 0, 2 * Math.PI);
}
function drawLine(start, end) {
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    context.stroke();
}
function randomVectorInRange(x_min, x_max, y_min, y_max) {
    return new Vector(x_min + Math.random() * (x_max - x_min), y_min + Math.random() * (y_max - y_min));
}
var Vertex = (function () {
    function Vertex(pos, id, key, title, color) {
        this.pos = pos;
        this.force = ZERO_VECTOR;
        this.id = id;
        this.key = key;
        this.title = title;
        this.color = color;
        this.degree = 0;
    }
    Vertex.prototype.applyForce = function (force) { this.force = this.force.add(force); };
    Vertex.prototype.step = function () {
        var F = this.force.size();
        var friction = this.force.mul(1 / F).mul(-1).mul(Math.min(MAX_FRICTION, F));
        this.applyForce(friction);
        F = this.force.size();
        if (F > MAX_VELOCITY)
            this.force = this.force.mul(MAX_VELOCITY / F);
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
        for (var id = 0; id < data.vertices.length; id++) {
            var vertex = data.vertices[id];
            var pos = randomVectorInRange(0, canvas.width, 0, canvas.height);
            this.vertices.push(new Vertex(pos, id, vertex.key, vertex.title, getColor(vertex.key)));
        }
        data.edges.forEach(function (edge) {
            var source;
            var target;
            _this.vertices.forEach(function (vertex) {
                if (vertex.key == edge.source)
                    source = vertex;
                else if (vertex.key == edge.target)
                    target = vertex;
            });
            _this.edges.push(new Edge(source, target));
            source.degree++;
            target.degree++;
        });
    }
    return Graph;
}());
var Renderer = (function () {
    function Renderer() {
        this.fitCanvasToWindow();
    }
    Renderer.prototype.fitCanvasToWindow = function () {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    Renderer.prototype.drawVertex = function (vertex) {
        var pos = vertex.pos.add(cameraPos).mul(zoomFactor);
        context.fillStyle = vertex.color;
        context.strokeStyle = VERTEX_STROKE;
        context.lineWidth = 1;
        circlePath(pos, degreeToRadius(vertex.degree));
        context.fill();
        context.stroke();
    };
    Renderer.prototype.drawRelatedVertex = function (vertex, color) {
        var pos = vertex.pos.add(cameraPos).mul(zoomFactor);
        context.fillStyle = color;
        circlePath(pos, 3 + degreeToRadius(vertex.degree));
        context.fill();
    };
    Renderer.prototype.drawVertexInfo = function (vertex) {
        var pos = vertex.pos.add(cameraPos).mul(zoomFactor);
        var size = 14 + logistic(8, 1, 6, vertex.degree);
        context.fillStyle = TEXT_COLOR;
        context.font = font(size, TEXT_FONT);
        var width = context.measureText(vertex.title).width;
        context.fillStyle = INFO_BG_STYLE;
        context.fillRect(pos.x - 1.01 * width / 2, pos.y - size, 1.01 * width, size * 1.5);
        context.fillStyle = TEXT_COLOR;
        context.fillText(vertex.title, pos.x - width / 2, pos.y);
    };
    Renderer.prototype.drawEdge = function (edge) {
        var start = edge.source.pos.add(cameraPos).mul(zoomFactor);
        var end = edge.target.pos.add(cameraPos).mul(zoomFactor);
        context.lineWidth = 1;
        context.strokeStyle = EDGE_STROKE;
        drawLine(start, end);
        if (selectedVertex != undefined) {
            context.lineWidth = 3;
            var vertex = void 0;
            Vertex;
            if (edge.source.id == selectedVertex.id) {
                context.strokeStyle = SUCCESSOR_EDGE;
                context.fillStyle = SUCCESSOR_EDGE;
                vertex = edge.target;
            }
            else if (edge.target.id == selectedVertex.id) {
                context.strokeStyle = PREDECESSOR_EDGE;
                context.fillStyle = PREDECESSOR_EDGE;
                vertex = edge.source;
            }
            if (vertex != undefined) {
                drawLine(start, end);
                var line = start.to(end);
                var midpoint = start.add(line.mul(1 / 2));
                var v = line.mul(ARROW_SIZE / line.size());
                var p = midpoint.sub(v);
                var n = v.normal();
                fillTriangle(p.add(n), p.sub(n), p.add(v.mul(2)));
                this.drawRelatedVertex(vertex, PREDECESSOR_EDGE);
            }
        }
    };
    Renderer.prototype.drawSidebar = function (edges) {
        var width = 250 + logistic(250, 1 / 200, 1400, canvas.width);
        var textX = canvas.width - width + TEXT_VMARGIN;
        context.fillStyle = SIDEBAR_STYLE;
        context.fillRect(canvas.width - width, 0, width, canvas.height);
        context.fillStyle = TEXT_COLOR;
        context.font = font(SIZE_H1, TEXT_FONT);
        var title = "Click to Select";
        if (selectedVertex != undefined)
            title = selectedVertex.title;
        var lineHeight = textHeight(title);
        var lines = splitText(title, width - TEXT_VMARGIN);
        for (var i_1 = 0; i_1 < lines.length; i_1++) {
            context.fillText(lines[i_1], textX, TEXT_HMARGIN + lineHeight * (i_1 + 1));
        }
        if (selectedVertex != undefined) {
            context.font = font(SIZE_H4, TEXT_FONT);
            var pre = [];
            var suc = [];
            for (var i = 0; i < edges.length; i++) {
                var edge = edges[i];
                if (edge.source.id == selectedVertex.id) {
                    suc = suc.concat(splitText(edge.target.title, width - TEXT_VMARGIN));
                }
                else if (edge.target.id == selectedVertex.id) {
                    pre = pre.concat(splitText(edge.source.title, width - TEXT_VMARGIN));
                }
            }
            context.font = "".concat(SIZE_H2, "px ").concat(TEXT_FONT);
            context.fillText("Predecessors:", textX, 120);
            context.fillText("Successors:", textX, 120 + 30 * (pre.length + 3));
            context.font = "".concat(SIZE_H4, "px ").concat(TEXT_FONT);
            for (var i_2 = 0; i_2 < pre.length; i_2++) {
                context.fillText(pre[i_2], textX, 120 + 30 * (i_2 + 1));
            }
            for (var i_3 = 0; i_3 < suc.length; i_3++) {
                context.fillText(suc[i_3], textX, 120 + 30 * (i_3 + 1 + pre.length + 3));
            }
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
        this.renderer = new Renderer();
        this.graph = new Graph(data);
        setInterval(this.step.bind(this), DT * SECOND);
    }
    PhysicsEngine.prototype.step = function () {
        this.stepPhysics();
        this.stepDraw();
    };
    PhysicsEngine.prototype.stepPhysics = function () {
        var _this = this;
        if (selectedVertex != undefined && mouseActive && currentMouseAction == MouseAction.MoveVertex) {
            selectedVertex.applyForce(this.mousePullForce(selectedVertex));
        }
        this.graph.edges.forEach(function (edge) {
            var force = _this.springForce(edge);
            edge.source.applyForce(force);
            edge.target.applyForce(force.mul(-1));
        });
        this.graph.vertices.forEach(function (vertex) {
            _this.graph.vertices.forEach(function (other) {
                vertex.applyForce(_this.electricalForce(vertex, other));
            });
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
            if (vertex.pos.add(cameraPos).mul(zoomFactor).to(mousePos).size() < degreeToRadius(vertex.degree)) {
                _this.renderer.drawVertexInfo(vertex);
            }
        });
        this.renderer.drawSidebar(this.graph.edges);
    };
    PhysicsEngine.prototype.springForce = function (edge) {
        var r_vec = edge.source.pos.to(edge.target.pos);
        var r = r_vec.size();
        if (r == 0)
            return ZERO_VECTOR;
        var force = r_vec.mul((SPRING_FACTOR * (r - IDEAL_SPRING_LENGTH)) / r);
        return force;
    };
    PhysicsEngine.prototype.electricalForce = function (v1, v2) {
        var r_vec = v2.pos.to(v1.pos);
        var r = r_vec.size();
        if (r == 0)
            return ZERO_VECTOR;
        var force = r_vec.mul(ELECTRICAL_FACTOR / (Math.pow(r, 3)));
        return force;
    };
    PhysicsEngine.prototype.mousePullForce = function (vertex) {
        var r_vec = vertex.pos.add(cameraPos).mul(zoomFactor).to(mousePos);
        var force = r_vec.mul(MOUSE_SPRING_FACTOR);
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
                if (vertex.pos.add(cameraPos).mul(zoomFactor).to(new Vector(ev.x, ev.y)).size() < degreeToRadius(vertex.degree)) {
                    selectedVertex = vertex;
                    currentMouseAction = MouseAction.MoveVertex;
                }
            });
        });
        canvas.addEventListener("dblclick", function (ev) {
            selectedVertex = undefined;
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
            cameraZoom -= ev.deltaY;
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
