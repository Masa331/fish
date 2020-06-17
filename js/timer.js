window.onload = function() {
  Slider.draw();
  Timer.run();
};

class Timer {
  static start;
  static intervalId;

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
    Timer.renderMinutesHint();
  }

  static addValue(value) {
    const newTimerStart = new Date(Timer.start - parseDuration(value) * MS_PER_SECOND);

    Timer.saveStart(newTimerStart);
    Timer.render();
  }

  static subtractValue(value) {

    let newTimerStart = new Date(Timer.start.getTime() + (parseDuration(value) * MS_PER_SECOND));

    if (newTimerStart > new Date()) {
      newTimerStart = new Date();
    }

    Timer.saveStart(newTimerStart);
    Timer.render();
  }

  static render(renderSlider = true) {
    const input = document.getElementById('duration');
    input.value = formatDuration(Timer.durationInSeconds());

    Timer.renderMinutesHint();

    if(renderSlider) Slider.renderByTimer();
  }

  static renderMinutesHint() {
    const minutes = document.getElementById('minutes');
    if (Timer.durationInMinutes() > 60) {
      minutes.innerHTML = `(${Math.round(Timer.durationInMinutes())}m)`;
    } else {
      minutes.innerHTML = '';
    }
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
  static width = 220;
  static height = 220;
  static centerX = 110;
  static centerY = 110;
  static radius = 100;
  static tau = 2 * Math.PI;
  static max = 60;
  static mouseDown = false;
  static lastSpinValue = null;

  static draw() {
    const svg = document.getElementById('slider');

    svg.addEventListener('mousedown', Slider.mouseTouchStart.bind(Slider), false);
    svg.addEventListener('touchstart', Slider.mouseTouchStart.bind(Slider), false);
    svg.addEventListener('mousemove', Slider.mouseTouchMove.bind(Slider), false);
    svg.addEventListener('touchmove', Slider.mouseTouchMove.bind(Slider), false);
    window.addEventListener('mouseup', Slider.mouseTouchEnd.bind(Slider), false);
    window.addEventListener('touchend', Slider.mouseTouchEnd.bind(Slider), false);
  }

  static dragToRmc(rmc) {
    const currentAngle = Slider.calculateMouseAngle(rmc) * 0.999;
    const endAngle = Slider.radiansToDegrees(currentAngle);

    const spinning = Slider.lastSpinValue !== null;
    let hoursCorrection = 0;

    let currentValue = currentAngle / Slider.tau * Slider.max;

    if (spinning) {
      if (Slider.lastSpinValue > 45 && currentValue < Slider.lastSpinValue && currentValue < 15) {
        hoursCorrection = 1;
      } else if (Slider.lastSpinValue < 15 && currentValue > Slider.lastSpinValue && currentValue > 45) {
        hoursCorrection = -1;
      }
    }

    const wholeHours = Math.floor(Timer.durationInMinutes() / MINUTE_PER_HOUR) + hoursCorrection;

    Slider.renderDurationArc(endAngle);
    Slider.renderHandle(currentAngle);

    Slider.lastSpinValue = currentValue;

    Timer.setStart(String(wholeHours * MINUTE_PER_HOUR + Math.floor(currentValue)));
    Timer.render(false);
  }

  static renderByTimer() {
    const value = Math.round(Timer.durationInMinutes() % 60);
    const endAngle = Math.floor((value / (Slider.max)) * 360);

    Slider.renderDurationArc(endAngle);
    Slider.renderHandle(endAngle * Slider.tau / 360);
  }

  static renderDurationArc(angle) {
    const path = document.querySelector('#durationPath');

    const arcDescription = Slider.describeArc(Slider.centerX, Slider.centerY, 0, angle);
    path.setAttribute('d', arcDescription);
  }

  static renderHandle(angle) {
    const handle = document.querySelector('#sliderHandle');
    const handleCenter = Slider.calculateHandleCenter(angle);
    handle.setAttribute('cx', handleCenter.x);
    handle.setAttribute('cy', handleCenter.y);
  }

  static mouseTouchStart(e) {
    if (Slider.mouseDown) return;

    Slider.mouseDown = true;
    const rmc = Slider.getRelativeMouseCoordinates(e);

    Slider.dragToRmc(rmc);
  }

  static mouseTouchMove(e) {
    if (!Slider.mouseDown) return;

    e.preventDefault();
    const rmc = Slider.getRelativeMouseCoordinates(e);
    Slider.dragToRmc(rmc);
  }

  static mouseTouchEnd() {
    if (!Slider.mouseDown) return;

    Slider.mouseDown = false;
    Slider.lastSpinValue = null;
  }

  static describeArc(x, y, startAngle, endAngle) {
    let endAngleOriginal, start, end, arcSweep, path;
    endAngleOriginal = endAngle;

    if(endAngleOriginal - startAngle === 360){
      endAngle = 359;
    }

    start = Slider.polarToCartesian(x, y, endAngle);
    end = Slider.polarToCartesian(x, y, startAngle);
    arcSweep = endAngle - startAngle <= 180 ? '0' : '1';

    if (endAngleOriginal - startAngle === 360) {
      path = [
        'M', start.x, start.y,
        'A', Slider.radius, Slider.radius, 0, arcSweep, 0, end.x, end.y, 'z'
      ].join(' ');
    } else {
      path = [
        'M', start.x, start.y,
        'A', Slider.radius, Slider.radius, 0, arcSweep, 0, end.x, end.y
      ].join(' ');
    }

    return path;
  }

  static polarToCartesian(centerX, centerY, angleInDegrees) {
    const angleInRadians = angleInDegrees * Math.PI / 180;
    const x = centerX + (Slider.radius * Math.cos(angleInRadians));
    const y = centerY + (Slider.radius * Math.sin(angleInRadians));
    return { x, y };
  }

  static calculateHandleCenter(angle) {
    const x = Slider.centerX + Math.cos(angle) * Slider.radius;
    const y = Slider.centerY + Math.sin(angle) * Slider.radius;
    return { x, y };
  }

  static getRelativeMouseCoordinates(e) {
    const svg = document.querySelector('#slider').getBoundingClientRect();

    const x = e.clientX - svg.left;
    const y = e.clientY - svg.top;
    return { x, y };
  }

  static calculateMouseAngle(rmc) {
    const angle = Math.atan2(rmc.y - Slider.centerY, rmc.x - Slider.centerX);
    if (angle > - Slider.tau / 2 && angle < - Slider.tau / 4) {
      return angle + Slider.tau * 1.25;
    } else {
      return angle + Slider.tau * 0.25;
    }
  }

  static radiansToDegrees(angle) {
    return angle / (Math.PI / 180);
  }
}

function addEntry(form) {
  event.preventDefault();
  const durationInput = form.duration;
  const descriptionInput = form.description;

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
  if (event.ctrlKey && (event.keyCode === ENTER_KEY)) {
    addEntry(event.target.form);
    return;
  }

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
