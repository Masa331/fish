// Config

const STORAGE_KEY = 'fishEntries';

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

// Private

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

  const currentEntries = entries();
  const keyFunction = (item) => { return iso8601Date(item['date']) };
  const groupedByDate = groupBy(currentEntries, keyFunction)
  const inArray = Object.entries(groupedByDate);
  const sorted = inArray.sort((firstEl, secondEl) => { return secondEl > firstEl });

  for ([key, dateRecords] of sorted) {
    let byTag = {};
    for (record of dateRecords) {
      if (record.tags.length > 0) {
        for (tag of record.tags) {
          const grouping = byTag[tag] || { totalDuration: 0, records: [] };

          grouping.totalDuration = grouping.totalDuration + record.duration;
          grouping.records.push(record);
          byTag[tag] = grouping;
        }
      } else {
        const grouping = byTag['#other'] || { totalDuration: 0, records: [] };
        grouping.totalDuration = grouping.totalDuration + record.duration;
        grouping.records.push(record);
        byTag['#other'] = grouping;
      }
    }


    const tagComponents = Object.keys(byTag).map((tag) => {
      const record = byTag[tag];

      const newDay = new TagSummary();
      const descriptions = record.records.map((i) => {
        return `<p>${formatDuration(i.duration)} ${i.description}</p>`
      }).join('');

      newDay.innerHTML =
        `<span slot="tag-name">${tag}</span>
               <span slot="duration">${formatDuration(record.totalDuration)}</span>
               <span slot="records">${descriptions}</span>`

      return newDay;
    });


    const newDay = new OneDay();
    newDay.innerHTML = `<span slot="date">${iso8601Date(key)}</span>`
    const ul = document.createElement('ul');
    const slotAttr = document.createAttribute('slot');
    slotAttr.value = 'tags';
    ul.setAttributeNode(slotAttr);
    tagComponents.forEach((component) => {
      ul.appendChild(component);
    });
    newDay.appendChild(ul);
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
  if (raw.indexOf('s') > -1) {
    const value = raw.match(/\d*\.?\d*/)[0];
    return parseFloat(value);
  } else if (raw.indexOf('m') > -1) {
    const value = raw.match(/\d*\.?\d*/)[0];
    return parseFloat(value) * 60;
  } else if (raw.indexOf('h') > -1) {
    const value = raw.match(/\d*\.?\d*/)[0];
    return parseFloat(value) * 60 * 60;
  } else {
    return null;
  }
}

function parseTags(raw) {
  return Array.from(raw.matchAll(/#\w+/g));
}

function groupBy(array, keyFunction) {
  return array.reduce(function(memo, item) {
    const key = keyFunction(item);

    (memo[key] = memo[key] || []).push(item);

    return memo;
  }, {});
};

function iso8601Date(date) {
  const parsedDate = new Date(date);
  return parsedDate.toISOString().slice(0,10);
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
  constructor() {
    super();
    const template = document.getElementById('one-day-template').content;
    this.attachShadow({ mode: 'open' }).appendChild(template.cloneNode(true));
  }
}
customElements.define('one-day', OneDay);

class TagSummary extends HTMLElement {
  constructor() {
    super();
    const template = document.getElementById('tag-summary-template').content;
    this.attachShadow({ mode: 'open' }).appendChild(template.cloneNode(true));
  }
}
customElements.define('tag-summary', TagSummary);
