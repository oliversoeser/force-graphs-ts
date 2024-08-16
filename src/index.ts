interface Dictionary<T> {
    [Key: string]: T;
}

type VertexData = { name: string; title: string; };
type EdgeData = { sourcename: string; targetname: string; };
type GraphData = { vertices: VertexData[]; edges: EdgeData[]; };

enum MouseAction {
    None,
    MoveCamera,
    MoveVertex
}

class Vector {
    public readonly x: number;
    public readonly y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    // Vector Addition and Subtraction
    add(other: Vector): Vector { return new Vector(this.x + other.x, this.y + other.y); }
    sub(other: Vector): Vector { return new Vector(this.x - other.x, this.y - other.y); }

    // The vector from itself to the other vector
    to(other: Vector): Vector { return new Vector(other.x - this.x, other.y - this.y); }

    // The Magnitude of the Vector
    size(): number { return Math.sqrt(this.x ** 2 + this.y ** 2); }

    // Scalar Multiplication
    mul(factor: number): Vector { return new Vector(this.x * factor, this.y * factor); }
}

const DT = 1 / 20;

const SPRING_FACTOR = 1;
const ELECTRICAL_FACTOR = 20000;

const IDEAL_SPRING_LENGTH = 25;

const GRAPH_DATA_PATH = "../data/graph.json";

const SUCCESSOR_EDGE = "green";
const PREDECESSOR_EDGE = "red";
const HIGHLIGHT_COLOR = "orange"

const TEXT_COLOR = "black";
const TEXT_FONT = "Arial";

const SIZE_H1 = 30;
const SIZE_H3 = 26;
const SIZE_H4 = 18;

const SIDEBAR_STYLE = "rgba(255, 255, 255, 0.7)";
const INFO_BG_STYLE = "rgba(255, 255, 255, 0.4)";

const VERTEX_STROKE = "#023047";
const VERTEX_FILL = "#8ECAE6";
const EDGE_STROKE = "grey";
const SELECTION_FILL = "black";
const BACKGROUND_COLOR = "rgb(245, 245, 245)";

const BIOLOGY = ["bich", "bilg", "bite", "cebi", "debi", "eclg", "evbi", "gene", "idbi", "immu", "mlbi", "moge", "pgbi", "plsc", "zlgy"];
const CHEMISTRY = ["chem", "chph", "scbi"];
const ENGINEERING = ["chee", "cive", "elee", "maee", "mece", "pgee", "scee"];
const GEOSCIENCES = ["easc", "ecsc", "envi", "gegr", "gesc", "mete", "pgge", "prge"];
const INFORMATICS = ["infr"];
const MATHEMATICS = ["math"];
const PHYSICS = ["pgph", "phys"];

const BIOLOGY_COLOR = "#24F07C";
const CHEMISTRY_COLOR = "#4B9B6D";
const ENGINEERING_COLOR = "#F0CF24";
const GEOSCIENCES_COLOR = "#706A49";
const INFORMATICS_COLOR = "#949F99";
const MATHEMATICS_COLOR = "#F03424";
const PHYSICS_COLOR = "#2F24F0";

const ZERO_VECTOR = new Vector(0, 0);
const SECOND = 1000;

let cameraPos: Vector = ZERO_VECTOR;
let cameraZoom: number = 0;
let zoomFactor: number = 1;

let selectedVertex: Vertex;
let mousePos: Vector = ZERO_VECTOR;
let mouseActive: boolean = false;
let currentMouseAction: MouseAction = MouseAction.None;

let canvas: HTMLCanvasElement;
let context: CanvasRenderingContext2D;

let degree: number[];

function sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
}

function splitText(text: string, maxWidth: number): string[] {
    let words = text.split(" ");

    let lines = [];
    let substring = words[0];
    for (let i = 1; i < words.length; i++) {
        if (context.measureText(substring + " " + words[i]).width >= maxWidth) {
            lines.push(substring)
            substring = words[i];
        } else {
            substring += " " + words[i]
        }
    }
    lines.push(substring)
    return lines;
}

function degreeToRadius(degree: number) {
    return 10 * zoomFactor * (0.7*sigmoid(degree-5) + 0.5)
}

function getColor(name: string): string {
    name = name.substring(0, 4)
    if (BIOLOGY.includes(name)) return BIOLOGY_COLOR;
    else if (CHEMISTRY.includes(name)) return CHEMISTRY_COLOR;
    else if (ENGINEERING.includes(name)) return ENGINEERING_COLOR;
    else if (GEOSCIENCES.includes(name)) return GEOSCIENCES_COLOR;
    else if (INFORMATICS.includes(name)) return INFORMATICS_COLOR;
    else if (MATHEMATICS.includes(name)) return MATHEMATICS_COLOR;
    else if (PHYSICS.includes(name)) return PHYSICS_COLOR;
    else VERTEX_FILL;
}

