// Config

const STORAGE_KEY = 'fishEntries';
const MINUTE = 60000;

// Javascript standard lib additions

Array.prototype.isEmpty = function() {
  return this.length === 0;
}

Array.prototype.groupBy = function(keyFunction) {
  const reduceFunction = function(memo, item) {
    const key = keyFunction(item);

    (memo[key] = memo[key] || []).push(item);

    return memo;
  }

  return this.reduce(reduceFunction, {});
}

Object.prototype.entries = function() {
  return Object.entries(this);
}

Object.prototype.map = function(mapFunction) {
  return this.entries().map(([key, value]) => {
    return mapFunction(key, value);
  });
}

Date.prototype.weekNumber = function() {
  const d = new Date(Date.UTC(this.getFullYear(), this.getMonth(), this.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d - yearStart) / 86400000) + 1)/7)
};

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

window.onload = function() {
  rerender();
  const timer = new interval(MINUTE, incrementTimer);
  timer.run();
};

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

function totalDuration(total, record) {
  return total + record.duration;
}

function totalByTag(records) {
  const byTag = records.reduce((memo, record) => {
    if (record.tags.isEmpty()) record.tags.push('#other');

    for (tag of record.tags) {
      memo[tag] = (memo[tag] || 0) + record.duration;
    };

    return memo;
  }, {});

  return byTag;
}

function rerender() {
  const main = document.getElementsByTagName('main')[0];
  while (main.lastChild) {
    main.removeChild(main.lastChild);
  }

  const sortedEntries =
    entries()
    .groupBy((item) => { return iso8601Date(item['date']) })
    .entries()
    .sort((firstEl, secondEl) => { return secondEl > firstEl });

  const dayComponents = sortedEntries.map(([date, records]) => {
    const byTag = records.reduce((memo, record) => {
      if (record.tags.isEmpty()) record.tags.push('#other');

      for (tag of record.tags) {
        const grouping = memo[tag] || { records: [] };

        grouping.records.push(record);
        memo[tag] = grouping;
      };

      return memo;
    }, {});

    const tagComponents = byTag.map((tag, group) => {
      const duration = group.records.reduce(totalDuration, 0);
      return new FishTagSummary(tag, duration, group.records);
    });

    const duration = records.reduce(totalDuration, 0);
    return new FishDay(date, duration, tagComponents);
  });

  const byWeek = dayComponents.groupBy((day) => {
    const parsedDate = new Date(day.date);
    return parsedDate.weekNumber();
  }).entries().sort(([weekNo, _records]) => weekNo);

  const [currentWeekNo, currentWeekDays] = byWeek.shift();
  const duration = currentWeekDays.reduce(totalDuration, 0);
  const currentWeek = new FishCurrentWeek(currentWeekNo, duration, currentWeekDays);
  main.appendChild(currentWeek);

  for ([weekNo, days] of byWeek) {
    const duration = days.reduce(totalDuration, 0);
    const week = new FishWeek(weekNo, duration, days);

    main.appendChild(week);
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
  } else { // considering it minutes
    return number * 60;
  }
}

function parseTags(raw) {
  return Array.from(raw.matchAll(/#\w+/g));
}

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

// https://gist.github.com/manast/1185904
function interval(duration, fn) {
  this.baseline = undefined;

  this.run = function() {
    if(this.baseline === undefined) {
      this.baseline = new Date().getTime();
    }
    fn();
    var end = new Date().getTime();
    this.baseline += duration;

    var nextTick = duration - (end - this.baseline);
    if(nextTick < 0) {
      nextTick = 0;
    }
    (function(i) {
      i.timer = setTimeout(function(){
        i.run(end);
      }, nextTick)
    }(this));
  }

  this.stop = function() {
    clearTimeout(this.timer);
  }
}

class FishTagSummary extends HTMLElement {
  constructor(tag, duration, records) {
    super();
    this.tag = tag;
    this.duration = duration;

    const template = document.getElementById('fish-tag-summary-template').content;
    this.attachShadow({ mode: 'open' }).appendChild(template.cloneNode(true));

    const descriptions = records.map((record) => {
      return `<p>${formatDuration(record.duration)} ${record.description}</p>`
    }).join('');

    this.innerHTML =
      `<span slot="tag-name">${tag}</span>
             <span slot="duration">${formatDuration(duration)}</span>
             <span slot="records">${descriptions}</span>`

  }
}
customElements.define('fish-tag-summary', FishTagSummary);

class FishDay extends HTMLElement {
  constructor(date, duration, tagComponents) {
    super();
    this.date = date;
    this.duration = duration;
    this.tags = tagComponents;

    const template = document.getElementById('fish-day-template').content;
    this.attachShadow({ mode: 'open' }).appendChild(template.cloneNode(true));

    this.innerHTML = `<span slot="date">${iso8601Date(date)}</span><span slot="duration">${formatDuration(duration)}</span>`

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
customElements.define('fish-day', FishDay);

class FishWeek extends HTMLElement {
  constructor(title, duration, days) {
    super();
    const template = document.getElementById('fish-week-template').content;
    this.attachShadow({ mode: 'open' }).appendChild(template.cloneNode(true));

    const allTags = days.map(day => day.tags).flat();
    const durationByTag = allTags.reduce((memo, fishTag) => {
      memo[fishTag.tag] = (memo[fishTag.tag] || 0) + fishTag.duration;
      return memo;
    }, {})

    const joined =
      durationByTag.entries()
      .sort((duration1, duration2) => duration1 > duration1)
      .map(([tag, dduration]) => [tag, formatDuration(dduration)].join(' '))
      .join(', ');

    this.innerHTML = `
      <span slot="title">week ${title}</span>
      <span slot="duration">${formatDuration(duration)}</span>
      <div slot="tagTotals">${joined}</>
      `;

    const div = document.createElement('div');
    const slotAttr = document.createAttribute('slot');
    slotAttr.value = 'days';
    div.setAttributeNode(slotAttr);
    days.forEach((component) => {
      div.appendChild(component);
    });
    this.appendChild(div);
  }
}
customElements.define('fish-week', FishWeek);

class FishCurrentWeek extends HTMLElement {
  constructor(title, duration, days) {
    super();
    const template = document.getElementById('fish-current-week-template').content;
    this.attachShadow({ mode: 'open' }).appendChild(template.cloneNode(true));

    this.innerHTML = `
      <span slot="title">current week</span>
      <span slot="duration">${formatDuration(duration)}</span>
      `;

    const div = document.createElement('div');
    const slotAttr = document.createAttribute('slot');
    slotAttr.value = 'days';
    div.setAttributeNode(slotAttr);
    days.forEach((component) => {
      div.appendChild(component);
    });
    this.appendChild(div);
  }
}
customElements.define('fish-current-week', FishCurrentWeek);
