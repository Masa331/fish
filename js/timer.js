window.onload = function() {
  Timer.run();

  const slider = new Slider({});
  slider.draw();
};

class Timer {
  static start;
  static intervalId;
  // static value;

  static run() {
    Timer.intervalId = setInterval(Timer.render, MINUTE);
    const savedValue = Timer.retrieveStart();

    if (savedValue) {
      Timer.start = new Date(savedValue);
    } else {
      const now = new Date();
      Timer.saveStart(now);
    }

    Timer.render();
  }

  static durationInMiliSeconds() {
    const now = new Date();
    return now - Timer.start;
  }

  static durationInSeconds() {
    return Timer.durationInMiliSeconds() / MS_PER_SECOND;
  }

  static durationInMinutes() {
    return Timer.durationInSeconds() / SECOND_PER_MINUTE;
  }

  static reset() {
    const now = new Date();

    Timer.saveStart(now);
    Timer.render();
  }

  static setStart(value) {
    const rawDuration = value;
    const durationInSeconds = parseDuration(rawDuration);
    const newTimerStart = new Date(new Date() - durationInSeconds * MS_PER_SECOND);

    Timer.saveStart(newTimerStart);
  }

  static render() {
    const input = document.getElementById('duration');
    input.value = formatDuration(Timer.durationInSeconds());
  }

  // Private

  static saveStart(newStart) {
    Timer.start = newStart;
    localStorage.setItem(TIMER_START_STORAGE_KEY, newStart);
  }

  static retrieveStart() {
    return localStorage.getItem(TIMER_START_STORAGE_KEY)
  }
}

class Slider {
  constructor(slider) {
    this.container = document.querySelector('#app');
    this.sliderWidth = 220;
    this.sliderHeight = 220;
    this.cx = this.sliderWidth / 2; // Slider center X coordinate
    this.cy = this.sliderHeight / 2; // Slider center Y coordinate
    this.tau = 2 * Math.PI; // Tau constant
    this.arcBgFractionColor = '#D8D8D8';

    this.radius = 100;
    this.min = 0;
    this.color = '#0984e3';
    this.initialValue = 0;
    this.max = 60;

    this.mouseDown = false;

    this.spinLastValue = null;
    this.spinStartValue = null;
  }

  draw() {
    const svgContainer = document.createElement('div');
    svgContainer.classList.add('slider__data');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('height', this.sliderWidth);
    svg.setAttribute('width', this.sliderHeight);
    svgContainer.appendChild(svg);
    this.container.appendChild(svgContainer);

    const initialAngle = Math.floor( (this.initialValue / (this.max - this.min)) * 360 );

    const sliderGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    sliderGroup.setAttribute('class', 'sliderSingle');
    sliderGroup.setAttribute('transform', 'rotate(-90,' + this.cx + ',' + this.cy + ')');
    sliderGroup.setAttribute('rad', this.radius);
    svg.appendChild(sliderGroup);

    this.drawArcPath(this.arcBgFractionColor, this.radius, 360, 'bg', sliderGroup);
    this.drawArcPath(this.color, this.radius, initialAngle, 'active', sliderGroup);

    const handleCenter = this.calculateHandleCenter(initialAngle * this.tau / 360, this.radius);
    const handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    handle.setAttribute('class', 'sliderHandle');
    handle.setAttribute('cx', handleCenter.x);
    handle.setAttribute('cy', handleCenter.y);
    handle.setAttribute('r', 10);
    handle.style.fill = '#888888';
    sliderGroup.appendChild(handle);

    svgContainer.addEventListener('mousedown', this.mouseTouchStart.bind(this), false);
    svgContainer.addEventListener('touchstart', this.mouseTouchStart.bind(this), false);
    svgContainer.addEventListener('mousemove', this.mouseTouchMove.bind(this), false);
    svgContainer.addEventListener('touchmove', this.mouseTouchMove.bind(this), false);
    window.addEventListener('mouseup', this.mouseTouchEnd.bind(this), false);
    window.addEventListener('touchend', this.mouseTouchEnd.bind(this), false);
  }

  drawArcPath( color, radius, angle, type, group ) {
    const pathClass = (type === 'active') ? 'sliderSinglePathActive' : 'sliderSinglePath';

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.classList.add(pathClass);
    path.setAttribute('d', this.describeArc(this.cx, this.cy, radius, 0, angle));
    path.style.stroke = color;
    path.style.strokeWidth = 2;
    path.style.fill = 'none';
    group.appendChild(path);
  }

