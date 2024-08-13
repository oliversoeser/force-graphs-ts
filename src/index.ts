/*** INTERFACES, TYPES, and ENUMS ***/

// Dictionary Interface
interface Dictionary<T> {
    [Key: string]: T;
}

// Graph Data representation
type VertexData = { name: string; title: string; };
type EdgeData = { sourcename: string; targetname: string; };
type GraphData = { vertices: VertexData[]; edges: EdgeData[]; };

// User Actions
enum MouseAction {
    None,
    MoveCamera,
    MoveVertex
}


/*** CONSTANTS ***/

// Delta Time
const DT = 1 / 30;

// Execution speed
const EXECUTION_FACTOR = 1;

// Force Coefficients
const SPRING_FACTOR = 3;
const ELECTRICAL_FACTOR = 3;
const VELOCITY_FACTOR = 100;
const GRAVITY_FACTOR = 15000;

// Target Distance between Vertices
const IDEAL_SPRING_LENGTH = 50;

// Radius of Uniform Gravity
const GRAVITY_RADIUS = 700;

// Render Settings
const VERTEX_RADIUS = 10;
const VERTEX_STROKE = "#023047";
const VERTEX_FILL = "#8ECAE6";
const EDGE_STROKE = "grey";
const SELECTION_FILL = "black";
const BACKGROUND_COLOR = "white";

/*** GLOBAL VARIABLES ***/

let canvas: HTMLCanvasElement;
let context: CanvasRenderingContext2D;

let cameraPos: Vector;
let cameraZoom: number;
let zoomFactor: number;

let selectedVertex: Vertex;
let mousePos: Vector;
let mouseActive: boolean = false;


/*** MATHEMATICS ***/

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

/*** MATHEMATICAL CONSTANTS ***/
const ZERO_VECTOR = new Vector(0, 0);
const SECOND = 1000;


/*** GRAPHS ***/

class Vertex {
    public pos: Vector; // Position
    private force: Vector; // Total force applied in the current step
    public readonly id: number;
    public readonly name: string;
    public readonly title: string;

    constructor(pos: Vector, id: number, name: string, title: string) {
        this.pos = pos;
        this.force = ZERO_VECTOR;
        this.id = id;
        this.name = name;
        this.title = title;
    }

    // Sum forces
    applyForce(force: Vector) { this.force = this.force.add(force); }

    // Apply force directly to position
    step() {
        this.pos = this.pos.add(this.force.mul(VELOCITY_FACTOR * DT));
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

let degree: number[];
let adjacency: number[][];

class Graph {
    public vertices: Vertex[];
    public edges: Edge[];

    public nameToId: Dictionary<number>;

    constructor(data: GraphData) {
        this.vertices = new Array();
        this.edges = new Array();

        this.nameToId = {};

        degree = new Array();
        adjacency = new Array();

        for (let id = 0; id < data.vertices.length; id++) {
            let vdata = data.vertices[id];
            this.nameToId[vdata.name] = id;
            this.vertices.push(new Vertex(new Vector(Math.random() * canvas.width, Math.random() * canvas.height), id, vdata.name, vdata.title));
            degree.push(0);
            adjacency.push([]);

            for (let j = 0; j < data.vertices.length; j++) {
                adjacency[id][j] = 0;
            }
        }

        data.edges.forEach(edata => {
            let sId = this.nameToId[edata.sourcename];
            let tId = this.nameToId[edata.targetname];

            this.edges.push(new Edge(this.vertices[sId], this.vertices[tId]));

            degree[sId]++;
            degree[tId]++;

            adjacency[sId][tId] = 1;
            adjacency[tId][sId] = 1;
        });
    }
}


/*** VISUALISATION ***/

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

        context.beginPath();
        context.arc(pos.x, pos.y, VERTEX_RADIUS*zoomFactor*Math.sqrt(degree[vertex.id]), 0, 2 * Math.PI);
        context.fill();
        context.stroke();
    }

    drawRelatedVertex(vertex: Vertex, color: string) {
        let stroke = context.strokeStyle;
        let fill = context.fillStyle;
        let pos = vertex.pos.add(cameraPos).mul(zoomFactor);
        context.strokeStyle = color;
        context.fillStyle = color;
        context.beginPath();
        context.arc(pos.x, pos.y, 3+VERTEX_RADIUS*zoomFactor*Math.sqrt(degree[vertex.id]), 0, 2 * Math.PI);
        context.fill();
        context.stroke();

        context.strokeStyle = stroke;
        context.fillStyle = fill;
    }

