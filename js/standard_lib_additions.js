// Javascript standard lib additions

Array.prototype.isEmpty = function() {
  return this.length === 0;
}

Array.prototype.hasAny = function() {
  return this.length > 0;
}

Array.prototype.groupBy = function(keyFunction) {
  const reduceFunction = function(memo, item) {
    const key = keyFunction(item);

    (memo[key] = memo[key] || []).push(item);

    return memo;
  }

  return this.reduce(reduceFunction, {});
}

Array.prototype.unique = function() {
  return [...new Set(this)]
}

Array.prototype.first = function() {
  return this[0];
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

  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7) - 1;
  return `${yearStart.getFullYear()}${weekNo}`;
};

Date.prototype.iso8601 = function() {
  return this.toISOString().slice(0, 10);
}

Date.prototype.dayName = function() {
  return WEEK_DAY_NAMES[this.getDay()];
}

Date.prototype.monthName = function() {
  const year = this.getFullYear();
  const month = this.toLocaleString('default', { month: 'long' }).toLowerCase();
  return `${month} ${year}`;
}

function iso8601Date(date) {
  const parsedDate = new Date(date);
  return parsedDate.toISOString().slice(0, 10);
}
