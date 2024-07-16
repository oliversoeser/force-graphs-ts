/*** INTERFACES, TYPES, and ENUMS ***/

// Dictionary Interface
interface Dictionary<T> {
    [Key: string]: T;
}

// Graph Data representation
type VertexData = { key: string; };
type EdgeData = { source: string; target: string; };
type GraphData = { vertices: VertexData[]; edges: EdgeData[]; };

// User Actions
enum MouseAction {
    None,
    MoveCamera,
    MoveVertex
}


/*** CONSTANTS ***/

// Delta Time
const DT = 1 / 50;

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
const VERTEX_STYLE = "black";
const EDGE_STYLE = "black";


/*** GLOBAL VARIABLES ***/

let canvas: HTMLCanvasElement;
let context: CanvasRenderingContext2D;

let cameraPos: Vector;
let cameraZoom: number;
let zoomFactor: number;

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
    public readonly key: string;

    constructor(pos: Vector, key: string) {
        this.pos = pos;
        this.force = ZERO_VECTOR;
        this.key = key;
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

class Graph {
    public vertices: Vertex[];
    public edges: Edge[];
    public keyToVertex: Dictionary<Vertex>;
    public adjacency: Dictionary<boolean>;

    constructor(data: GraphData) {
        this.vertices = new Array();
        this.edges = new Array();

        this.keyToVertex = {};
        this.adjacency = {};

        data.vertices.forEach(vdata => {
            let vertex = new Vertex(new Vector(Math.random() * canvas.width, Math.random() * canvas.height), vdata.key)
            this.keyToVertex[vdata.key] = vertex;
            this.vertices.push(vertex);

            data.vertices.forEach(vdata2 => {
                this.adjacency[vdata.key + vdata2.key] = false;
                this.adjacency[vdata2.key + vdata.key] = false;
            });
        });

        data.edges.forEach(edata => {
            this.edges.push(new Edge(this.keyToVertex[edata.source], this.keyToVertex[edata.target]));
            this.adjacency[edata.source + edata.target] = true;
            this.adjacency[edata.target + edata.source] = true;
        });
    }

    areAdjacent(v1: Vertex, v2: Vertex): boolean {
        return this.adjacency[v1.key + v2.key];
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
        context.arc(pos.x, pos.y, VERTEX_RADIUS*zoomFactor, 0, 2 * Math.PI);
        context.stroke();
    }

    drawEdge(edge: Edge) {
        let start = edge.source.pos.add(cameraPos).mul(zoomFactor);
        let end = edge.target.pos.add(cameraPos).mul(zoomFactor);

        context.moveTo(start.x, start.y);
        context.lineTo(end.x, end.y);
        context.stroke();
    }

    clear() {
        context.clearRect(0, 0, canvas.width, canvas.height);
    }
}


/*** FORCE DIRECTED GRAPH ALGORITHM ***/

class SpringEmbedder {
    private readonly renderer: Renderer;
    private readonly graph: Graph;

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
        this.graph.vertices.forEach(vertex => {
            // Gravity to Origin
            vertex.applyForce(this.gravityOrigin(vertex));

            // Repulsion
            this.graph.vertices.forEach(other => {
                let adjacent = this.graph.areAdjacent(vertex, other);

                if (!adjacent) {
                    vertex.applyForce(this.electricalForceEades(vertex, other));
                }
            });
        });

        // Spring forces
        this.graph.edges.forEach(edge => {
            let force = this.springForceEades(edge);
            edge.source.applyForce(force);
            edge.target.applyForce(force.mul(-1));
        });
    }

    // Render Graph
    stepDraw() {
        // Reset canvas
        this.renderer.fitCanvasToWindow();
        this.renderer.clear();

        // Draw Vertices
        context.strokeStyle = VERTEX_STYLE;
        this.graph.vertices.forEach(vertex => {
            vertex.step();
            this.renderer.drawVertex(vertex);
        });

        // Draw Edges
        context.strokeStyle = EDGE_STYLE;
        this.graph.edges.forEach(edge => {
            this.renderer.drawEdge(edge);
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
        let force = r_vec.mul(1 / d).mul(SPRING_FACTOR * Math.log(d / IDEAL_SPRING_LENGTH));
        return force
    }

    // Keep unconnected Vertices apart
    electricalForceEades(v1: Vertex, v2: Vertex): Vector {
        let r_vec = v2.pos.to(v1.pos);
        let d = Math.max(r_vec.size(), 1);
        let force = r_vec.mul(1 / d).mul(ELECTRICAL_FACTOR / Math.sqrt(d));
        return force;
    }
}

class App {
    private readonly springEmbedder: SpringEmbedder;

    private currentMouseAction: MouseAction;
    private mousePos: Vector;

    constructor(data: GraphData) {
        this.springEmbedder = new SpringEmbedder(data)
        
        this.currentMouseAction = MouseAction.None;
        this.mousePos = ZERO_VECTOR;

        canvas.addEventListener("mousedown", (ev: MouseEvent) => {
            this.currentMouseAction = MouseAction.MoveCamera;
        });

        canvas.addEventListener("mousemove", (ev: MouseEvent) => {
            let newMousePos = new Vector(ev.x, ev.y);

            // Move Camera
            if (this.currentMouseAction == MouseAction.MoveCamera) {
                let delta = this.mousePos.to(newMousePos);
                cameraPos = cameraPos.add(delta);
            }

            this.mousePos = newMousePos;
        });

        canvas.addEventListener("mouseup", (ev: MouseEvent) => {
            this.currentMouseAction = MouseAction.None;
        });

        canvas.addEventListener("wheel", (ev: WheelEvent) => {
            cameraZoom += ev.deltaY * -1;
            zoomFactor = this.zoomFactorFunction(cameraZoom);
        })
    }

    zoomFactorFunction(x: number) {
        return Math.max(Math.exp(x/5000), 0.2);
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