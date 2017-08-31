var seed = 256;
function random() {
    var x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

var power = 6;
var maxCups = Math.pow(2, power - 1);
var cupsSaved = 16;
var areAllCupsSaved = cupsSaved >= maxCups;

function getLeafColor(i) {
  return i < cupsSaved 
    ? 'hsla($hue,80%,50%,.5)'.replace('$hue', 80 + 20 * random())
    : 'hsla(0,100%,100%,0.01)';
}

var w = c.width = window.innerWidth,
    h = c.height = window.innerHeight,
    ctx = c.getContext( '2d' ),
    
    opts = {
      speed: 1,
      splitSizeProbabilityMultiplier: 1/1000,
      maxIterations: power,
      startSize: 20,
      baseSizeMultiplier: .7,
      addedSizeMultiplier: .2,
      baseAngleVariation: -Math.PI / 16,
      addedAngleVariation: Math.PI / 8,
      angleVariationIterationMultiplier: .8,
      
      baseLeafSize: 20,
      addedLeafSize: 15,
      
      rotYVel: .01,
      focalLength: 250,
      vanishPoint: {
        x: w / 2,
        y: h / 2
      },
      translations: {
        x: 0,
        y: 200,
        z: 400
      }
    },
    
    rotY = 0,
    rotYsin = 0,
    rotYcos = 1,
    
    lines = [];

function Line( parent ){
  
  this.iteration = parent.iteration + 1;
  this.start = parent.end;
  this.angle = {
    a: parent.angle.a + this.iteration * opts.angleVariationIterationMultiplier * ( opts.baseAngleVariation + opts.addedAngleVariation * random() ),
    b: parent.angle.b + this.iteration * opts.angleVariationIterationMultiplier * ( opts.baseAngleVariation + opts.addedAngleVariation * random() ),
  };
  this.size = ( opts.baseSizeMultiplier + opts.addedSizeMultiplier * random() ) * parent.size;
  
  this.color = 'hsla(hue,80%,50%,alp)'
    .replace( 'hue',  ( 1 - this.iteration / opts.maxIterations ) * 40 )
    .replace( 'alp', 1 - ( this.iteration / opts.maxIterations ) * .9 );
  
  var sinA = Math.sin( this.angle.a ),
      sinB = Math.sin( this.angle.b ),
      cosA = Math.cos( this.angle.a ),
      cosB = Math.cos( this.angle.b );
      
  this.speed = { 
        x: opts.speed * cosA * sinB,
        y: opts.speed * sinA * sinB,
        z: opts.speed * cosB
      };
  
  
  this.end = this.closest = new Point(
    this.start.x,
    this.start.y,
    this.start.z
  );
  
  this.done = false;
  this.time = 0;
}
Line.prototype.update = function(){
  
  if( !this.done ){
  
    this.end.x += this.speed.x;
    this.end.y += this.speed.y;
    this.end.z += this.speed.z;
    
    this.time += .1 * opts.speed;
    
    if( random() < this.size * opts.splitSizeProbabilityMultiplier || this.time > this.size ){
      
      if( this.iteration < opts.maxIterations ){
        
        lines.push( new Line( this ) );
        lines.push( new Line( this ) );
      } else {
         
        lines.push( new Leaf( this ) );
      }
      
      this.done = true;
    }
  }
  
  // some lines can share their start
  if( this.start.hasntCalculatedScreen )
    this.start.calculateScreen();
  
  // but not their end
  this.end.calculateScreen();
  
  this.closest = this.start;
  if( this.end.transformed.z < this.start.transformed.z )
    this.closest = this.end;
}
Line.prototype.render = function(){
  
  ctx.strokeStyle = this.color;
  ctx.lineWidth = this.size * this.start.screen.scale;
  ctx.beginPath();
  ctx.moveTo( this.start.screen.x, this.start.screen.y );
  ctx.lineTo( this.end.screen.x, this.end.screen.y );
  ctx.stroke();
  
  this.start.hasntCalculatedScreen = this.end.hasntCalculatedScreen = true;
}

let leafNumber = 0;
function Leaf( parent ){
  this.point = this.closest = parent.end;
  this.size = opts.baseLeafSize + opts.addedLeafSize * random();
  this.time = -Math.PI / 2;
  this.speed = .03 + .03 * random();
  this.color = getLeafColor(leafNumber++);
  this.sparkleOffset = Math.random() * 100;
}
Leaf.prototype.update = function(){
  
  this.time += this.speed;
}

Leaf.prototype.render = function(){
  if (areAllCupsSaved) {
    ctx.fillStyle = 'hsla(' + ((this.sparkleOffset + this.time * 100) % 360) + ',80%,50%,.5';
  } else {
    ctx.fillStyle = this.color;
  }

  var size = ( Math.sin( this.time ) / 4 + .75 ) * this.size * this.point.screen.scale;
  ctx.fillRect ( 
    this.point.screen.x - size / 2,
    this.point.screen.y - size / 2,
    size, size
  )
}

function Point( x, y, z ){
  
  this.x = x;
  this.y = y;
  this.z = z;
  
  this.screen = {};
  this.transformed = {};
  this.hasntCalculatedScreen = true;
}
Point.prototype.calculateScreen = function(){
  
  var x = this.x,
      y = this.y,
      z = this.z;
  
  // rotate around Y
  var X = x;
  x = x * rotYcos - z * rotYsin;
  z = z * rotYcos + X * rotYsin;
  
  // translate
  x += opts.translations.x;
  y += opts.translations.y;
  z += opts.translations.z;
  
  // I only need the z for now
  this.transformed.z = z;
  
  this.screen.scale = opts.focalLength / z;
  this.screen.x = opts.vanishPoint.x + x * this.screen.scale;
  this.screen.y = opts.vanishPoint.y + y * this.screen.scale;
  
  this.hasntCalculatedScreen = false;
}

function anim(){
  
  window.requestAnimationFrame( anim );
  
  ctx.fillStyle = 'white';
  ctx.fillRect( 0, 0, w, h );
  
  rotY += opts.rotYVel;
  rotYcos = Math.cos( rotY );
  rotYsin = Math.sin( rotY );
  
  lines.map( function( line ){ line.update(); } );
  lines.sort( function( a, b ){ return b.closest.transformed.z - a.closest.transformed.z } );
  lines.map( function( line ){ line.render(); } );
}

lines.push( new Line(
  { 
    end: new Point( 0, 0, 0 ),
    angle: { a: Math.PI/2, b: -Math.PI / 2 },
    size: opts.startSize,
    iteration: 0
  }
) );

anim();

window.addEventListener( 'click', function(){
  lines.length = 0;
  
  lines.push( new Line(
    { 
      end: new Point( 0, 0, 0 ),
      angle: { a: Math.PI/2, b: -Math.PI / 2 },
      size: opts.startSize,
      iteration: 0
    }
  ) );
})
window.addEventListener( 'resize', function(){
  
  w = c.width = window.innerWidth;
  h = c.height = window.innerHeight;
  
  opts.vanishPoint.x = w / 2;
  opts.vanishPoint.y = h / 2;
})