  redraw(rmc) {
    const activeSlider = document.querySelector('.slider__data g');
    const activePath = activeSlider.querySelector('.sliderSinglePathActive');
    const radius = +activeSlider.getAttribute('rad');
    const currentAngle = this.calculateMouseAngle(rmc) * 0.999;

    activePath.setAttribute('d', this.describeArc(this.cx, this.cy, radius, 0, this.radiansToDegrees(currentAngle)));

    const handle = activeSlider.querySelector('.sliderHandle');
    const handleCenter = this.calculateHandleCenter(currentAngle, radius);
    handle.setAttribute('cx', handleCenter.x);
    handle.setAttribute('cy', handleCenter.y);

    this.updateLegendUI(currentAngle);
  }

  updateLegendUI(currentAngle) {
    const spinning = Boolean(this.spinLastValue);
    let hoursCorrection = 0;


    const currentSliderRange = this.max - this.min;
    let currentValue = this.min + currentAngle / this.tau * currentSliderRange;

    // console.log(spinning);

    if (spinning) {
      // console.log('foo');
      const clockwise = currentValue > this.spinLastValue;

      const crossedZeroClockwise = (this.spinStartValue < this.spinLastValue) && (this.spinLastValue > currentValue) && (currentValue < this.spinStartValue);

      if (crossedZeroClockwise) {
        console.log('crossed clockwise');
      }
      // const crossedZero = 

      // if (clockwise) {
      //   console.log('spinning clockwise');
      // } else {
      //   console.log('spinning counter clockwise');
      // }
    } else {
      this.spinStartValue = currentValue;
    }

    // console.log('start value: ', this.spinStartValue);

    // console.log('spinLastValue: ', this.spinLastValue);
    // console.log('currentValue: ', currentValue);

    const wholeHours = Math.floor(Timer.durationInMinutes() / MINUTE_PER_HOUR)

    Timer.setStart(String(wholeHours * MINUTE_PER_HOUR + Math.round(currentValue)));
    Timer.render();

    this.spinLastValue = currentValue;
  }

  mouseTouchStart(e) {
    if (this.mouseDown) return;

    this.mouseDown = true;
    const rmc = this.getRelativeMouseCoordinates(e);

    this.redraw(rmc);
  }

  mouseTouchMove(e) {
    if (!this.mouseDown) return;

    e.preventDefault();
    const rmc = this.getRelativeMouseCoordinates(e);
    this.redraw(rmc);
  }

  mouseTouchEnd() {
    if (!this.mouseDown) return;

    this.mouseDown = false;
    this.spinLastValue = null;
    this.spinStartValue = null;
  }

  describeArc(x, y, radius, startAngle, endAngle) {
    let endAngleOriginal, start, end, arcSweep, path;
    endAngleOriginal = endAngle;

    if(endAngleOriginal - startAngle === 360){
      endAngle = 359;
    }

    start = this.polarToCartesian(x, y, radius, endAngle);
    end = this.polarToCartesian(x, y, radius, startAngle);
    arcSweep = endAngle - startAngle <= 180 ? '0' : '1';

    if (endAngleOriginal - startAngle === 360) {
      path = [
        'M', start.x, start.y,
        'A', radius, radius, 0, arcSweep, 0, end.x, end.y, 'z'
      ].join(' ');
    } else {
      path = [
        'M', start.x, start.y,
        'A', radius, radius, 0, arcSweep, 0, end.x, end.y
      ].join(' ');
    }

    return path;
  }

  polarToCartesian(centerX, centerY, radius, angleInDegrees) {
    const angleInRadians = angleInDegrees * Math.PI / 180;
    const x = centerX + (radius * Math.cos(angleInRadians));
    const y = centerY + (radius * Math.sin(angleInRadians));
    return { x, y };
  }

  calculateHandleCenter(angle, radius) {
    const x = this.cx + Math.cos(angle) * radius;
    const y = this.cy + Math.sin(angle) * radius;
    return { x, y };
  }

  getRelativeMouseCoordinates(e) {
    const containerRect = document.querySelector('.slider__data').getBoundingClientRect();
    const x = e.clientX - containerRect.left;
    const y = e.clientY - containerRect.top;
    return { x, y };
  }

  calculateMouseAngle(rmc) {
    const angle = Math.atan2(rmc.y - this.cy, rmc.x - this.cx);
    if (angle > - this.tau / 2 && angle < - this.tau / 4) {
      return angle + this.tau * 1.25;
    } else {
      return angle + this.tau * 0.25;
    }
  }

