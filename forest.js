(function () {

  var canvas = document.getElementById('forest');
  var canvasWidth = canvas.width;
  var canvasHeight = canvas.height;
  var canvasContext = canvas.getContext('2d');

  var radius = 50;
  var radiusSquared = radius * radius;

  var cellSize = radius * Math.SQRT1_2;
  var gridWidth = Math.ceil(canvasWidth / cellSize);
  var gridHeight = Math.ceil(canvasHeight / cellSize);
  var gridCells = new Array(gridWidth * gridHeight);

  var rejectThreshold = 30;
  var activePoints = [];
  var pointRadius = 5;

  function drawLine(startPoint, endPoint) {
    canvasContext.beginPath();
    canvasContext.moveTo(Math.round(startPoint[0]), Math.round(startPoint[1]));
    canvasContext.lineTo(Math.round(endPoint[0]), Math.round(endPoint[1]));
    canvasContext.stroke();
  }

  function renderGrid() {
    var i;
    for (i = 1; i < gridWidth; i++) {
      drawLine([cellSize * i, 0], [cellSize * i, gridHeight * cellSize]);
    }
    for (i = 1; i < gridHeight; i++) {
      drawLine([0, cellSize * i], [gridWidth * cellSize, cellSize * i]);
    }
  }

  function getRandomFloat(min, max) {
    return min + Math.random() * (max - min);
  }

  function getRandomInt(min, max) {
    return getRandomFloat(min, max) | 0;
  }

  function renderPoint(point) {
    canvasContext.beginPath();
    canvasContext.arc(point[0], point[1], pointRadius, 0, 2 * Math.PI, true);
    canvasContext.fill();
  }

  function getGridAddressForPoint(point) {
    var gridCol = point[0] / cellSize | 0;
    var gridRow = point[1] / cellSize | 0;
    return [gridCol, gridRow];
  }

  function addPoint(point) {
    var address = getGridAddressForPoint(point);

    renderPoint(point);
    activePoints.push(point);
    gridCells[address[0] + address[1] * gridWidth] = point;
  }

  function deactivatePoint(point) {
    activePoints.splice(activePoints.indexOf(point), 1);
  }

  function getAnyActivePoint() {
    if (activePoints.length <= 0) {
      return null;
    }
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

  function getNeighborsOfPoint(point) {
    var address = getGridAddressForPoint(point);
    var addressCol = address[0];
    var addressRow = address[1];
    var neighbors = [];

    for (var i = Math.max(addressCol - 2, 0); i < Math.min(addressCol + 3, gridWidth); i++) {
      for (var j = Math.max(addressRow - 2, 0); j < Math.min(addressRow + 3, gridHeight); j++) {
        var neighbor = gridCells[i + j * gridWidth];
        if (neighbor) {
          neighbors.push(neighbor);
        }
      }
    }

    return neighbors;
  }

  function isFar(point) {
    var neighbors = getNeighborsOfPoint(point);
    var nlen = neighbors.length;
    for (var i = 0; i < nlen; i++) {
      if (
        Math.pow(point[0] - neighbors[i][0], 2)
        + Math.pow(point[1] - neighbors[i][1], 2)
        < radiusSquared
      ) {
        return false;
      }
    }
    return true;
  }

  function getNextFromPoint(point) {
    var candidate;
    for (var attempt = 0; attempt < rejectThreshold; attempt++) {
      candidate = generateCandidateNearPoint(point);
      if (isFar(candidate)) {
        return candidate;
      }
    }
    return null;
  }

  // ---------------------------------------------------------------------------

  renderGrid();
  addPoint([getRandomFloat(0, canvasWidth), getRandomFloat(0, canvasHeight)]);

  function step() {
    var start = getAnyActivePoint();
    if (start) {
      var next = getNextFromPoint(start);
      if (!next) {
        deactivatePoint(start);
        return step();
      }
      addPoint(next);
      return true
    }
    return false;
  }

  var done = false;
  var totalTime;
  var startTime = performance.now();
  function animate() {
    if (!done) {
      requestAnimationFrame(animate);
      for (var i = 0; i < 3; i++) {
        if (!step()) {
          totalTime = performance.now() - startTime;
          console.log('total time:', totalTime);
          console.log('cell count:', gridCells.length);
          console.log('dots per s:', 1000 * gridCells.length / totalTime);
          done = true;
          return;
        }
      }
    }
  }

  animate();

}());
