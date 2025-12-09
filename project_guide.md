# PROJECT_GUIDE.md
## Retro Prompt Based Website
### Built with PyCharm + GitHub Copilot + Markdown Content

---

## 1. Vision of the Project
המטרה של הפרויקט היא לבנות אתר רטרו חדש בסגנון שנות ה-80, שבו כל התוכן מוגדר בקבצי Markdown, וכל קוד ה-HTML, CSS ו-JavaScript מיוצר בעזרת GitHub Copilot בתוך PyCharm.

האתר צריך להיות:
- סטטי ופשוט
- מבוסס תוכן מקובץ Markdown
- מעוצב בסגנון רטרו / Synthwave / Arcade
- מנוהל ומיוצר בעזרת פרומפטים בלבד
- ללא Backend

הדגש המרכזי:
היוצר לא כותב קוד HTML/CSS מורכב ידנית, אלא מנחה את Copilot באמצעות פרומפטים.

---

## 2. Tools Used
- PyCharm
- GitHub Copilot
- Git + GitHub Repo
- HTML / CSS / JS בסיסי
- אפשרות לשלב TailwindCSS בעתיד
- תיקיית assets עבור תמונות וסגנון רטרו

---

## 3. Folder Structure
```
retro-site/
  content/
    site-content.md
  src/
    index.html
    about.html
    projects.html
    contact.html
    style.css
    scripts.js
  assets/
    images/
  PROJECT_GUIDE.md
  README.md
```

---

## 4. Workflow Overview
### עקרון יסוד: הכל דרך פרומפטים
1. מוסיפים בקובץ הערה (פרומפט) שמגדירה מה Copilot צריך לייצר.
2. Copilot מייצר קוד.
3. מכוונים אותו בעזרת שיפור הפרומפט.
4. חוזרים עד שמתקבל דף מושלם.

---

## 5. Step by Step Instructions

### שלב 1 – Fill `site-content.md`
הקובץ יכיל את כל התוכן של האתר, מחולק לכותרות:
```
# Home
...

# About
...

# Projects
...

# Contact
...
```
Copilot ישתמש בזה כבסיס.

### שלב 2 – Build the Website Skeleton Using Copilot
מייצרים קבצי HTML, ואז מוסיפים הערות כמו:
```
<!-- Create a retro 80s HTML page using the Home section
from site-content.md. Include neon colors and retro grid. -->
```

### שלב 3 – Generate CSS
ב-style.css:
```
/* Create a full retro 80s synthwave theme.
Dark gradient background, neon cyan and magenta accents.
Pixel borders, glowing buttons, arcade typography. */
```

### שלב 4 – Navigation
```
<!-- Add navigation linking to all pages with neon hover effects. -->
```

### שלב 5 – Additional Pages
about.html:
```
<!-- Build an About page using the About section from site-content.md. -->
```
projects.html:
```
<!-- Build a Projects page with neon grid boxes. -->
```
contact.html:
```
<!-- Build a contact page using the Contact section with retro icons. -->
```

---

## 6. Working with Copilot
- כותבים הערות מפורטות.
- לא מייצרים הכל בבת אחת.
- משתמשים ב-Copilot Chat לשיפורים.

---

## 7. Version Control
```
git add .
git commit -m "Generated index.html through Copilot"
git push
```

---

## 8. Future Extensions
- TailwindCSS
- אנימציות רטרו
- Generator אוטומטי לדפים

---

## 9. End Goal
האתר צריך להיות:
- מלא
- מעוצב בסגנון רטרו-Synthwave
- מבוסס Markdown
- מיוצר כולו מפרומפטים בתוך PyCharm + Copilot

