window.onload = function() {
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

  static reset() {
    const now = new Date();

    Timer.saveStart(now);
    Timer.render();
  }

  static setStart(event) {
    const rawDuration = event.target.value;
    const durationInSeconds = parseDuration(rawDuration);
    const newTimerStart = new Date(new Date() - durationInSeconds * MS_PER_SECOND);

    Timer.saveStart(newTimerStart);
  }

  static render() {
    const now = new Date();
    const timePassed = now - Timer.start;

    const input = document.getElementById('duration');
    input.value = formatDuration(timePassed / MS_PER_SECOND);
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
