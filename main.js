(function () {
  function isShallowEql(a, b) {
    if (a === b) return true;
    if (!a || !b) return false;

    var aKeys = Object.keys(a).sort();
    if (aKeys.join(',') !== Object.keys(b).sort().join(',')) return false;

    for (var i = 0; i < aKeys.length; i++) {
      if (a[aKeys[i]] !== b[aKeys[i]]) return false;
    }
    return true;
  }

  function configReducer(_state, _action) {
    var state = _state || {
      seed: 1,
      power: 6,
      leafHue: 80,
      trunkSL: '80%,50%'
    };

    var action = _action || {};
    switch (action.type) {
      case '@@keep-cup-tree/config/SET_CONFIG':
        return Object.assign({}, state, action.config);
      default:
        return state;
    }
  }

  function treeReducer(_state, _action) {
    var state = _state || {
      status: 'ready',
      leafCount: 0
    };
    var action = _action || {};
    switch (action.type) {
      case '@@keep-cup-tree/tree/SET_STATUS':
        return Object.assign({}, state, { status: action.status });
      case '@@keep-cup-tree/tree/SET_LEAF_COUNT':
        return Object.assign({}, state, { leafCount: action.leafCount });
      default:
        return state;
    }
  }

  function setLeafCount(leafCount) {
    return {
      type: '@@keep-cup-tree/tree/SET_LEAF_COUNT',
      leafCount: leafCount
    };
  }

  var store = Redux.createStore(Redux.combineReducers({
    config: configReducer,
    tree: treeReducer
  }));

  function start() {
    var config = store.getState().config;

    var seed = config.seed;
    var maxCups = Math.pow(2, config.power - 1);

    function areAllCupsSaved() {
      return store.getState().tree.leafCount >= maxCups;
    }

    function random() {
      var x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    }

    var w = c.width = window.innerWidth;
    var h = c.height = window.innerHeight;
    var ctx = c.getContext('2d');

    var opts = {
      speed: 1,
      splitSizeProbabilityMultiplier: 1/1000,
      maxIterations: config.power,
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
    };

    var rotY = 0;
    var rotYsin = 0;
    var rotYcos = 1;
    var lines = [];
    var healthBar = new HealthBar();

    function Line(parent) {
      this.iteration = parent.iteration + 1;
      this.start = parent.end;
      this.angle = {
        a: parent.angle.a + this.iteration * opts.angleVariationIterationMultiplier * ( opts.baseAngleVariation + opts.addedAngleVariation * random() ),
        b: parent.angle.b + this.iteration * opts.angleVariationIterationMultiplier * ( opts.baseAngleVariation + opts.addedAngleVariation * random() ),
      };
      this.size = ( opts.baseSizeMultiplier + opts.addedSizeMultiplier * random() ) * parent.size;
      this.color = ('hsla(hue,' + config.trunkSL + ',alp)')
        .replace( 'hue',  ( 1 - this.iteration / opts.maxIterations ) * 40 )
        .replace( 'alp', 1 - ( this.iteration / opts.maxIterations ) * .9 );

      var sinA = Math.sin( this.angle.a );
      var sinB = Math.sin( this.angle.b );
      var cosA = Math.cos( this.angle.a );
      var cosB = Math.cos( this.angle.b );

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

    Line.prototype.update = function () {
      if (!this.done) {
        this.end.x += this.speed.x;
        this.end.y += this.speed.y;
        this.end.z += this.speed.z;
        this.time += .1 * opts.speed;

        if (random() < this.size * opts.splitSizeProbabilityMultiplier || this.time > this.size) {
          if (this.iteration < opts.maxIterations) {
            lines.push(new Line(this));
            lines.push(new Line(this));
          } else {
            lines.push(new Leaf(this));
          }

          this.done = true;
        }
      }

      // some lines can share their start
      if (this.start.hasntCalculatedScreen) {
        this.start.calculateScreen();
      }

      // but not their end
      this.end.calculateScreen();

      this.closest = this.start;
      if (this.end.transformed.z < this.start.transformed.z) {
        this.closest = this.end;
      }
    };

    Line.prototype.render = function () {
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.size * this.start.screen.scale;
      ctx.beginPath();
      ctx.moveTo( this.start.screen.x, this.start.screen.y );
      ctx.lineTo( this.end.screen.x, this.end.screen.y );
      ctx.stroke();

      this.start.hasntCalculatedScreen = this.end.hasntCalculatedScreen = true;
    };

    var leafNumber = 0;
    function Leaf(parent) {
      this.leafNumber = leafNumber++;
      this.point = this.closest = parent.end;
      this.size = opts.baseLeafSize + opts.addedLeafSize * random();
      this.time = -Math.PI / 2;
      this.speed = .03 + .03 * random();
      this.color = 'hsla($hue,80%,50%,.5)'.replace('$hue', config.leafHue + 20 * random());
      this.sparkleOffset = Math.random() * 100;
    }

    Leaf.prototype.update = function () {
      this.time += this.speed;
    };

    Leaf.prototype.render = function () {
      if (areAllCupsSaved() && healthBar.health === 1) {
        ctx.fillStyle = 'hsla(' + ((this.sparkleOffset + this.time * 100) % 360) + ',80%,50%,.5';
      } else if (this.leafNumber < store.getState().tree.leafCount) {
        ctx.fillStyle = this.color;
      } else {
        ctx.fillStyle = 'hsla(0,100%,100%,0.01)';
      }

      var size = (Math.sin(this.time) / 4 + .75) * this.size * this.point.screen.scale;
      ctx.fillRect(
        this.point.screen.x - size / 2,
        this.point.screen.y - size / 2,
        size, size
      );
    };

    function Point(x, y, z) {
      this.x = x;
      this.y = y;
      this.z = z;

      this.screen = {};
      this.transformed = {};
      this.hasntCalculatedScreen = true;
    }

    Point.prototype.calculateScreen = function () {
      var x = this.x;
      var y = this.y;
      var z = this.z;

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
    };

    function HealthBar() {
      this.baseWidth = 300;
      this.baseHeight = 30;
      this.heightOffset = 200;
      this.cornerRadius = 10;
      this.time = 0;
      this.pulse = 70;
      this.health = 0;
    }

    HealthBar.prototype.update = function () {
      this.time += .1 * opts.speed;
      var healthTarget = Math.min(leafNumber / maxCups, Math.min(store.getState().tree.leafCount, maxCups) / maxCups);
      if (healthTarget <= .1) {
        this.health = .1 + (Math.sin(3 * this.time / Math.PI) / 2 + .5) / 30;
      } else if (healthTarget - this.health > .001) {
        this.health += (healthTarget - this.health) * .2;
      } else {
        this.health = healthTarget;
      }
    };

    HealthBar.prototype.drawRoundedRect = function (type, x, y, width, height) {
      var r = this.cornerRadius * height / this.baseHeight;
      var left = x;
      var right = Math.max(x + width, x + 2 * r);
      var top = y;
      var bottom = y + height;

      ctx.beginPath();
      ctx.moveTo(left + r, top);
      ctx.lineTo(right - r, top);
      ctx.quadraticCurveTo(right, top, right, top + r);
      ctx.lineTo(right, bottom - r);
      ctx.quadraticCurveTo(right, bottom, right - r, bottom);
      ctx.lineTo(left + r, bottom);
      ctx.quadraticCurveTo(left, bottom, left, bottom - r);
      ctx.lineTo(left, top + r);
      ctx.quadraticCurveTo(left, top, left + r, top);
      ctx.closePath();

      switch (type) {
        case 'stroke':
          ctx.stroke();
          break;
        case 'fill':
        default:
          ctx.fill();
          break;
      }
    };

    HealthBar.prototype.render = function () {
      var pulseScale;

      pulseScale = (Math.cos(2 * this.time / Math.PI) / this.pulse + (this.pulse - 1) / this.pulse);
      ctx.strokeStyle = 'hsla(0, 100%, 0%, .5)';
      ctx.fillStyle = 'rgba(0, 0, 0, 0)';
      ctx.lineWidth = 2;
      this.drawRoundedRect('stroke',
        (w - this.baseWidth * pulseScale) / 2,
        (h - this.baseHeight * pulseScale) / 2 + this.heightOffset,
        this.baseWidth * pulseScale,
        this.baseHeight * pulseScale
      );

      var pad = 5;
      pulseScale = (Math.cos((2 * this.time - 1) / Math.PI) / this.pulse + (this.pulse - 1) / this.pulse);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0)';
      ctx.fillStyle = areAllCupsSaved() && this.health === 1
        ? 'hsla(' + (this.time * 100 % 360) + ',80%,50%,.5)'
        : 'hsla(' + (config.leafHue + 20 * Math.random()) + ',80%,50%,.75)';
      ctx.lineWidth = 0;
      this.drawRoundedRect('fill',
        (w - this.baseWidth * pulseScale) / 2 + pad,
        (h - this.baseHeight * pulseScale) / 2 + this.heightOffset + pad,
        this.baseWidth * pulseScale * this.health - 2 * pad,
        this.baseHeight * pulseScale - 2 * pad
      );
    };

    function anim() {
      window.requestAnimationFrame(anim);

      ctx.clearRect(0, 0, w, h);

      rotY += opts.rotYVel;
      rotYcos = Math.cos(rotY);
      rotYsin = Math.sin(rotY);

      lines.map(function (line) {
        line.update();
      });

      lines.sort(function (a, b) {
        return b.closest.transformed.z - a.closest.transformed.z
      });

      lines.map(function (line) {
        line.render();
      });

      healthBar.update();
      healthBar.render();
    }

    lines.push(new Line({
      end: new Point(0, 0, 0),
      angle: {
        a: Math.PI / 2,
        b: -Math.PI / 2
      },
      size: opts.startSize,
      iteration: 0
    }));

    anim();

    window.addEventListener('resize', function () {
      w = c.width = window.innerWidth;
      h = c.height = window.innerHeight;

      opts.vanishPoint.x = w / 2;
      opts.vanishPoint.y = h / 2;
    });
  }

  if (!window.fetch) {
    alert('Your browser does not support fetch!');
    throw new Error('No fetch support');
  }

  store.dispatch({
    type: '@@keep-cup-tree/tree/SET_STATUS',
    status: 'loading'
  });

  function startPolling() {
    setInterval(function () {
      fetch('https://74bm6fm1bf.execute-api.ap-southeast-2.amazonaws.com/prod/keepCupTreeLeafCount')
        .then(function (resp) {
          return resp.json();
        })
        .then(function (json) {
          if (json.result.cupsSaved !== store.getState().tree.leafCount) {
            store.dispatch(setLeafCount(json.result.cupsSaved));
          }
        });
    }, 1000 * 60);
  }

  fetch('https://74bm6fm1bf.execute-api.ap-southeast-2.amazonaws.com/prod/keepCupTreeLeafCount')
    .then(function (resp) {
      return resp.json();
    })
    .then(function (json) {
      if (json.ok) {
        store.dispatch({
          type: '@@keep-cup-tree/tree/SET_STATUS',
          status: 'success'
        });

        store.dispatch({
          type: '@@keep-cup-tree/config/SET_CONFIG',
          config: json.result
        });

        store.dispatch(setLeafCount(json.result.cupsSaved));

        startPolling();

        start();
      } else {
        return Promise.reject(json);
      }
    })
    .catch(function (e) {
      store.dispatch({
        type: '@@keep-cup-tree/tree/SET_STATUS',
        status: 'error'
      });

      console.error(e);
    });
}());
