import Boid from "./Boid.js";
import Obstacle from "./Obstacle.js";
const canvas = document.getElementById("boidsCanvas");
const ctx = canvas.getContext("2d");

const avoidingElements = [document.getElementById("bio")]

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
var width = canvas.width;
var height = canvas.height;
const boids = [];
const obstacles = [];
//const population = Math.min(width,height)/7;
const population = Math.min(width,height)/8;

var addBoids = true;
var addObstacles = false;
var bodyEnabled = true;
var drag = false;

function init(){
    for (let i = 0; i < population; i++){
        //boids.push(new Boid(Math.floor(Math.random() * width),Math.floor(Math.random() * height)))
        boids.push(new Boid(Math.floor(Math.random() * width),Math.floor(Math.random() * height)))
    }

    for (let e of avoidingElements){
        let r = e.getBoundingClientRect();
        let o = new Obstacle(r.left,r.top);
        o.right = r.right;
        o.bottom = r.bottom;
        obstacles.push(o);
    }

    
    window.requestAnimationFrame(update);
}


let lastTime = performance.now();  // Track the last frame time

function update(){
    let now = performance.now();
    let deltaTime = (now - lastTime) / 16.67; // Normalize to 60 FPS baseline
    lastTime = now;


    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    width = canvas.width;
    height = canvas.height;



    let index = 0;
    for (let e of avoidingElements){
        let r = e.getBoundingClientRect();
        obstacles[index].left = r.left;
        obstacles[index].right = r.right;
        obstacles[index].top = r.top;
        obstacles[index].bottom = r.bottom;
        index++;
    }

    ctx.clearRect(0,0,width,height);
    for (let b of boids){
        drawBoid(b);
        b.move(deltaTime);
        b.flock(boids, obstacles, 1.2,1,1.05);
        b.x = ((b.x % width) + width) % width
        b.y = ((b.y % height) + height) % height
    }
    /*
    for(let o of obstacles){
        drawObstacle(o);
    }
    */
    window.requestAnimationFrame(update);
}
function drawObstacle(o){
    ctx.strokeStyle = "rgb(255 255 255)";
    ctx.lineWidth = 2;
    ctx.strokeRect(o.left,o.top,o.right-o.left,o.bottom-o.top);
    ctx.lineWidth = 1;
}
function drawBoid(b){
    let size = Math.min(5,Math.max((width + height)*0.0025,3));
    var angle = Math.atan(b.velY/b.velX)+Math.PI;
    if(b.velX<0){
        angle = Math.PI + angle;
    }
    var currentAngle = angle;
    var x = b.x;
    var y = b.y;
    
    if(bodyEnabled){
        //draw body
        ctx.strokeStyle = "rgb(255 255 255)";
        ctx.beginPath();
        ctx.moveTo(x,y);
        x += size * Math.cos(currentAngle);
        y += size * Math.sin(currentAngle);
        ctx.lineTo(x,y);
        currentAngle += 2/3 * Math.PI;
        x -= size * Math.cos(currentAngle);
        y -= size * Math.sin(currentAngle);
        ctx.lineTo(x,y);
        x = b.x;
        y = b.y;
        ctx.lineTo(x,y);
        currentAngle = angle;
        x += size * Math.cos(currentAngle);
        y += size * Math.sin(currentAngle);
        ctx.moveTo(x,y)
        currentAngle -= 2/3 * Math.PI;
        x -= size * Math.cos(currentAngle);
        y -= size * Math.sin(currentAngle);
        ctx.lineTo(x,y);
        ctx.lineTo(b.x,b.y);
        

        ctx.lineWidth = 1;
        ctx.stroke();
    } else{
        //draw head
        ctx.fillStyle = "rgb(255 255 255)";
        ctx.fillRect(b.x-2,b.y-2,4,4);
    }
    
    

}

window.onscroll = function(e) {
    for(let b of boids){
        if (Math.random()>0.7){
            if(this.oldScroll > this.scrollY){
                b.accY -=1;
            }
            else{
                b.accY +=1;
            }
        }
    }

    this.oldScroll = this.scrollY;

  }
init();
