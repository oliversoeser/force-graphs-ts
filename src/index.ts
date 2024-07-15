const dt = 1 / 50;

const springFactor = 3;
const idealSpringLength = 30;
const electricalFactor = 2;
const velocityFactor = 100;

const gravityRadius = 500;
const gravityFactor = 5000;

class Vector {
    public x: number;
    public y: number;

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

const ZERO_VECTOR = new Vector(0, 0);

class Vertex {
    // Position
    public pos: Vector;

    // Total force applied in the current step
    private force: Vector;

    constructor(pos: Vector) {
        this.pos = pos;
        this.force = ZERO_VECTOR;
    }

    // Sum forces
    applyForce(force: Vector) { this.force = this.force.add(force); }

    // Apply force directly to position
    step() {
        this.pos = this.pos.add(this.force.mul(velocityFactor*dt));
        this.force = ZERO_VECTOR; // Reset force
    }
}

class Edge {
    public source: Vertex;
    public target: Vertex;

    constructor(source: Vertex, target: Vertex) {
        this.source = source;
        this.target = target;
    }
}

class Graph {
    public vertices: Vertex[];
    public edges: Edge[];

    constructor() {
        this.vertices = new Array();
        this.edges = new Array();

        for (let i = 0; i < 70; i++) {
            this.vertices.push(new Vertex(new Vector(150 + Math.random() * 700, 150 + Math.random() * 700)));
        }

        for (let i = 0; i < 70; i++) {
            this.edges.push(new Edge(this.vertices[i], this.vertices[Math.floor(Math.random() * 70)]));
        }
    }

    areAdjacent(v1: Vertex, v2: Vertex): boolean {
        this.edges.forEach(spring => {
            if ((spring.source == v1 && spring.target == v2) || (spring.source == v2 && spring.target == v1)) {
                return true;
            }
        });
        return false;
    }
}

class Renderer {
    public canvas: HTMLCanvasElement;
    private context: CanvasRenderingContext2D;

    constructor() {
        this.canvas = document.getElementById("frame") as HTMLCanvasElement;
        this.context = this.canvas.getContext("2d");
        this.fitCanvasToWindow();
    }

    fitCanvasToWindow() {
        this.canvas.width = window.innerWidth + 1;
        this.canvas.height = window.innerHeight + 1;
    }

    drawParticle(particle: Vertex) {
        let pos = particle.pos;
        this.context.strokeStyle = "black";

        this.context.beginPath();
        this.context.arc(pos.x, pos.y, 10, 0, 2 * Math.PI);
        this.context.stroke();
    }

    drawSpring(spring: Edge) {
        let start = spring.source.pos;
        let end = spring.target.pos;

        this.context.strokeStyle = "black";

        this.context.moveTo(start.x, start.y);
        this.context.lineTo(end.x, end.y);
        this.context.stroke();
    }

    clear() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

class SpringEmbedder {
    private renderer: Renderer;
    private graph: Graph;

    constructor() {
        this.renderer = new Renderer();
        this.graph = new Graph();

        this.graph.vertices.forEach(particle => {
            this.renderer.drawParticle(particle);
        });

        this.graph.edges.forEach(spring => {
            this.renderer.drawSpring(spring);
        });

        setInterval(this.step.bind(this), 1000 * dt);
    }

    step() {
        this.stepEades();
        this.stepDraw();
    }

    stepEades() {
        this.graph.vertices.forEach(particle => {
            // Gravity to Origin
            particle.applyForce(this.gravityOrigin(particle));

            // Repulsion
            this.graph.vertices.forEach(other => {
                let adjacent = this.graph.areAdjacent(particle, other);

                if (!adjacent) {
                    particle.applyForce(this.electricalForceEades(particle, other));
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

    stepDraw() {
        // Reset canvas
        this.renderer.fitCanvasToWindow();
        this.renderer.clear();

        // Draw
        this.graph.vertices.forEach(particle => {
            particle.step();
            this.renderer.drawParticle(particle);
        });

        this.graph.edges.forEach(spring => {
            this.renderer.drawSpring(spring);
        });
    }

    gravityOrigin(vertex: Vertex): Vector {
        let canvas = this.renderer.canvas;
        let r_vec = vertex.pos.to(new Vector(canvas.width/2, canvas.height/2));
        let d = Math.max(r_vec.size(), gravityRadius);
        let force = r_vec.mul(1 / d).mul(gravityFactor / d);
        return force
    }

    springForceEades(edge: Edge): Vector {
        let r_vec = edge.source.pos.to(edge.target.pos);
        let d = Math.max(r_vec.size(), 1);
        let force = r_vec.mul(1 / d).mul(springFactor * Math.log(d / idealSpringLength));
        return force
    }

    electricalForceEades(v1: Vertex, v2: Vertex): Vector {
        let r_vec = v2.pos.to(v1.pos);
        let d = Math.max(r_vec.size(), 1);
        let force = r_vec.mul(1 / d).mul(electricalFactor / Math.sqrt(d));
        return force;
    }
}

window.onload = () => {
    new SpringEmbedder();
}