  radiansToDegrees(angle) {
    return angle / (Math.PI / 180);
  }
}

function addEntry(event) {
  event.preventDefault();
  const durationInput = event.target.duration;
  const descriptionInput = event.target.description;

  const guid = uuidv4();
  const date = new Date();
  const rawDuration = durationInput.value || '0';
  const duration = parseDuration(rawDuration);
  const description = descriptionInput.value || UNSPECIFIED;
  const tags = parseTags(description);

  saveEntry({ guid, date, duration, tags, description });
  descriptionInput.value = '';
  durationInput.value = '';
  Timer.reset();
}


function withoutTagChar(str) {
  return str.replace(/[#@^*]/, '');
}

function handleDescriptionChange(event) {
  const cursorPosition = event.target.selectionStart;
  const description = event.target.value;

  const descriptionToCursor = description.slice(0, cursorPosition);
  const match = descriptionToCursor.match(/[#@^*]?\w+$/);
  const suggestionElement = document.getElementById('suggestion');

  if (match) {
    const matchStart = match.index;
    DESCRIPTION_START = description.slice(0, matchStart);
    DESCRIPTION_END = description.slice(cursorPosition);


    CURRENT_WORD = descriptionToCursor.slice(match.index, cursorPosition);
    if (!TABBING) {
      STARTING_WORD = CURRENT_WORD;
    }
    if(STARTING_WORD.match(/[#@^*]\w*/)) { // starts with tag char
      TAG_SUGGESTIONS = tagsByOccurence().filter(tag => tag.startsWith(STARTING_WORD) && tag !== STARTING_WORD);
    } else {
      TAG_SUGGESTIONS = tagsByOccurence().filter(tag => withoutTagChar(tag).startsWith(withoutTagChar(STARTING_WORD)) && tag !== STARTING_WORD);
    }

    suggestionElement.textContent = TAG_SUGGESTIONS.join(' ');
  } else {
    TABBING = null;
    CURRENT_WORD = null;
    STARTING_WORD = null;
    TAG_SUGGESTIONS = [];
    DESCRIPTION_START = null;
    DESCRIPTION_END = null;
    suggestionElement.textContent = '';
  }
}

function handleTab(event) {
  if (event.shiftKey || TAG_SUGGESTIONS.isEmpty()) {
    return;
  }

  if (event.keyCode === TABKEY) {
    event.preventDefault();
    TABBING = true;

    if(TAG_SUGGESTIONS.hasAny()) {
      let index = TAG_SUGGESTIONS.indexOf(CURRENT_WORD);
      if (TAG_SUGGESTIONS.length === index + 1) {
        index = -1;
      }
      let filledValue = TAG_SUGGESTIONS[index + 1];

      if (TAG_SUGGESTIONS.length === 1) {
        filledValue = `${filledValue} `;
      }

      const newValue = DESCRIPTION_START + filledValue + DESCRIPTION_END;
      const newCursorPosition = DESCRIPTION_START.length + filledValue.length;

      event.target.value = newValue;
      event.target.setSelectionRange(newCursorPosition, newCursorPosition);
    }
  }
}

// Private

function tagsByOccurence() {
  const result = entries().map(entry => entry.tags).flat(2).reduce((memo, item) => {
    const currentValue = memo[item] || 0;
    memo[item] = currentValue + 1;
    return memo;
  }, {}).entries().sort((first, second) => {
    return second[1] > first[1];
  }).map(item => item[0]);

  return result;
}

function saveEntry(entry) {
  const newEntries = entries();
  newEntries.unshift(entry);

  localStorage.setItem(STORAGE_KEY, JSON.stringify(newEntries));
}

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function parseDuration(raw) {
  const number = parseFloat(raw.match(/\d*\.?\d*/)[0] || 0);

  if (raw.includes('s')) {
    return number;
  } else if (raw.includes('m')) {
    return number * 60;
  } else if (raw.includes('h')) {
    return number * 60 * 60;
  } else { // considering it minutes
    return number * 60;
  }
}

function parseTags(raw) {
  return raw.match(/[#@^*]\w+/g) || [];
}

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) {
    return '0s';
  } else if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds >= 60 && seconds < 3600) {
    return `${Math.round(seconds / 60)}m`;
  } else if (seconds >= 3600) {
    return `${parseFloat((seconds / 60 / 60).toFixed(2))}h`;
  } else {
    return '0s';
  }
}
