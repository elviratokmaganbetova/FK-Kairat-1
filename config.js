// Game Configuration

// Game settings
export const gameSettings = {
    startDate: "July 2023",
    initialBudget: 2500000, // in Euros
    seasonDuration: 12, // months
    difficulty: "normal", // easy, normal, hard
    language: "ru"
};

// Academy teams configuration
export const academyTeams = [
    { id: "u21", name: "U21", playerCount: 22, rating: 3, position: 3, maxTeams: 12 },
    { id: "u19", name: "U19", playerCount: 24, rating: 4, position: 1, maxTeams: 10 },
    { id: "u17", name: "U17", playerCount: 20, rating: 3, position: 4, maxTeams: 8 },
    { id: "u15", name: "U15", playerCount: 18, rating: 4, position: 2, maxTeams: 8 },
    { id: "u13", name: "U13", playerCount: 16, rating: 3, position: 3, maxTeams: 8 },
    { id: "u11", name: "U11", playerCount: 14, rating: 2, position: 5, maxTeams: 8 }
];

// Infrastructure facilities
export const facilities = [
    { 
        id: "trainingFields", 
        name: "Тренировочные поля", 
        level: 75, 
        maxLevel: 100,
        cost: 100000, // cost per level improvement
        effect: "Повышает скорость развития технических навыков",
        description: "Качественные поля для тренировок всех возрастных групп"
    },
    { 
        id: "medicalCenter", 
        name: "Медицинский центр", 
        level: 60, 
        maxLevel: 100,
        cost: 80000,
        effect: "Снижает риск травм и время восстановления",
        description: "Современное оборудование для диагностики и лечения травм"
    },
    { 
        id: "gym", 
        name: "Тренажерный зал", 
        level: 80, 
        maxLevel: 100,
        cost: 70000,
        effect: "Повышает скорость развития физических качеств",
        description: "Силовые и кардио тренажеры для физической подготовки"
    },
    { 
        id: "dormitory", 
        name: "Общежитие", 
        level: 50, 
        maxLevel: 100,
        cost: 120000,
        effect: "Улучшает моральное состояние и восстановление игроков",
        description: "Комфортное проживание для воспитанников из других городов"
    },
    { 
        id: "classrooms", 
        name: "Учебные классы", 
        level: 65, 
        maxLevel: 100,
        cost: 50000,
        effect: "Повышает развитие тактических и ментальных навыков",
        description: "Помещения для теоретических занятий и видеоанализа"
    }
];

// Staff roles and parameters
export const staffRoles = {
    coaches: {
        headCoach: { title: "Главный тренер", salaryRange: [5000, 15000], effect: "Общее развитие игроков" },
        assistantCoach: { title: "Ассистент тренера", salaryRange: [2000, 7000], effect: "Помощь в тренировках" },
        goalkeepingCoach: { title: "Тренер вратарей", salaryRange: [2500, 8000], effect: "Развитие вратарей" },
        fitnessCoach: { title: "Тренер по физподготовке", salaryRange: [2000, 7000], effect: "Физическое развитие" },
        technicalCoach: { title: "Тренер по технике", salaryRange: [2500, 8000], effect: "Техническое развитие" }
    },
    scouts: {
        headScout: { title: "Главный скаут", salaryRange: [4000, 10000], effect: "Координация скаутинга" },
        regionalScout: { title: "Региональный скаут", salaryRange: [2000, 6000], effect: "Поиск талантов в регионе" },
        internationalScout: { title: "Международный скаут", salaryRange: [3000, 9000], effect: "Поиск талантов за рубежом" }
    },
    medical: {
        doctor: { title: "Врач", salaryRange: [3000, 9000], effect: "Лечение травм" },
        physiotherapist: { title: "Физиотерапевт", salaryRange: [2000, 6000], effect: "Восстановление после травм" },
        nutritionist: { title: "Диетолог", salaryRange: [1500, 5000], effect: "Питание и восстановление" }
    }
};

// Player positions
export const playerPositions = {
    goalkeeper: { code: "GK", name: "Вратарь" },
    rightBack: { code: "RB", name: "Правый защитник" },
    centerBack: { code: "CB", name: "Центральный защитник" },
    leftBack: { code: "LB", name: "Левый защитник" },
    defensiveMid: { code: "DM", name: "Опорный полузащитник" },
    centralMid: { code: "CM", name: "Центральный полузащитник" },
    attackingMid: { code: "AM", name: "Атакующий полузащитник" },
    rightWinger: { code: "RW", name: "Правый вингер" },
    leftWinger: { code: "LW", name: "Левый вингер" },
    striker: { code: "ST", name: "Нападающий" }
};

