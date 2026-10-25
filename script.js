// Данные берутся из data.js (PROFILE, PROJECTS, ACHIEVEMENTS)

const ACHIEVEMENT_TYPES = {
    certificate: "Сертификат",
    hackathon: "Хакатон",
    olympiad: "Олимпиада",
    course: "Курс",
};

const MONTHS = [
    "январь", "февраль", "март", "апрель", "май", "июнь",
    "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь",
];

// ---------- Утилиты ----------

// Создаёт элемент: el("a", { href: "…", class: "btn" }, "текст", childNode)
function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
        if (key === "class") node.className = value;
        else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
        else node.setAttribute(key, value);
    }
    node.append(...children.filter(Boolean));
    return node;
}

// plural(21, ["год", "года", "лет"]) → "год"
function plural(n, forms) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return forms[0];
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
    return forms[2];
}

function calcAge(birthDate, today = new Date()) {
    // Разбираем вручную: new Date("ГГГГ-ММ-ДД") трактует строку как UTC и может сдвинуть день
    const [year, month, day] = birthDate.split("-").map(Number);
    let age = today.getFullYear() - year;
    const hadBirthday =
        today.getMonth() + 1 > month ||
        (today.getMonth() + 1 === month && today.getDate() >= day);
    if (!hadBirthday) age--;
    return age;
}

// Учебный год начинается 1 сентября. Возвращает null, если программа уже окончена.
function calcCourse(enrollmentYear, programYears, today = new Date()) {
    const course = today.getFullYear() - enrollmentYear + (today.getMonth() >= 8 ? 1 : 0);
    return course > programYears ? null : Math.max(course, 1);
}

// "2025-06" → "июнь 2025"
function formatDate(value) {
    const [year, month] = String(value).split("-");
    return month ? `${MONTHS[Number(month) - 1]} ${year}` : year;
}

function isPdf(path) {
    return /\.pdf$/i.test(path);
}

// ---------- Профиль ----------

function renderProfile() {
    const age = calcAge(PROFILE.birthDate);
    const course = calcCourse(PROFILE.enrollmentYear, PROFILE.programYears);
    const study = course
        ? `${course} курс, ${PROFILE.degree.toLowerCase()}`
        : `Выпускник (${PROFILE.degree.toLowerCase()})`;

    document.getElementById("logo").textContent = PROFILE.nickname;
    document.getElementById("heroTitle").textContent = `Привет! Я ${PROFILE.name}`;
    document.getElementById("heroSubtitle").textContent =
        `Студент-разработчик, ${age} ${plural(age, ["год", "года", "лет"])}. ` +
        `${course ? "Учусь" : "Окончил"} в ${PROFILE.university}.`;

    const facts = [
        ["Возраст", `${age} ${plural(age, ["год", "года", "лет"])}`],
        ["Университет", PROFILE.university],
        ["Учёба", study],
        ["Направление", PROFILE.specialty],
        ["Город", PROFILE.location],
    ];
    document.getElementById("facts").append(
        ...facts
            .filter(([, value]) => value)
            .map(([label, value]) => el("li", {}, el("span", { class: "label" }, `${label}: `), value))
    );

    document.getElementById("aboutText").textContent = PROFILE.about;
    document.getElementById("skills").append(
        ...PROFILE.skills.map((skill) => el("li", { class: "chip" }, skill))
    );
}

// ---------- Фильтры ----------

// Рисует кнопки-фильтры; onChange получает выбранное значение (null — «Все»)
function renderFilters(container, options, onChange) {
    if (options.length < 2) return;
    const buttons = [];
    const make = (label, value) => {
        const button = el("button", {
            class: "filter" + (value === null ? " active" : ""),
            onclick: () => {
                buttons.forEach((b) => b.classList.toggle("active", b === button));
                onChange(value);
            },
        }, label);
        buttons.push(button);
        return button;
    };
    container.append(make("Все", null), ...options.map(([label, value]) => make(label, value)));
}

// ---------- Проекты ----------

function projectCard(project) {
    const cover = project.image
        ? el("img", { class: "card-cover", src: project.image, alt: project.title, loading: "lazy" })
        : el("div", { class: "card-cover", "aria-hidden": "true" }, project.title.charAt(0));

    const links = el("div", { class: "card-links" });
    if (project.github) links.append(el("a", { href: project.github, target: "_blank", rel: "noopener" }, "GitHub →"));
    if (project.demo) links.append(el("a", { href: project.demo, target: "_blank", rel: "noopener" }, "Демо →"));

    return el("article", { class: "card" },
        cover,
        el("div", { class: "card-body" },
            project.year && el("div", { class: "card-meta" }, String(project.year)),
            el("h3", {}, project.title),
            el("p", {}, project.description),
            el("ul", { class: "chips" }, ...project.tags.map((tag) => el("li", { class: "chip" }, tag))),
            links.childElementCount ? links : null
        )
    );
}

