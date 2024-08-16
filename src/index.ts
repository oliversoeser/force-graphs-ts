type VertexData = { key: string; title: string; };
type EdgeData = { source: string; target: string; };
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

    // Normal on the vector
    normal(): Vector { return new Vector(-this.y, this.x) }
}

const DT = 1 / 30;

const SPRING_FACTOR = 1;
const MOUSE_SPRING_FACTOR = 10;
const ELECTRICAL_FACTOR = 20000;

const MAX_VELOCITY = 500;

const IDEAL_SPRING_LENGTH = 25;

const GRAPH_DATA_PATH = "../data/graph.json";

const SUCCESSOR_EDGE = "#3a86ff";
const PREDECESSOR_EDGE = "#ff006e";
const HIGHLIGHT_COLOR = "#8338ec"

const TEXT_COLOR = "black";
const TEXT_FONT = "Arial";

const SIZE_H1 = 30;
const SIZE_H2 = 26;
const SIZE_H4 = 18;

const ARROW_SIZE = 7;

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

// The standard logistic function
function sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
}

// The general general logistic function
function logistic(supremum: number, growthRate: number, midpoint: number, x: number): number {
    return supremum * sigmoid(growthRate * (x - midpoint));
}

function splitText(text: string, boxWidth: number): string[] {
    let words = text.split(" ");

    let lines = [];
    let substring = words[0];
    for (let i = 1; i < words.length; i++) {
        if (context.measureText(substring + " " + words[i]).width >= boxWidth) {
            lines.push(substring)
            substring = words[i];
        } else {
            substring += " " + words[i]
        }
    }
    lines.push(substring)
    return lines;
}

function degreeToRadius(degree: number): number {
    return zoomFactor * (logistic(7, 1, 5, degree) + 5)
}

