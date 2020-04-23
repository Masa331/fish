window.onload = function() {
  setInterval(incrementTimer, MINUTE);
  incrementTimer();
  document.getElementById('date').valueAsDate = new Date();
};

function timerStart() {
  const rawValue = localStorage.getItem(TIMER_START_STORAGE_KEY);

  if (rawValue) {
    return new Date(rawValue);
  } else {
    const now = new Date();
    setTimerStart(now);
    return now;
  }
}

function setTimerStart(newStart) {
  localStorage.setItem(TIMER_START_STORAGE_KEY, newStart);
}

function isTimerEmpty() {
  const rawValue = localStorage.getItem(TIMER_START_STORAGE_KEY);
  return rawValue === null;
}

function addEntry(event) {
  event.preventDefault();
  const durationInput = event.target.duration;
  const descriptionInput = event.target.description;
  const dateInput = event.target.date;

  const guid = uuidv4();
  const date = dateInput.value ? new Date(dateInput.value) : new Date();
  const rawDuration = durationInput.value || '0';
  const duration = parseDuration(rawDuration);
  const description = descriptionInput.value || UNSPECIFIED;
  const tags = parseTags(description);

  saveEntry({ guid, date, duration, tags, description });
  descriptionInput.value = '';
  durationInput.value = '';
  setTimerStart(new Date());
  incrementTimer();
}

function updateTimerStart(event) {
  const rawDuration = event.target.value;
  const durationInSeconds = parseDuration(rawDuration);
  const newTimerStart = new Date(new Date() - durationInSeconds * MS_PER_SECOND);

  setTimerStart(newTimerStart);
}

function handleDescriptionChange(event) {
  const cursorPosition = event.target.selectionStart;
  const description = event.target.value;

  const descriptionToCursor = description.slice(0, cursorPosition);
  const match = descriptionToCursor.match(/[#@^*]\w+$/);
  const suggestionElement = document.getElementById('suggestion');

  if (match) {
    const matchStart = match.index;
    DESCRIPTION_START = description.slice(0, matchStart);
    DESCRIPTION_END = description.slice(cursorPosition);

    const tagStart = descriptionToCursor.slice(match.index, cursorPosition);
    TAG_SUGGESTIONS = tagsByOccurence().filter(tag => tag.startsWith(tagStart) && tag !== tagStart);

    suggestionElement.textContent = TAG_SUGGESTIONS.join(' ');
  } else {
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

    if(TAG_SUGGESTIONS.hasAny()) {
      let filledValue = longest_common_starting_substring(TAG_SUGGESTIONS);
      if (TAG_SUGGESTIONS.length === 1) {
        filledValue = `${filledValue} `;
      }

      const newValue = DESCRIPTION_START + filledValue + DESCRIPTION_END;
      const newCursorPosition = DESCRIPTION_START.length + filledValue.length;

      event.target.value = newValue;
      event.target.setSelectionRange(newCursorPosition,newCursorPosition);
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

function incrementTimer() {
  const currentDate = new Date();
  const difference = currentDate - timerStart();

  const input = document.getElementById('duration');
  input.value = formatDuration(difference / MS_PER_SECOND);
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
  return Array.from(raw.matchAll(/[#@^*]\w+/g));
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

function longest_common_starting_substring(arr1){
    const arr= arr1.concat().sort();
    const a1= arr[0];
    const a2= arr[arr.length-1];
    const L= a1.length;
    let i= 0;
    while(i< L && a1.charAt(i)=== a2.charAt(i)) i++;
    return a1.substring(0, i);
}
