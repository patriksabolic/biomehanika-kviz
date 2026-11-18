// Učitavanje courses.json, course.json i datoteka s pitanjima.

async function loadJSON(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
}

export function loadCourses() {
  return loadJSON('./content/courses.json');
}

export async function loadCourse(entry) {
  const base = entry.path.endsWith('/') ? entry.path : entry.path + '/';
  const course = await loadJSON(base + 'course.json');
  const lists = await Promise.all(
    (course.questionFiles || []).map((f) =>
      loadJSON(base + 'questions/' + f).catch((e) => {
        console.error('Ne mogu učitati pitanja', f, e);
        return [];
      })
    )
  );
  course.base = base;
  course.chapterById = Object.fromEntries(course.chapters.map((c) => [c.id, c]));
  course.areaById = Object.fromEntries(course.areas.map((a) => [a.id, a]));
  return { course, questions: lists.flat() };
}

export async function loadVersion() {
  try {
    return await loadJSON('./version.json');
  } catch {
    return null;
  }
}