function getColor(key: string): string {
    key = key.substring(0, 4);
    if (BIOLOGY.includes(key)) return BIOLOGY_COLOR;
    else if (CHEMISTRY.includes(key)) return CHEMISTRY_COLOR;
    else if (ENGINEERING.includes(key)) return ENGINEERING_COLOR;
    else if (GEOSCIENCES.includes(key)) return GEOSCIENCES_COLOR;
    else if (INFORMATICS.includes(key)) return INFORMATICS_COLOR;
    else if (MATHEMATICS.includes(key)) return MATHEMATICS_COLOR;
    else if (PHYSICS.includes(key)) return PHYSICS_COLOR;
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

function circlePath(pos: Vector, radius: number) {
    context.beginPath();
    context.arc(pos.x, pos.y, radius, 0, 2 * Math.PI);
}

function drawLine(start: Vector, end: Vector) {
    context.beginPath()
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    context.stroke();
}

function randomVectorInRange(x_min: number, x_max: number, y_min: number, y_max: number): Vector {
    return new Vector(x_min + Math.random() * (x_max - x_min), y_min + Math.random() * (y_max - y_min));
}

class Vertex {
    public pos: Vector; // Position
    private force: Vector; // Total force applied in the current step
    public readonly id: number;
    public readonly key: string;
    public readonly title: string;
    public readonly color: string;
    public degree: number;

    constructor(pos: Vector, id: number, key: string, title: string, color: string) {
        this.pos = pos;
        this.force = ZERO_VECTOR;
        this.id = id;
        this.key = key;
        this.title = title;
        this.color = color;
        this.degree = 0;
    }

    // Sum forces
    applyForce(force: Vector) { this.force = this.force.add(force); }

    // Apply force directly as velocity
    step() {
        let F = this.force.size();
        if (F > MAX_VELOCITY) this.force = this.force.mul(MAX_VELOCITY/F);

        this.pos = this.pos.add(this.force.mul(DT));
        this.force = ZERO_VECTOR; // Reset force

        console.log(this.pos);
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

    constructor(data: GraphData) {
        this.vertices = new Array();
        this.edges = new Array();

        for (let id = 0; id < data.vertices.length; id++) {
            let vertex = data.vertices[id];
            let pos = randomVectorInRange(0, canvas.width, 0, canvas.height);
            this.vertices.push(new Vertex(pos, id, vertex.key, vertex.title, getColor(vertex.key)));
        }

        data.edges.forEach(edge => {
            let source: Vertex;
            let target: Vertex;

            this.vertices.forEach(vertex => {
                if (vertex.key == edge.source) source = vertex;
                else if (vertex.key == edge.target) target = vertex;
            });

            this.edges.push(new Edge(source, target));

            source.degree++;
            target.degree++;
        });
    }
}

class Renderer {
    constructor() {
        this.fitCanvasToWindow();
    }

    fitCanvasToWindow() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    drawVertex(vertex: Vertex) {
        let pos = vertex.pos.add(cameraPos).mul(zoomFactor);

        context.fillStyle = vertex.color;
        context.strokeStyle = VERTEX_STROKE
        context.lineWidth = 1;

        circlePath(pos, degreeToRadius(vertex.degree))
        context.fill();
        context.stroke();
    }

    drawRelatedVertex(vertex: Vertex, color: string) {
        let pos = vertex.pos.add(cameraPos).mul(zoomFactor);
        
        context.fillStyle = color;

        circlePath(pos, 3 + degreeToRadius(vertex.degree))
        context.fill();
    }

    drawVertexInfo(vertex: Vertex) {
        let pos = vertex.pos.add(cameraPos).mul(zoomFactor);
        let size = 14 + logistic(8, 1, 6, vertex.degree);

        context.fillStyle = TEXT_COLOR;
        context.font = `${size}px ${TEXT_FONT}`;

        let width = context.measureText(vertex.title).width;

        context.fillStyle = INFO_BG_STYLE;

        context.fillRect(pos.x - 1.01 * width / 2, pos.y - size, 1.01 * width, size * 1.5);

        context.fillStyle = TEXT_COLOR;
        context.fillText(vertex.title, pos.x - width / 2, pos.y);
    }

    drawEdge(edge: Edge) {
        let start = edge.source.pos.add(cameraPos).mul(zoomFactor);
        let end = edge.target.pos.add(cameraPos).mul(zoomFactor);

        context.lineWidth = 1;
        context.strokeStyle = EDGE_STROKE;

        drawLine(start, end);

        if (selectedVertex != undefined) {
            context.lineWidth = 3;

            let vertex; Vertex;

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
                drawLine(start, end)

                let line = start.to(end);
                let midpoint = start.add(line.mul(1/2))

                let v = line.mul(ARROW_SIZE / line.size());
                let p = midpoint.sub(v);
                let n = v.normal();

                fillTriangle(p.add(n), p.sub(n), p.add(v.mul(2)));
                
                this.drawRelatedVertex(vertex, PREDECESSOR_EDGE);
            }
        }
    }

    drawSidebar(edges: Edge[]) {
        context.fillStyle = SIDEBAR_STYLE;

        let width = 250 + logistic(250, 1/200, 1400, canvas.width);

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

        context.font = `${SIZE_H2}px ${TEXT_FONT}`;

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

        setInterval(this.step.bind(this), DT * SECOND);
    }

    step() {
        this.stepPhysics();
        this.stepDraw();
    }

    stepPhysics() {
        // Selected Vertex
        if (selectedVertex != undefined && mouseActive && currentMouseAction == MouseAction.MoveVertex) {
            selectedVertex.applyForce(this.mousePullForce(selectedVertex));
        }

        // Edges
        this.graph.edges.forEach(edge => {
            // Spring forces - attraction
            let force = this.springForce(edge);
            edge.source.applyForce(force);
            edge.target.applyForce(force.mul(-1));
        });
        
        // Vertices
        this.graph.vertices.forEach(vertex => {
            // Electrical forces - repulsion
            this.graph.vertices.forEach(other => {
                vertex.applyForce(this.electricalForce(vertex, other));
            });

            // Move vertex
            vertex.step();
        })
    }

    // Render Graph
    stepDraw() {
        // Reset Canvas
        this.renderer.fitCanvasToWindow();
        this.renderer.clear();

        // Draw Edges
        this.graph.edges.forEach(edge => {
            this.renderer.drawEdge(edge);
        });

        // Highlight Selected Vertex
        if (selectedVertex != undefined) {
            this.renderer.drawRelatedVertex(selectedVertex, HIGHLIGHT_COLOR);
        }

        // Draw Vertices
        this.graph.vertices.forEach(vertex => {
            this.renderer.drawVertex(vertex);
        });

        // Draw Hovered Vertex Info
        this.graph.vertices.forEach(vertex => {
            if (vertex.pos.add(cameraPos).mul(zoomFactor).to(mousePos).size() < degreeToRadius(vertex.degree)) {
                this.renderer.drawVertexInfo(vertex);
            }
        });

        // Draw GUI
        this.renderer.drawSidebar(this.graph.edges);
    }

    // Keep adjacent Vertices together
    springForce(edge: Edge): Vector {
        let r_vec = edge.source.pos.to(edge.target.pos);
        let r = r_vec.size();

        if (r == 0) return ZERO_VECTOR

        let force = r_vec.mul((SPRING_FACTOR * (r - IDEAL_SPRING_LENGTH)) / r);

        return force;
    }

    // Keep (unconnected) Vertices apart
    electricalForce(v1: Vertex, v2: Vertex): Vector {
        let r_vec = v2.pos.to(v1.pos);
        let r = r_vec.size();
        
        if (r == 0) return ZERO_VECTOR;

        let force = r_vec.mul(ELECTRICAL_FACTOR / (r**3));

        return force;
    }

    // Mouse Pull
    mousePullForce(vertex: Vertex): Vector {
        let r_vec = vertex.pos.add(cameraPos).mul(zoomFactor).to(mousePos);
        let force = r_vec.mul(MOUSE_SPRING_FACTOR);

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
                if (vertex.pos.add(cameraPos).mul(zoomFactor).to(new Vector(ev.x, ev.y)).size() < degreeToRadius(vertex.degree)) {
                    selectedVertex = vertex;
                    currentMouseAction = MouseAction.MoveVertex;
                }
            });
        });

        canvas.addEventListener("dblclick", (ev: MouseEvent) => {
            selectedVertex = undefined;
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
            cameraZoom -= ev.deltaY;
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