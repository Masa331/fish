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

class FishEntries {
  static all() {
    const all = this.raw();

    const parsed = JSON.parse(all)
      .map(entry => {
        entry.date = new Date(entry.date);
        if (entry.tags.isEmpty()) entry.tags.push('#other');

        return entry;
      });

    return parsed;
  }

  static raw() {
    return localStorage.getItem(STORAGE_KEY) || "[]";
  }
}