    drawVertexInfo(vertex: Vertex) {
        let pos = vertex.pos.add(cameraPos).mul(zoomFactor);

        // Sigmoid curve to keep the text within a readable range
        context.font = `${14+8/(1+Math.exp(18-10*Math.cbrt(degree[vertex.id])))}px Arial`;
        context.fillText(vertex.title, pos.x - context.measureText(vertex.title).width/2, pos.y);
        context.fillStyle = VERTEX_STROKE;
    }

    drawEdge(edge: Edge) {
        let start = edge.source.pos.add(cameraPos).mul(zoomFactor);
        let end = edge.target.pos.add(cameraPos).mul(zoomFactor);

        if (selectedVertex == undefined) {}
        else if (edge.source.id == selectedVertex.id) {
            context.lineWidth = 3;
            context.strokeStyle = "green";
            context.beginPath()
            context.moveTo(start.x, start.y);
            context.lineTo(end.x, end.y);
            context.stroke();
            context.lineWidth = 1;
            context.strokeStyle = EDGE_STROKE;

            let line = end.to(start);
            let len = line.size();
            let u_dir = line.mul(1/len);
            let normal_dir = new Vector(-u_dir.y, u_dir.x);
            
            let midpoint = end.add(u_dir.mul(len/2))
            let a = midpoint.add(normal_dir.mul(7));
            let b = midpoint.sub(normal_dir.mul(7));
            let c = midpoint.add(u_dir.mul(-7));

            context.lineWidth = 4;
            context.strokeStyle = "green";
            context.beginPath()
            context.moveTo(a.x, a.y);
            context.lineTo(b.x, b.y);
            context.stroke();
            context.beginPath()
            context.moveTo(c.x, c.y);
            context.lineTo(b.x, b.y);
            context.stroke();
            context.beginPath()
            context.moveTo(a.x, a.y);
            context.lineTo(c.x, c.y);
            context.stroke();
            context.lineWidth = 1;
            context.strokeStyle = EDGE_STROKE;

            this.drawRelatedVertex(edge.target, "green");
            return
        } else if (edge.target.id == selectedVertex.id) {
            context.lineWidth = 3;
            context.strokeStyle = "red";
            context.beginPath()
            context.moveTo(start.x, start.y);
            context.lineTo(end.x, end.y);
            context.stroke();
            context.lineWidth = 1;
            context.strokeStyle = EDGE_STROKE;

            let line = start.to(end);
            let len = line.size();
            let u_dir = line.mul(1/len);
            let normal_dir = new Vector(-u_dir.y, u_dir.x);
            
            let midpoint = start.add(u_dir.mul(len/2))
            let a = midpoint.add(normal_dir.mul(7));
            let b = midpoint.sub(normal_dir.mul(7));
            let c = midpoint.add(u_dir.mul(7));

            context.lineWidth = 4;
            context.strokeStyle = "red";
            context.beginPath()
            context.moveTo(a.x, a.y);
            context.lineTo(b.x, b.y);
            context.stroke();
            context.beginPath()
            context.moveTo(c.x, c.y);
            context.lineTo(b.x, b.y);
            context.stroke();
            context.beginPath()
            context.moveTo(a.x, a.y);
            context.lineTo(c.x, c.y);
            context.stroke();
            context.lineWidth = 1;
            context.strokeStyle = EDGE_STROKE;

            this.drawRelatedVertex(edge.source, "red");
            return
        }
        context.beginPath()
        context.moveTo(start.x, start.y);
        context.lineTo(end.x, end.y);
        context.stroke();
    }

    clear() {
        context.clearRect(0, 0, canvas.width, canvas.height);

        context.rect(0, 0, canvas.width, canvas.height);
        context.fillStyle = BACKGROUND_COLOR;
        context.fill();
    }
}


/*** FORCE DIRECTED GRAPH ALGORITHM ***/

class SpringEmbedder {
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