function fillTriangle(a: Vector, b: Vector, c: Vector) {
    context.beginPath()
    context.moveTo(a.x, a.y);
    context.lineTo(b.x, b.y);
    context.lineTo(c.x, c.y);
    context.lineTo(a.x, a.y);
    context.fill();
}

class Vertex {
    public pos: Vector; // Position
    private force: Vector; // Total force applied in the current step
    public readonly id: number;
    public readonly name: string;
    public readonly title: string;
    public readonly color: string;

    constructor(pos: Vector, id: number, name: string, title: string, color: string) {
        this.pos = pos;
        this.force = ZERO_VECTOR;
        this.id = id;
        this.name = name;
        this.title = title;
        this.color = color;
    }

    // Sum forces
    applyForce(force: Vector) { this.force = this.force.add(force); }

    // Apply force directly as velocity
    step() {
        this.pos = this.pos.add(this.force.mul(DT));
        this.force = ZERO_VECTOR; // Reset force
    }
}

class Edge {
    public readonly source: Vertex;
    public readonly target: Vertex;

    constructor(source: Vertex, target: Vertex) {
        this.source = source;
        this.target = target;
    }
}

class Graph {
    public vertices: Vertex[];
    public edges: Edge[];

    public nameToId: Dictionary<number>;

    constructor(data: GraphData) {
        this.vertices = new Array();
        this.edges = new Array();

        this.nameToId = {};

        degree = new Array();

        for (let id = 0; id < data.vertices.length; id++) {
            let vdata = data.vertices[id];
            this.nameToId[vdata.name] = id;
            this.vertices.push(new Vertex(new Vector(Math.random() * canvas.width, Math.random() * canvas.height), id, vdata.name, vdata.title, getColor(vdata.name)));
            degree.push(0);
        }

        data.edges.forEach(edata => {
            let sId = this.nameToId[edata.sourcename];
            let tId = this.nameToId[edata.targetname];

            this.edges.push(new Edge(this.vertices[sId], this.vertices[tId]));

            degree[sId]++;
            degree[tId]++;
        });
    }
}

class Renderer {
    constructor() {
        this.fitCanvasToWindow();
    }

    fitCanvasToWindow() {
        canvas.width = window.innerWidth + 1;
        canvas.height = window.innerHeight + 1;
    }

    drawVertex(vertex: Vertex) {
        let pos = vertex.pos.add(cameraPos).mul(zoomFactor);

        context.fillStyle = vertex.color;
        context.strokeStyle = VERTEX_STROKE
        context.lineWidth = 1;

        context.beginPath();
        context.arc(pos.x, pos.y, degreeToRadius(degree[vertex.id]), 0, 2 * Math.PI);
        context.fill();
        context.stroke();
    }

    drawRelatedVertex(vertex: Vertex, color: string) {
        let pos = vertex.pos.add(cameraPos).mul(zoomFactor);
        context.strokeStyle = color;
        context.fillStyle = color;
        context.beginPath();
        context.arc(pos.x, pos.y, 3 + degreeToRadius(degree[vertex.id]), 0, 2 * Math.PI);
        context.fill();
    }

    drawVertexInfo(vertex: Vertex) {
        let pos = vertex.pos.add(cameraPos).mul(zoomFactor);

        // Sigmoid curve to keep the text within a readable range
        let size = 14 + 8 / (1 + Math.exp(18 - 10 * Math.cbrt(degree[vertex.id])));

        context.fillStyle = TEXT_COLOR;
        context.font = `${size}px ${TEXT_FONT}`;


        let width = context.measureText(vertex.title).width

        context.fillStyle = INFO_BG_STYLE;

        context.fillRect(pos.x - 1.01 * width / 2, pos.y - size, 1.01 * width, size * 1.5)

        context.fillStyle = TEXT_COLOR;
        context.fillText(vertex.title, pos.x - width / 2, pos.y);
    }

