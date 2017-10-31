(function () {

  var canvas = document.getElementById('forest');
  var canvasWidth = canvas.width;
  var canvasHeight = canvas.height;
  var canvasContext = canvas.getContext('2d');

  var radius = 50;

  var cellSize = radius * Math.SQRT1_2;
  var gridWidth = Math.ceil(canvasWidth / cellSize);
  var gridHeight = Math.ceil(canvasHeight / cellSize);
  var gridCells = new Array(gridWidth * gridHeight);

  var randomSeed = 1;
  var rejectThreshold = 30;
  var activePoints = [];
  var allPoints = [];
  var pointRadius = radius / 3;

  function distanceSq(pointA, pointB) {
    return Math.pow(pointA[0] - pointB[0], 2)
      + Math.pow(pointA[1] - pointB[1], 2);
  }

  function isPointsWithinRadius(pointA, pointB, r) {
    return distanceSq(pointA, pointB) < Math.pow(r, 2);
  }

  function getRandomFloat(min, max) {
    var x = Math.sin(randomSeed++) * 10000;
    return min + (x - Math.floor(x)) * (max - min);
  }

  function getRandomInt(min, max) {
    return getRandomFloat(min, max) | 0;
  }

  function renderPoint(point, color, _r) {
    var r = _r || pointRadius;
    canvasContext.fillStyle = color || '#000';
    canvasContext.beginPath();
    canvasContext.arc(point[0], point[1], r, 0, 2 * Math.PI, true);
    canvasContext.fill();
  }

  function getGridAddressForPoint(point) {
    var gridCol = point[0] / cellSize | 0;
    var gridRow = point[1] / cellSize | 0;
    return [gridCol, gridRow];
  }

  function addPoint(point) {
    var address = getGridAddressForPoint(point);
    activePoints.push(point);
    allPoints.push(point);
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

  function getNeighborsOfPoint(point, _searchRadius) {
    var searchRadius = _searchRadius || 1;
    var address = getGridAddressForPoint(point);
    var addressCol = address[0];
    var addressRow = address[1];
    var neighbors = [];

    for (var i = Math.max(addressCol - searchRadius, 0); i < Math.min(addressCol + searchRadius + 1, gridWidth); i++) {
      for (var j = Math.max(addressRow - searchRadius, 0); j < Math.min(addressRow + searchRadius + 1, gridHeight); j++) {
        var neighbor = gridCells[i + j * gridWidth];
        if (neighbor) {
          neighbors.push(neighbor);
        }
      }
    }

    return neighbors;
  }

  function isFar(point) {
    var neighbors = getNeighborsOfPoint(point, 2);
    var nlen = neighbors.length;
    for (var i = 0; i < nlen; i++) {
      if (isPointsWithinRadius(point, neighbors[i], radius)) {
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

  addPoint([canvasWidth / 2, canvasHeight / 2]);
  while (true) {
    var start = getAnyActivePoint();
    if (!start) {
      break;
    }

    var next = getNextFromPoint(start);
    if (next) {
      addPoint(next);
    } else {
      deactivatePoint(start);
    }
  }

  var state = {
    nearestPoint: null,
    completeTreeCount: 200
  };

  function render() {
    var greenStart = 16 * 7 + 9;
    var q = (255 - greenStart) / state.completeTreeCount;

    canvasContext.clearRect(0, 0, canvasWidth, canvasHeight);
    allPoints.forEach(function (point, i) {
      if (i <= state.completeTreeCount) {
        if (point == state.nearestPoint) {
          renderPoint(point, '#ff0000');
        } else {
          renderPoint(point, 'rgb(0, ' + Math.round(greenStart + q * i) + ', 0)');
        }
      } else {
        renderPoint(point, '#eeffee', pointRadius / 2);
      }
    });
  }

  render();

  canvas.addEventListener('mousemove', function (e) {
    var rect = canvas.getBoundingClientRect();
    var mousePoint = [
      (e.pageX - rect.left - document.body.scrollLeft) * 2,
      (e.pageY - rect.top - document.body.scrollTop) * 2
    ];

    var nearestPoint = getNeighborsOfPoint(mousePoint)
      .reduce(function (nearest, value) {
        if (!nearest ||
          distanceSq(mousePoint, value) < distanceSq(mousePoint, nearest)
        ) {
          return value;
        }
        return nearest;
      }, null);

    if (isPointsWithinRadius(nearestPoint, mousePoint, radius)) {
      state.nearestPoint = nearestPoint;
      render();
    }
  });

}());
