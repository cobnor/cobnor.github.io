export default class Boid{
    constructor(x=0, y=0){
        this.x = x;
        this.y = y;
        
        let angle = Math.random() * Math.PI * 2;
        let speed = Math.random() * 10
        this.velX = speed*Math.cos(angle);
        this.velY = speed*Math.sin(angle);
        
        this.accX = 0;
        this.accY = 0;

        this.maxForce = 0.2;
        this.maxSpeed = 5;
    }
    withinDist(maxDist,x,y){
        if((this.x-x)*(this.x-x) + (this.y-y)*(this.y-y) <= maxDist * maxDist){
            return true
        }
        else{
            return false
        }
    }
    length(x,y){
        const v = x*x + y*y
        return v ** 0.5;
    }
    
    setMagnitude(x,y,m){
        const v = ((x*x + y*y) ** -0.5) * m;
        return [x * v, y * v];
    }
    move(deltaTime = 1) {
        // Scale velocity and acceleration by deltaTime
        let scaledVelX = this.velX * deltaTime;
        let scaledVelY = this.velY * deltaTime;
        let scaledAccX = this.accX * deltaTime;
        let scaledAccY = this.accY * deltaTime;
    
        // Limit velocity to max speed
        if (this.length(scaledVelX, scaledVelY) > this.maxSpeed) {
            [scaledVelX, scaledVelY] = this.setMagnitude(scaledVelX, scaledVelY, this.maxSpeed);
        }
    
        // Update position based on scaled velocity
        this.x += scaledVelX;
        this.y += scaledVelY;
    
        // Apply acceleration
        this.velX += scaledAccX;
        this.velY += scaledAccY;
    }
    flock(boids, obstacles, a, c, s){
        const align = this.alignment(boids,a);
        const cohere = this.cohesion(boids,c);
        const separate = this.separation(boids,s);
        const avoid = this.avoidObstacles(obstacles);
        this.accX = a*align[0] + c*cohere[0] + s*separate[0] + 2*avoid[0];
        this.accY = a*align[1] + c*cohere[1] + s*separate[1] + 2*avoid[1];
        //this.accX = cohere[0];
        //this.accY = cohere[1];
    }

    avoidObstacles(obstacles){
        const localRadius = 50;
        const padding = 25;
        var forceX = 0;
        var forceY = 0;
        var count = 0;

        for(let o of obstacles){
            let outside = true;
            if (outside){
                let distToLeft = Math.abs(this.x - o.left);
                let distToRight = Math.abs(this.x - o.right);
                let distToTop = Math.abs(this.y - o.top);
                let distToBottom = Math.abs(this.y - o.bottom);
                let minDist = Math.min(distToLeft,distToRight,distToTop,distToBottom);
                //collision with left wall (-1, 0) vector out
                if(this.y > o.top-padding && this.y < o.bottom+padding){
                    if (distToLeft < localRadius && distToLeft == minDist){
                        forceX += -Math.abs(this.length(this.velX,this.velY)/(0.2*distToLeft));
                        forceY += 10/(this.velY);
                        count++;
                    }
                }
                //collision with right wall (1, 0) vector out
                if(this.y > o.top-padding && this.y < o.bottom+padding){
                    if (distToRight < localRadius && distToRight == minDist){
                        forceX += Math.abs(this.length(this.velX,this.velY)/(0.2*distToRight));
                        forceY += 10/(this.velY);
                        count++;
                    }
                }

                //collision with top wall (0 -1) vector out
                if(this.x > o.left-padding && this.x < o.right+padding){
                    if (distToTop < localRadius && distToTop == minDist){
                        forceY += -Math.abs(this.length(this.velX,this.velY)/(0.2*distToTop));
                        forceX += 10/(this.velX);
                        count++;
                    }
                }

                //collision with bottom wall (0 -1) vector out
                if(this.x > o.left-padding && this.x < o.right+padding){
                    if (distToBottom < localRadius && distToBottom == minDist){
                        forceY += Math.abs(this.length(this.velX,this.velY)/(0.2*distToBottom));
                        forceX += 10/(this.velX);
                        count++;
                    }
                }
            }
        }
        if(count > 0){
            forceX /= count;
            forceY /= count;
            
            forceX = this.setMagnitude(forceX, forceY, this.maxSpeed)[0] - this.velX;
            forceY = this.setMagnitude(forceX, forceY, this.maxSpeed)[1] - this.velY;
            if(this.length(forceX, forceY) > this.maxForce){
                forceX = this.setMagnitude(forceX, forceY, this.maxForce)[0];
                forceY = this.setMagnitude(forceX, forceY, this.maxForce)[1];
            }
        }

        return [forceX, forceY]
    }

    alignment(boids,a){ // apply force in direction of average position of local flockmates
        const localRadius = 50*a;
        var forceX = 0;
        var forceY = 0;
        var totalX = 0;
        var totalY = 0;
        var count = 0;
        
        for(let b of boids){
            if (b!=this && this.withinDist(localRadius,b.x,b.y)){
                totalX += b.velX;
                totalY += b.velY;
                count++;
            }
        }
        if (count > 0){
            forceX = totalX / count;
            forceY = totalY / count;
            
            forceX = this.setMagnitude(forceX, forceY, this.maxSpeed)[0] - this.velX;
            forceY = this.setMagnitude(forceX, forceY, this.maxSpeed)[1] - this.velY;

            if(this.length(forceX, forceY) > this.maxForce){
                forceX = this.setMagnitude(forceX, forceY, this.maxForce)[0];
                forceY = this.setMagnitude(forceX, forceY, this.maxForce)[1];
            }
        }
        return [forceX, forceY]
    }

    cohesion(boids,c){ // apply force in direction of average location of local flockmates
        const localRadius = 50*c;
        var forceX = 0;
        var forceY = 0;
        var totalX = 0;
        var totalY = 0;
        var count = 0;
        
        for(let b of boids){
            if (b!=this && this.withinDist(localRadius,b.x,b.y)){
                totalX += b.x;
                totalY += b.y;
                count++;
            }
        }
        if (count > 0){
            forceX = totalX / count;
            forceY = totalY / count;
            forceX -= this.x;
            forceY -= this.y;
            forceX = this.setMagnitude(forceX, forceY, this.maxSpeed)[0] - this.velX;
            forceY = this.setMagnitude(forceX, forceY, this.maxSpeed)[1] - this.velY;

            if(this.length(forceX, forceY) > this.maxForce){
                forceX = this.setMagnitude(forceX, forceY, this.maxForce)[0];
                forceY = this.setMagnitude(forceX, forceY, this.maxForce)[1];
            }
        }
        return [forceX, forceY]
    }

    separation(boids,s){ // apply force inversely proportional to distance to local flockmates
        const localRadius = 40*s;
        var forceX = 0;
        var forceY = 0;
        var count = 0;
        
        for(let b of boids){
            if (b!=this && this.withinDist(localRadius,b.x,b.y)){
                let dist = (this.x-b.x)*(this.x-b.x) + (this.y-b.y)*(this.y-b.y);
                dist = dist ** 0.5;
                forceX += (this.x-b.x)/dist;
                forceY += (this.y-b.y)/dist;
                count++;
            }
        }

        if (count > 0){
            //forceX /= count;
            //forceY /= count;
            forceX = this.setMagnitude(forceX, forceY, this.maxSpeed)[0] - this.velX;
            forceY = this.setMagnitude(forceX, forceY, this.maxSpeed)[1] - this.velY;

            if(this.length(forceX, forceY) > this.maxForce){
                forceX = this.setMagnitude(forceX, forceY, this.maxForce)[0];
                forceY = this.setMagnitude(forceX, forceY, this.maxForce)[1];
            }
        }
        return [forceX, forceY]
    }

}
