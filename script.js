// Config

const STORAGE_KEY = 'fishEntries';

// Javascript standard lib additions

Array.prototype.isEmpty = function() {
  return this.length === 0;
}

Object.prototype.map = function(mapFunction) {
  asArray = Object.entries(this)
  return asArray.map(([key, value]) => {
    return mapFunction(key, value);
  });
}

Object.prototype.entries = function() {
  return Object.entries(this);
}

// Events

function backup() {
  const fileName = `fish_backup_${iso8601Date(new Date())}.json`;
  const content = rawEntries();

  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
  element.setAttribute('download', fileName);

  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

function restore(event) {
  event.target.files[0].text()
    .then((content) => {
      localStorage.setItem(STORAGE_KEY, content);
      rerender();
    });
}

function addEntry(event) {
  event.preventDefault();
  const durationInput = event.target.duration;
  const descriptionInput = event.target.description;

  const guid = uuidv4();
  const date = new Date();
  const rawDuration = durationInput.value || '0';
  const duration = parseDuration(rawDuration);
  const description = descriptionInput.value || '#NA';
  const tags = parseTags(description);

  saveEntry({ guid, date, duration, tags, description });
  descriptionInput.value = '';
  durationInput.value = '';
  rerender();
}

window.onload = rerender;
window.setInterval(incrementTimer, 60000);

// Private

function incrementTimer() {
  const input = document.getElementById('duration');
  const parsed = parseDuration(input.value);
  input.value = formatDuration(parsed + 60);
}

function saveEntry(entry) {
  const newEntries = entries();
  newEntries.unshift(entry);

  localStorage.setItem(STORAGE_KEY, JSON.stringify(newEntries));
}

function entries() {
  const content = rawEntries();

  if (content) {
    return JSON.parse(content);
  } else {
    return [];
  }
}

function rawEntries() {
  return localStorage.getItem(STORAGE_KEY);
}

function clearEntries() {
  localStorage.clear();
  rerender();
}

function rerender() {
  const main = document.getElementsByTagName('main')[0];
  while (main.lastChild) {
    main.removeChild(main.lastChild);
  }

  const sortedEntries =
    groupBy(entries(), (item) => { return iso8601Date(item['date']) })
    .entries()
    .sort((firstEl, secondEl) => { return secondEl > firstEl });

  for ([date, records] of sortedEntries) {
    const byTag = records.reduce((memo, record) => {
      if (record.tags.isEmpty()) record.tags.push('#other');

      for (tag of record.tags) {
        const grouping = memo[tag] || { totalDuration: 0, records: [] };

        grouping.totalDuration = grouping.totalDuration + record.duration;
        grouping.records.push(record);
        memo[tag] = grouping;
      };

      return memo;
    }, {});

    const tagComponents = byTag.map((tag, group) => {
      return new TagSummary(tag, group.totalDuration, group.records);
    });

    const newDay = new OneDay(date, tagComponents);

    main.appendChild(newDay);
  }
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
  } else {
    return 0;
  }
}

function parseTags(raw) {
  return Array.from(raw.matchAll(/#\w+/g));
}

function groupBy(array, keyFunction) {
  const reduceFunction = function(memo, item) {
    const key = keyFunction(item);

    (memo[key] = memo[key] || []).push(item);

    return memo;
  }

  return array.reduce(reduceFunction, {});
};

function iso8601Date(date) {
  const parsedDate = new Date(date);
  return parsedDate.toISOString().slice(0, 10);
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

class OneDay extends HTMLElement {
  constructor(date, tagComponents) {
    super();
    const template = document.getElementById('one-day-template').content;
    this.attachShadow({ mode: 'open' }).appendChild(template.cloneNode(true));

    this.innerHTML = `<span slot="date">${iso8601Date(date)}</span>`
    const ul = document.createElement('ul');
    const slotAttr = document.createAttribute('slot');
    slotAttr.value = 'tags';
    ul.setAttributeNode(slotAttr);
    tagComponents.forEach((component) => {
      ul.appendChild(component);
    });
    this.appendChild(ul);
  }
}
customElements.define('one-day', OneDay);

class TagSummary extends HTMLElement {
  constructor(tag, totalDuration, records) {
    super();
    const template = document.getElementById('tag-summary-template').content;
    this.attachShadow({ mode: 'open' }).appendChild(template.cloneNode(true));

    const descriptions = records.map((record) => {
      return `<p>${formatDuration(record.duration)} ${record.description}</p>`
    }).join('');

    this.innerHTML =
      `<span slot="tag-name">${tag}</span>
             <span slot="duration">${formatDuration(totalDuration)}</span>
             <span slot="records">${descriptions}</span>`

  }
}
customElements.define('tag-summary', TagSummary);
