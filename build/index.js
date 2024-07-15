var dt = 1 / 50;
var Vector2D = (function () {
    function Vector2D(x, y) {
        this.x = x;
        this.y = y;
    }
    Vector2D.prototype.add = function (other) {
        return new Vector2D(this.x + other.x, this.y + other.y);
    };
    Vector2D.prototype.to = function (other) {
        return new Vector2D(other.x - this.x, other.y - this.y);
    };
    Vector2D.prototype.size = function () {
        return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
    };
    Vector2D.prototype.times = function (factor) {
        return new Vector2D(this.x * factor, this.y * factor);
    };
    return Vector2D;
}());
var Particle = (function () {
    function Particle(pos, mass, radius, color) {
        this.pos = pos;
        this.velocity = new Vector2D(0, 0);
        this.mass = mass;
        this.charge = 14;
        this.force = new Vector2D(0, 0);
        this.radius = radius;
        this.color = color;
    }
    Particle.prototype.applyForce = function (force) {
        this.force = this.force.add(force);
    };
    Particle.prototype.step = function () {
        var acceleration = this.force.times(1 / this.mass);
        this.velocity = this.velocity.add(acceleration.times(dt));
        this.pos = this.pos.add(this.velocity.times(dt));
        this.force = new Vector2D(0, 0);
    };
    return Particle;
}());
var Spring = (function () {
    function Spring(source, target, color) {
        this.source = source;
        this.target = target;
        this.ideal = 30;
        this.stiffness = 5;
        this.color = color;
    }
    return Spring;
}());
var Mouse = (function () {
    function Mouse() {
        this.down = false;
        this.pos = new Vector2D(0, 0);
        this.clickpos = this.pos;
    }
    return Mouse;
}());
var Drawing = (function () {
    function Drawing() {
        var _this = this;
        this.canvas = document.getElementById("frame");
        this.context = this.canvas.getContext("2d");
        this.mouse = new Mouse();
        this.canvas.addEventListener("mousedown", function (event) {
            _this.mouse.down = true;
            _this.mouse.clickpos = new Vector2D(event.x, event.y);
        });
        this.canvas.addEventListener("mousemove", function (event) {
        });
        this.canvas.addEventListener("mouseup", function (event) {
            _this.mouse.down = false;
        });
    }
    Drawing.prototype.drawParticle = function (particle) {
        var pos = particle.pos;
        this.context.strokeStyle = particle.color;
        this.context.beginPath();
        this.context.arc(pos.x, pos.y, particle.radius, 0, 2 * Math.PI);
        this.context.stroke();
    };
    Drawing.prototype.drawSpring = function (spring) {
        var start = spring.source.pos;
        var end = spring.target.pos;
        this.context.strokeStyle = spring.color;
        this.context.moveTo(start.x, start.y);
        this.context.lineTo(end.x, end.y);
        this.context.stroke();
    };
    Drawing.prototype.clear = function () {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    };
    return Drawing;
}());
var Physics = (function () {
    function Physics() {
        var _this = this;
        this.G = 1.7 * Math.pow(10, 4);
        this.ke = Math.pow(10, 4);
        this.drawing = new Drawing();
        this.particle_array = new Array();
        this.spring_array = new Array();
        for (var i = 0; i < 100; i++) {
            this.particle_array.push(new Particle(new Vector2D(150 + Math.random() * 700, 150 + Math.random() * 700), 10, 10, "black"));
        }
        for (var i = 0; i < 40; i++) {
            this.spring_array.push(new Spring(this.particle_array[i], this.particle_array[i + 1], "#cedfe8"));
        }
        this.particle_array.forEach(function (particle) {
            _this.drawing.drawParticle(particle);
        });
        this.spring_array.forEach(function (spring) {
            _this.drawing.drawSpring(spring);
        });
        setInterval(this.step.bind(this), 1000 * dt);
    }
    Physics.prototype.step = function () {
        var _this = this;
        this.particle_array.forEach(function (particle) {
            _this.particle_array.forEach(function (other) {
                particle.applyForce(_this.gravitationalForce(particle, other));
                particle.applyForce(_this.electricForce(particle, other));
            });
        });
        this.spring_array.forEach(function (spring) {
            var r_vec = spring.source.pos.to(spring.target.pos);
            var r = Math.max(r_vec.size(), spring.source.radius);
            var ideal_vec = r_vec.times(spring.ideal / r);
            var force = r_vec.add(ideal_vec.times(-1)).times(spring.stiffness);
            spring.source.applyForce(force);
            spring.target.applyForce(force.times(-1));
        });
        this.drawing.clear();
        this.particle_array.forEach(function (particle) {
            particle.step();
            _this.drawing.drawParticle(particle);
        });
        this.spring_array.forEach(function (spring) {
            _this.drawing.drawSpring(spring);
        });
    };
    Physics.prototype.gravitationalForce = function (p1, p2) {
        var r_vec = p1.pos.to(p2.pos);
        var r = Math.max(r_vec.size(), p1.radius + p2.radius);
        var r_uvec = r_vec.times(1 / r);
        var force = r_uvec.times((this.G * p1.mass * p2.mass) / (Math.pow(r, 2)));
        return force;
    };
    Physics.prototype.electricForce = function (p1, p2) {
        var r_vec = p2.pos.to(p1.pos);
        var r = Math.max(r_vec.size(), p1.radius + p2.radius);
        var r_uvec = r_vec.times(1 / r);
        var force = r_uvec.times((this.ke * p1.charge * p2.charge) / (Math.pow(r, 2)));
        return force;
    };
    return Physics;
}());
window.onload = function () {
    new Physics();
};