function renderProjects() {
    const grid = document.getElementById("projectGrid");
    const sorted = [...PROJECTS].sort((a, b) => (b.year || 0) - (a.year || 0));

    const show = (tag) => {
        const list = tag ? sorted.filter((p) => p.tags.includes(tag)) : sorted;
        grid.replaceChildren(
            ...(list.length ? list.map(projectCard) : [el("p", { class: "empty" }, "Скоро здесь появятся проекты.")])
        );
    };

    const tags = [...new Set(PROJECTS.flatMap((p) => p.tags))].sort();
    renderFilters(document.getElementById("projectFilters"), tags.map((t) => [t, t]), show);
    show(null);
}

// ---------- Достижения ----------

function achievementCard(item) {
    const open = () => openViewer(item);

    let cover = null;
    if (item.file && !isPdf(item.file)) {
        cover = el("button", { class: "card-cover", onclick: open, "aria-label": `Открыть: ${item.title}` },
            el("img", { src: item.file, alt: item.title, loading: "lazy" }));
    } else if (item.file) {
        cover = el("button", { class: "card-cover", onclick: open, "aria-label": `Открыть: ${item.title}` }, "PDF");
    }

    const links = el("div", { class: "card-links" });
    if (item.file) links.append(el("button", { onclick: open }, "Посмотреть"));
    if (item.link) links.append(el("a", { href: item.link, target: "_blank", rel: "noopener" }, "Проверить →"));

    return el("article", { class: "card" },
        cover,
        el("div", { class: "card-body" },
            el("span", { class: "badge" }, ACHIEVEMENT_TYPES[item.type] || item.type),
            el("h3", {}, item.title),
            el("div", { class: "card-meta" }, [item.issuer, item.date && formatDate(item.date)].filter(Boolean).join(" · ")),
            item.description && el("p", {}, item.description),
            links.childElementCount ? links : null
        )
    );
}

function renderAchievements() {
    const grid = document.getElementById("achievementGrid");
    const sorted = [...ACHIEVEMENTS].sort((a, b) => String(b.date).localeCompare(String(a.date)));

    const show = (type) => {
        const list = type ? sorted.filter((a) => a.type === type) : sorted;
        grid.replaceChildren(
            ...(list.length ? list.map(achievementCard) : [el("p", { class: "empty" }, "Скоро здесь появятся достижения.")])
        );
    };

    const types = Object.keys(ACHIEVEMENT_TYPES).filter((t) => ACHIEVEMENTS.some((a) => a.type === t));
    renderFilters(document.getElementById("achievementFilters"), types.map((t) => [ACHIEVEMENT_TYPES[t], t]), show);
    show(null);
}

// ---------- Просмотр файла ----------

const viewer = document.getElementById("viewer");

function openViewer(item) {
    document.getElementById("viewerTitle").textContent = item.title;
    document.getElementById("viewerBody").replaceChildren(
        isPdf(item.file)
            ? el("iframe", { src: item.file, title: item.title })
            : el("img", { src: item.file, alt: item.title })
    );
    document.getElementById("viewerFoot").replaceChildren(
        el("a", { href: item.file, target: "_blank", rel: "noopener" }, "Открыть в новой вкладке"),
        item.link ? el("a", { href: item.link, target: "_blank", rel: "noopener" }, "Проверить подлинность") : null
    );
    viewer.showModal();
}

document.getElementById("viewerClose").addEventListener("click", () => viewer.close());
// Закрытие по клику на затемнённый фон
viewer.addEventListener("click", (e) => {
    if (e.target === viewer) viewer.close();
});

// ---------- Контакты ----------

function renderContacts() {
    const { github, telegram, email } = PROFILE.contacts;
    const list = document.getElementById("contactList");
    if (github) list.append(el("a", { class: "btn btn-ghost", href: github, target: "_blank", rel: "noopener" }, "GitHub"));
    if (telegram) list.append(el("a", { class: "btn btn-ghost", href: telegram, target: "_blank", rel: "noopener" }, "Telegram"));
    if (email) list.append(el("a", { class: "btn", href: `mailto:${email}` }, email));

    document.getElementById("footer").textContent =
        `© ${new Date().getFullYear()} ${PROFILE.name} · ${PROFILE.nickname}`;
}

// ---------- Тема ----------

document.getElementById("themeToggle").addEventListener("click", () => {
    const root = document.documentElement;
    const current = root.dataset.theme ||
        (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    const next = current === "light" ? "dark" : "light";
    root.dataset.theme = next;
    try {
        localStorage.setItem("theme", next);
    } catch (e) {}
});

renderProfile();
renderProjects();
renderAchievements();
renderContacts();