    drawEdge(edge: Edge) {
        let start = edge.source.pos.add(cameraPos).mul(zoomFactor);
        let end = edge.target.pos.add(cameraPos).mul(zoomFactor);

        if (selectedVertex == undefined) { }
        else if (edge.source.id == selectedVertex.id) {
            context.lineWidth = 3;
            context.strokeStyle = SUCCESSOR_EDGE;
            context.fillStyle = SUCCESSOR_EDGE;
            context.beginPath()
            context.moveTo(start.x, start.y);
            context.lineTo(end.x, end.y);
            context.stroke();

            let line = end.to(start);
            let len = line.size();
            let u_dir = line.mul(1 / len);
            let normal_dir = new Vector(-u_dir.y, u_dir.x);

            let midpoint = end.add(u_dir.mul(len / 2))
            let a = midpoint.add(normal_dir.mul(7));
            let b = midpoint.sub(normal_dir.mul(7));
            let c = midpoint.add(u_dir.mul(-8));

            fillTriangle(a, b, c);

            this.drawRelatedVertex(edge.target, SUCCESSOR_EDGE);
            return
        } else if (edge.target.id == selectedVertex.id) {
            context.lineWidth = 3;
            context.strokeStyle = PREDECESSOR_EDGE;
            context.fillStyle = PREDECESSOR_EDGE;
            context.beginPath()
            context.moveTo(start.x, start.y);
            context.lineTo(end.x, end.y);
            context.stroke();

            let line = start.to(end);
            let len = line.size();
            let u_dir = line.mul(1 / len);
            let normal_dir = new Vector(-u_dir.y, u_dir.x);

            let midpoint = start.add(u_dir.mul(len / 2))
            let a = midpoint.add(normal_dir.mul(7));
            let b = midpoint.sub(normal_dir.mul(7));
            let c = midpoint.add(u_dir.mul(8));

            fillTriangle(a, b, c);

            this.drawRelatedVertex(edge.source, PREDECESSOR_EDGE);
            return
        }

        context.lineWidth = 1;
        context.strokeStyle = EDGE_STROKE;

        context.beginPath()
        context.moveTo(start.x, start.y);
        context.lineTo(end.x, end.y);
        context.stroke();
    }

    drawSidebar(edges: Edge[]) {
        context.fillStyle = SIDEBAR_STYLE;

        let width = 250 * (1 + sigmoid(canvas.width / 200 - 7));
        context.fillRect(canvas.width - width, 0, width, canvas.height)

        context.fillStyle = TEXT_COLOR;
        context.font = `${SIZE_H1}px ${TEXT_FONT}`;

        let title = "Click to Select";

        if (selectedVertex != undefined) title = selectedVertex.title;

        let lines = splitText(title, width - 20);

        for (let i = 0; i < lines.length; i++) {
            context.fillText(lines[i], canvas.width - width + 10, 50 + 30 * i)
        }

        if (selectedVertex == undefined) return;

        context.font = `${SIZE_H4}px ${TEXT_FONT}`;

        // Neighbours
        let pre: string[] = [];
        let suc: string[] = [];
        for (var i = 0; i < edges.length; i++) {
            let edge = edges[i];
            if (edge.source.id == selectedVertex.id) {
                suc = suc.concat(splitText(edge.target.title, width - 20));
            } else if (edge.target.id == selectedVertex.id) {
                pre = pre.concat(splitText(edge.source.title, width - 20))
            }
        }

        context.font = `${SIZE_H3}px ${TEXT_FONT}}`;

        context.fillText("Predecessors:", canvas.width - width + 10, 0.8 * canvas.height / 5)
        context.fillText("Successors:", canvas.width - width + 10, 0.8 * canvas.height / 5 + 30 * (pre.length + 3))

        context.font = `${SIZE_H4}px ${TEXT_FONT}`;

        for (let i = 0; i < pre.length; i++) {
            context.fillText(pre[i], canvas.width - width + 10, 0.8 * canvas.height / 5 + 30 * (i + 1))
        }

        for (let i = 0; i < suc.length; i++) {
            context.fillText(suc[i], canvas.width - width + 10, 0.8 * canvas.height / 5 + 30 * (i + 1 + pre.length + 3))
        }
    }

    clear() {
        context.clearRect(0, 0, canvas.width, canvas.height);

        context.rect(0, 0, canvas.width, canvas.height);
        context.fillStyle = BACKGROUND_COLOR;
        context.fill();
    }
}

class PhysicsEngine {
    private readonly renderer: Renderer;
    public readonly graph: Graph;

    constructor(data: GraphData) {
        this.renderer = new Renderer();
        this.graph = new Graph(data);

        this.graph.vertices.forEach(vertex => {
            this.renderer.drawVertex(vertex);
        });

        this.graph.edges.forEach(edge => {
            this.renderer.drawEdge(edge);
        });

        setInterval(this.step.bind(this), DT * SECOND);
    }

    step() {
        this.stepPhysics();
        this.stepDraw();
    }

