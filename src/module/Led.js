+(function (factory) {
  if (typeof exports === 'undefined') {
    factory(webduino || {});
  } else {
    module.exports = factory;
  }
}(function (scope) {
  'use strict';

  var Pin = scope.Pin,
    Module = scope.Module,
    proto;

  function Led(board, pin, driveMode) {
    Module.call(this);

    this._board = board;
    this._pin = pin;
    this._driveMode = driveMode || Led.SOURCE_DRIVE;
    this._supportsPWM = undefined;
    this._blinkTimer = null;
    this._state = this.LED_STATE.off;
    this._millisec = null;

    if (this._driveMode === Led.SOURCE_DRIVE) {
      this._onValue = 1;
      this._offValue = 0;
    } else if (this._driveMode === Led.SYNC_DRIVE) {
      this._onValue = 0;
      this._offValue = 1;
    } else {
      throw new Error('error: driveMode should be Led.SOURCE_DRIVE or Led.SYNC_DRIVE');
    }

    if (pin.capabilities[Pin.PWM]) {
      board.setDigitalPinMode(pin.number, Pin.PWM);
      this._supportsPWM = true;
    } else {
      board.setDigitalPinMode(pin.number, Pin.DOUT);
      this._supportsPWM = false;
    }
  }

  function checkPinState(self, pin, state, callback) {
    self._board.queryPinState(pin, function (pin) {
      if (pin.state === state) {
        callback.call(self);
      }
    });
  }

  Led.prototype = proto = Object.create(Module.prototype, {

    constructor: {
      value: Led
    },

    intensity: {
      get: function () {
        return this._pin.value;
      },
      set: function (val) {
        if (!this._supportsPWM) {
          if (val < 0.5) {
            val = 0;
          } else {
            val = 1;
          }
        }

        if (this._driveMode === Led.SOURCE_DRIVE) {
          this._pin.value = val;
        } else if (this._driveMode === Led.SYNC_DRIVE) {
          this._pin.value = 1 - val;
        }
      }
    }

  });

  proto.on = function (callback) {
    if (this._state === this.LED_STATE.blink) {
      this.stopBlink();
    }

    this._pin.value = this._onValue;
    this._state = this.LED_STATE.on;

    if (typeof callback === 'function') {
      checkPinState(this, this._pin, this._pin.value, callback);
    }
  };

  proto.off = function (callback) {
    if (this._state === this.LED_STATE.blink) {
      this.stopBlink();
    }

    this._pin.value = this._offValue;
    this._state = this.LED_STATE.off;

    if (typeof callback === 'function') {
      checkPinState(this, this._pin, this._pin.value, callback);
    }
  };

  proto.toggle = function (callback) {

    if (this._state === this.LED_STATE.blink) {
      this.stopBlink();
      return;
    }

    this._pin.value = 1 - this._pin.value;

    if (this._pin.value === 0) {
      this._state = this.LED_STATE.off;
    } else {
      this._state = this.LED_STATE.on;
    }

    if (typeof callback === 'function') {
      checkPinState(this, this._pin, this._pin.value, callback);
    }
  };

  proto.blink = function (ms, callback) {
    this.stopBlink();
    this._state = this.LED_STATE.blink;
    var intMS = parseInt(ms);
    this._millisec = (isNaN(intMS) || intMS <= 0) ? 1000 : intMS;

    if (typeof callback === 'function') {
      checkPinState(this, this._pin, this._pin.value, callback);
    }

    blinkNext(this);
  };

  function blinkNext(self) {
    self._pin.value = 1 - self._pin.value;
    self._blinkTimer = setTimeout(function () {
      blinkNext(self);
    }, self._millisec);
  }

  proto.stopBlink = function () {
    if (this._blinkTimer !== null) {
      clearTimeout(this._blinkTimer);
      this._blinkTimer = null;
      this._millisec = null;
      this._state = this.LED_STATE.off;
      this.off();
    }
  };

  proto.getState = function () {
    return this._state;
  };

  proto.setInterval = function (ms) {
    var intMS = parseInt(ms);
    this._millisec = (isNaN(intMS) || intMS <= 0) ? 1000 : intMS;
  };

  proto.getInterval = function () {
    return this._millisec;
  };

  proto.LED_STATE = {
    off: 'off',
    on: 'on',
    blink: 'blink'
  };

  Led.SOURCE_DRIVE = 0;
  Led.SYNC_DRIVE = 1;

  scope.module.Led = Led;
}));
