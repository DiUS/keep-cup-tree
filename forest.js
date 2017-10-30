(function () {

  var canvas = document.getElementById('forest');
  var canvasWidth = canvas.width;
  var canvasHeight = canvas.height;
  var canvasContext = canvas.getContext('2d');

  var radius = 50;
  var radiusSquared = radius * radius;
  var R = 3 * radiusSquared;

  var cellSize = radius * Math.SQRT1_2;
  var gridWidth = Math.ceil(canvasWidth / cellSize);
  var gridHeight = Math.ceil(canvasHeight / cellSize);
  var gridCells = new Array(gridWidth * gridHeight);

  var rejectThreshold = 30;
  var activePoints = [];

  function getRandomFloat(min, max) {
    return min + Math.random() * (max - min);
  }

  function getRandomInt(min, max) {
    return getRandomFloat(min, max) | 0;
  }

  function renderPoint(point) {
    canvasContext.beginPath();
    canvasContext.arc(point[0], point[1], 2, 0, 2 * Math.PI, true);
    canvasContext.fill();
  }

  function addPoint(point) {
    var gridCol = point[0] / cellSize | 0;
    var gridRow = point[1] / cellSize | 0;

    renderPoint(point);
    activePoints.push(point);
    gridCells[gridRow * gridWidth + gridCol] = point;
  }

  function getAnyActivePoint() {
    return activePoints[getRandomInt(0, activePoints.length)];
  }

  function generateCandidateNearPoint(point) {
    var r = getRandomFloat(radius, 2 * radius);
    var a = getRandomFloat(0, 2 * Math.PI);
    var x = point[0] + r * Math.cos(a);
    var y = point[1] + r * Math.sin(a);

    // Try again if out of bounds
    if (x < 0 || x > canvasWidth || y < 0 || y > canvasHeight) {
      return generateCandidateNearPoint(point);
    }
    return [x, y];
  }

  addPoint([getRandomFloat(0, canvasWidth), getRandomFloat(0, canvasHeight)]);

  var start = getAnyActivePoint();

  for (var i = 0; i < 1000; i++) {
    renderPoint(generateCandidateNearPoint(start));
  }



}());