    stepPhysics() {
        for (let id = 0; id < this.graph.vertices.length; id++) {
            let vertex = this.graph.vertices[id];

            // Repulsion
            this.graph.vertices.forEach(other => {
                vertex.applyForce(this.electricalForce(vertex, other));
            });
        }

        // Spring forces
        this.graph.edges.forEach(edge => {
            let force = this.springForce(edge);
            edge.source.applyForce(force);
            edge.target.applyForce(force.mul(-1));
        });

        // Mouse force
        if (selectedVertex != undefined && mouseActive && currentMouseAction == MouseAction.MoveVertex) {
            selectedVertex.applyForce(this.mousePullForce(selectedVertex));
        }

        this.graph.vertices.forEach(vertex => {
            vertex.step();
        });
    }

    // Render Graph
    stepDraw() {
        // Reset canvas
        this.renderer.fitCanvasToWindow();
        this.renderer.clear();

        // Draw Edges
        this.graph.edges.forEach(edge => {
            this.renderer.drawEdge(edge);
        });

        if (selectedVertex != undefined) {
            this.renderer.drawRelatedVertex(selectedVertex, HIGHLIGHT_COLOR);
        }

        // Draw Vertices
        this.graph.vertices.forEach(vertex => {
            this.renderer.drawVertex(vertex);
        });

        // Draw Hovered Vertex Info
        this.graph.vertices.forEach(vertex => {
            if (vertex.pos.add(cameraPos).mul(zoomFactor).to(mousePos).size() < degreeToRadius(degree[vertex.id])) {
                this.renderer.drawVertexInfo(vertex);
            }
        });

        // Draw GUI
        this.renderer.drawSidebar(this.graph.edges);
    }

    // Keep adjacent Vertices together
    // Hooke's law: F = kx
    springForce(edge: Edge): Vector {
        let r_vec = edge.source.pos.to(edge.target.pos);
        let d = r_vec.size();
        let force = r_vec.mul(1 / d).mul(SPRING_FACTOR * (d - IDEAL_SPRING_LENGTH));
        return force
    }

    // Keep (unconnected) Vertices apart
    // Coulomb's law: |F| = k * (|q1| |q2|) / (r^2)
    electricalForce(v1: Vertex, v2: Vertex): Vector {
        let r_vec = v2.pos.to(v1.pos);
        let d = Math.max(r_vec.size(), 17);
        let force = r_vec.mul(1/d).mul(ELECTRICAL_FACTOR / (d*d));
        return force;
    }

    // Mouse pull
    mousePullForce(vertex: Vertex): Vector {
        let r_vec = vertex.pos.add(cameraPos).mul(zoomFactor).to(mousePos);
        let force = r_vec;
        return force;
    }
}

class App {
    private readonly springEmbedder: PhysicsEngine;

    constructor(data: GraphData) {
        this.springEmbedder = new PhysicsEngine(data)

        currentMouseAction = MouseAction.None;
        mousePos = ZERO_VECTOR;

        selectedVertex = undefined;

        canvas.addEventListener("mousedown", (ev: MouseEvent) => {
            currentMouseAction = MouseAction.MoveCamera;
            mouseActive = true;

            this.springEmbedder.graph.vertices.forEach(vertex => {
                if (vertex.pos.add(cameraPos).mul(zoomFactor).to(new Vector(ev.x, ev.y)).size() < degreeToRadius(degree[vertex.id])) {
                    selectedVertex = vertex;
                    currentMouseAction = MouseAction.MoveVertex;
                }
            });
        });

        canvas.addEventListener("mousemove", (ev: MouseEvent) => {
            let newMousePos = new Vector(ev.x, ev.y);

            // Move Camera
            if (currentMouseAction == MouseAction.MoveCamera) {
                let delta = mousePos.to(newMousePos).mul(1/zoomFactor);
                cameraPos = cameraPos.add(delta);
            }

            mousePos = newMousePos;
        });

        canvas.addEventListener("mouseup", (ev: MouseEvent) => {
            currentMouseAction = MouseAction.None;
            mouseActive = false;
        });

        canvas.addEventListener("wheel", (ev: WheelEvent) => {
            cameraZoom += ev.deltaY * -1;
            zoomFactor = this.zoomFactor(cameraZoom);
        })
    }

    zoomFactor(zoom: number) {
        return Math.max(Math.exp(zoom / 5000), 0.2);
    }
}

window.onload = () => {
    fetch(GRAPH_DATA_PATH)
        .then((response) => response.json() as unknown as GraphData)
        .then((json) => start(json));
}

function start(data: GraphData) {
    canvas = document.getElementById("frame") as HTMLCanvasElement;
    context = canvas.getContext("2d");

    new App(data);
}