// Kazakhstan regions for scouting
export const regions = [
    { id: "almaty", name: "Алматы", talentRating: 4, population: 2000000 },
    { id: "nursultan", name: "Нур-Султан", talentRating: 3, population: 1200000 },
    { id: "shymkent", name: "Шымкент", talentRating: 3, population: 1000000 },
    { id: "karaganda", name: "Караганда", talentRating: 2, population: 500000 },
    { id: "aktobe", name: "Актобе", talentRating: 2, population: 400000 },
    { id: "taraz", name: "Тараз", talentRating: 2, population: 350000 },
    { id: "pavlodar", name: "Павлодар", talentRating: 2, population: 330000 },
    { id: "uskemen", name: "Усть-Каменогорск", talentRating: 2, population: 310000 },
    { id: "semey", name: "Семей", talentRating: 2, population: 300000 },
    { id: "kyzylorda", name: "Кызылорда", talentRating: 1, population: 280000 },
    { id: "uralsk", name: "Уральск", talentRating: 1, population: 270000 },
    { id: "kostanay", name: "Костанай", talentRating: 1, population: 250000 },
    { id: "atyrau", name: "Атырау", talentRating: 1, population: 230000 },
    { id: "aktau", name: "Актау", talentRating: 1, population: 220000 }
];

// Events that can occur during the game
export const events = [
    {
        id: "talentDiscovery",
        title: "Скаут обнаружил талант!",
        description: "Наш скаут сообщает о невероятно талантливом юном футболисте из региона {region}. Однако, его семья не очень обеспечена и потребуется дополнительная поддержка для переезда в Алматы.",
        options: [
            { text: "Предложить полную стипендию (€5,000)", budget: -5000, morale: 10, potential: "high" },
            { text: "Предложить частичную поддержку (€2,000)", budget: -2000, morale: 5, potential: "medium" },
            { text: "Отказаться - мы не можем позволить себе дополнительные расходы", budget: 0, morale: -5, potential: "none" }
        ]
    },
    {
        id: "injuryCrisis",
        title: "Травмы в команде U19",
        description: "В команде U19 одновременно получили травмы три ключевых игрока. Доктор предлагает закупить новое реабилитационное оборудование.",
        options: [
            { text: "Закупить высококлассное оборудование (€30,000)", budget: -30000, injuries: -30, infrastructure: 10 },
            { text: "Закупить базовое оборудование (€10,000)", budget: -10000, injuries: -15, infrastructure: 5 },
            { text: "Обойтись имеющимися средствами", budget: 0, injuries: 0, infrastructure: 0 }
        ]
    },
    {
        id: "coachingOffer",
        title: "Предложение от опытного тренера",
        description: "Высококвалифицированный тренер молодежи из Европы заинтересован в работе в нашей академии. Его зарплатные ожидания выше нашего бюджета, но его методики доказали свою эффективность.",
        options: [
            { text: "Нанять тренера (€8,000/месяц)", budget: -96000, coachingLevel: 20 },
            { text: "Предложить меньшую зарплату (€5,000/месяц)", budget: -60000, coachingLevel: 10, chance: 50 },
            { text: "Отказаться от предложения", budget: 0, coachingLevel: 0 }
        ]
    },
    {
        id: "internationaTournament",
        title: "Приглашение на международный турнир",
        description: "Наша команда U17 получила приглашение на престижный международный турнир. Участие даст бесценный опыт, но требует дополнительных расходов.",
        options: [
            { text: "Принять приглашение и выделить дополнительный бюджет (€15,000)", budget: -15000, experience: 15, reputation: 10 },
            { text: "Принять приглашение в рамках стандартного бюджета", budget: -5000, experience: 10, reputation: 5 },
            { text: "Отклонить приглашение", budget: 0, experience: 0, reputation: -5 }
        ]
    },
    {
        id: "topClubInterest",
        title: "Интерес топ-клуба к воспитаннику",
        description: "Европейский топ-клуб интересуется нашим 16-летним талантливым полузащитником. Они предлагают €200,000 за трансфер, но игрок имеет огромный потенциал.",
        options: [
            { text: "Продать игрока", budget: 200000, reputation: 5, talentLoss: true },
            { text: "Отклонить предложение и сохранить игрока", budget: 0, reputation: 0, talentRetention: true },
            { text: "Предложить сделку с будущими бонусами и % от следующего трансфера", budget: 100000, reputation: 10, partialRetention: true }
        ]
    }
];

// Budget distribution defaults
export const budgetDefaults = {
    salaries: 35,
    scouting: 15,
    infrastructure: 30,
    tournaments: 10,
    medical: 10
};