        setInterval(this.step.bind(this), EXECUTION_FACTOR * DT * SECOND);
    }

    step() {
        this.stepEades();
        this.stepDraw();
    }

    // Eades' SPRING Algorithm
    stepEades() {
        for (let id = 0; id < this.graph.vertices.length; id++) {
            let vertex = this.graph.vertices[id];

            // Gravity to Origin
            vertex.applyForce(this.gravityOrigin(vertex));

            // Repulsion
            this.graph.vertices.forEach(other => {
                if (!adjacency[vertex.id][other.id]) {
                    vertex.applyForce(this.electricalForceEades(vertex, other));
                }
            });
        }

        // Spring forces
        this.graph.edges.forEach(edge => {
            let force = this.springForceEades(edge);
            edge.source.applyForce(force);
            edge.target.applyForce(force.mul(-1));
        });

        // Mouse force
        if (selectedVertex != undefined && mouseActive && currentMouseAction == MouseAction.MoveVertex) {
            selectedVertex.applyForce(this.mousePullForce(selectedVertex));
        }
    }

    // Render Graph
    stepDraw() {
        // Reset canvas
        this.renderer.fitCanvasToWindow();
        this.renderer.clear();

        // Draw Edges
        context.strokeStyle = EDGE_STROKE;
        this.graph.edges.forEach(edge => {
            this.renderer.drawEdge(edge);
        });

        // Draw Vertices
        context.lineWidth = 1;
        context.strokeStyle = VERTEX_STROKE;
        context.fillStyle = VERTEX_FILL;
        this.graph.vertices.forEach(vertex => {
            vertex.step();
            this.renderer.drawVertex(vertex);
        });

        // Draw Hovered Vertex Info
        context.fillStyle = SELECTION_FILL;

        this.graph.vertices.forEach(vertex => {
            if (vertex.pos.add(cameraPos).mul(zoomFactor).to(mousePos).size() < VERTEX_RADIUS*zoomFactor*Math.sqrt(degree[vertex.id])) {
                this.renderer.drawVertexInfo(vertex);
            }
        });
    }

    // Keep Graph centred
    gravityOrigin(vertex: Vertex): Vector {
        let r_vec = vertex.pos.to(new Vector(canvas.width / 2, canvas.height / 2));
        let d = Math.max(r_vec.size(), GRAVITY_RADIUS);
        let force = r_vec.mul(1 / d).mul(GRAVITY_FACTOR / d);
        return force
    }

    // Keep adjacent Vertices together
    springForceEades(edge: Edge): Vector {
        let r_vec = edge.source.pos.to(edge.target.pos);
        let d = Math.max(r_vec.size(), 1);
        let force = r_vec.mul(1 / d).mul(SPRING_FACTOR * Math.log(d / (IDEAL_SPRING_LENGTH + VERTEX_RADIUS * Math.sqrt(degree[edge.source.id] * degree[edge.target.id]))));
        return force
    }

    // Keep unconnected Vertices apart
    electricalForceEades(v1: Vertex, v2: Vertex): Vector {
        let r_vec = v2.pos.to(v1.pos);
        let d = Math.max(r_vec.size(), 1);
        let force = r_vec.mul(1 / d).mul((degree[v1.id] * degree[v2.id])**(1/5) * ELECTRICAL_FACTOR / Math.sqrt(d));
        return force;
    }

    // Mouse pull
    mousePullForce(vertex: Vertex): Vector {
        let r_vec = vertex.pos.add(cameraPos).mul(zoomFactor).to(mousePos);
        let force = r_vec.mul(1 / 7);
        return force;
    }
}

let currentMouseAction: MouseAction;

class App {
    private readonly springEmbedder: SpringEmbedder;

    constructor(data: GraphData) {
        this.springEmbedder = new SpringEmbedder(data)
        
        currentMouseAction = MouseAction.None;
        mousePos = ZERO_VECTOR;

        selectedVertex = undefined;

        canvas.addEventListener("mousedown", (ev: MouseEvent) => {
            currentMouseAction = MouseAction.MoveCamera;
            mouseActive = true;

            this.springEmbedder.graph.vertices.forEach(vertex => {
                if (vertex.pos.add(cameraPos).mul(zoomFactor).to(new Vector(ev.x, ev.y)).size() < VERTEX_RADIUS*zoomFactor*Math.sqrt(degree[vertex.id])) {
                    selectedVertex = vertex;
                    currentMouseAction = MouseAction.MoveVertex;
                }
            });
        });

        canvas.addEventListener("mousemove", (ev: MouseEvent) => {
            let newMousePos = new Vector(ev.x, ev.y);

            // Move Camera
            if (currentMouseAction == MouseAction.MoveCamera) {
                let delta = mousePos.to(newMousePos);
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
        return Math.max(Math.exp(zoom/5000), 0.2);
    }
}


/*** APP START ***/

window.onload = () => {
    fetch('../data/graph.json')
        .then((response) => response.json() as unknown as GraphData)
        .then((json) => start(json));
}

function start(data: GraphData) {
    canvas = document.getElementById("frame") as HTMLCanvasElement;
    context = canvas.getContext("2d");

    cameraPos = ZERO_VECTOR;
    cameraZoom = 0;
    zoomFactor = 1;

    new App(data);
}