const dt = 1/50;

class Vector2D {
    public x: number;
    public y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    // The sum of the vectors
    add(other: Vector2D): Vector2D {
        return new Vector2D(this.x + other.x, this.y + other.y);
    }

    // The vector from itself to the other vector
    to(other: Vector2D): Vector2D {
        return new Vector2D(other.x - this.x, other.y - this.y);
    }

    // The magnitude of the vector
    size(): number {
        return Math.sqrt(this.x**2 + this.y**2);
    }

    // The vector multiplied by a factor
    times(factor: number): Vector2D {
        return new Vector2D(this.x * factor, this.y * factor);
    }
}

class Particle {
    // Physical properties
    public pos: Vector2D;
    public velocity: Vector2D;
    public mass: number;
    public charge: number;

    // Representation
    public radius: number;
    public color: string;

    constructor(pos: Vector2D, mass: number, radius: number, color: string) {
        this.pos = pos;
        this.velocity = new Vector2D(0, 0);
        this.mass = mass;
        this.charge = 6;

        this.radius = radius;
        this.color = color;
    }

    // Continuous acceleration
    applyForce(force: Vector2D) {
        let acceleration = force.times(1/this.mass);
        this.velocity = this.velocity.add(acceleration.times(dt));
    }

    // Continuous particle movement
    step() {
        this.pos = this.pos.add(this.velocity.times(dt));
    }
}

class Spring {
    // Physical properties
    public source: Particle;
    public target: Particle;
    public ideal: number;
    public stiffness: number;

    public color: string;

    constructor(source: Particle, target: Particle, color: string) {
        this.source = source;
        this.target = target;
        this.ideal = 30;
        this.stiffness = 2;
        this.color = color;
    }
}

class Drawing {
    private canvas: HTMLCanvasElement;
    private context: CanvasRenderingContext2D;

    constructor() {
        this.canvas = document.getElementById("frame") as HTMLCanvasElement;
        this.context = this.canvas.getContext("2d");
    }

    drawParticle(particle: Particle) {
        let pos = particle.pos;

        this.context.strokeStyle = particle.color;

        this.context.beginPath();
        this.context.arc(pos.x, pos.y, particle.radius, 0, 2 * Math.PI);
        this.context.stroke();
    }

    drawSpring(spring: Spring) {
        let start = spring.source.pos;
        let end = spring.target.pos;

        this.context.strokeStyle = spring.color;

        this.context.moveTo(start.x, start.y);
        this.context.lineTo(end.x, end.y);
        this.context.stroke();
    }

    clear() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

class Physics {
    private drawing: Drawing;

    // Physical constants
    private G: number = 1.7*10**4;
    private ke: number = 10**4;

    // Objects
    private particle_array: Particle[];
    private spring_array: Spring[];    

    constructor() {
        this.drawing = new Drawing();

        this.particle_array = new Array();
        this.spring_array = new Array();

        for (let i = 0; i < 100; i++) {
            this.particle_array.push(new Particle(new Vector2D(150 + Math.random()*700, 150 + Math.random()*700), 10, 10, "black"));
        }

        for (let i = 0; i < 40; i++) {
            this.spring_array.push(new Spring(this.particle_array[i], this.particle_array[i+1], "#cedfe8"));
        }

        this.particle_array.forEach(particle => {
            this.drawing.drawParticle(particle);
        });

        this.spring_array.forEach(spring => {
            this.drawing.drawSpring(spring);
        });

        setInterval(this.step.bind(this), 1000*dt);
    }

    step() {
        this.particle_array.forEach(particle => {
            // Gravity towards centre
            let centre = new Particle(new Vector2D(500, 500), 100, 10, "black")

            particle.applyForce(this.gravitationalForce(particle, centre));

            this.particle_array.forEach(other => {
                // Charge
                particle.applyForce(this.electricForce(particle, other));
            });
        });

        // Spring forces
        this.spring_array.forEach(spring => {
            let r_vec = spring.source.pos.to(spring.target.pos);
            let r = Math.max(r_vec.size(), spring.source.radius);
            let ideal_vec = r_vec.times(spring.ideal/r);
            let force = r_vec.add(ideal_vec.times(-1)).times(spring.stiffness);
            spring.source.applyForce(force);
            spring.target.applyForce(force.times(-1));
        });

        // Reset canvas
        this.drawing.clear();

        // Draw
        this.particle_array.forEach(particle => {
            particle.step();
            this.drawing.drawParticle(particle);
        });

        this.spring_array.forEach(spring => {
            this.drawing.drawSpring(spring);
        });
    }

    gravitationalForce(p1: Particle, p2: Particle): Vector2D {
        let r_vec = p1.pos.to(p2.pos);
        let r = Math.max(r_vec.size(), p1.radius);
        let r_uvec = r_vec.times(1/r); // Unit vector

        // Newton's law of universal gravitation
        let force = r_uvec.times((this.G * p1.mass * p2.mass) / (r**2));

        return force
    }

    electricForce(p1: Particle, p2: Particle): Vector2D {
        let r_vec = p2.pos.to(p1.pos);
        let r = Math.max(r_vec.size(), p1.radius);
        let r_uvec = r_vec.times(1/r); // Unit vector

        // Coulomb's law
        let force = r_uvec.times((this.ke * p1.charge * p2.charge)/(r**2));

        return force;
    }
}

new Physics();