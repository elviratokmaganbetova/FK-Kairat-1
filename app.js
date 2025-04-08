import { gameSettings, academyTeams, facilities, staffRoles, playerPositions, regions, events, budgetDefaults } from './config.js';
import { renderFinanceCharts, updateBudgetChartData } from './charts.js';
import * as ChartModule from 'chart.js'; // Import Chart.js module

// Game state
const gameState = {
    currentDate: gameSettings.startDate,
    budget: gameSettings.initialBudget,
    teams: structuredClone(academyTeams),
    facilities: structuredClone(facilities),
    currentView: 'dashboard-view',
    pendingEvents: [],
    staff: [],
    players: [],
    scouts: [],
    scoutingBudget: 150000,
    budgetDistribution: { ...budgetDefaults },
    currentSeason: 1,
    totalSeasons: 5,
    scoutedRegions: [],
    objectives: {
        hireTopCoaches: { text: "Нанять минимум {required} тренеров с рейтингом 4+ звезды", required: 3, current: 0, completed: false, weight: 15 },
        scoutRegionsDeep: { text: "Провести углубленный скаутинг (≥2 недели) минимум в {required} разных регионах", required: 3, current: 0, completed: false, weight: 20 },
        findTopTalents: { text: "Обнаружить и пригласить на просмотр не менее {required} игроков с потенциалом 5 звезд", required: 2, current: 0, completed: false, weight: 25 },
        upgradeKeyFacility: { text: "Улучшить ключевой объект инфраструктуры (поля или мед. центр) минимум на {required}%", required: 15, current: 0, facilityType: null, completed: false, weight: 20 },
        winYouthLeague: { text: "Выиграть чемпионат хотя бы одной молодежной командой (U17, U19 или U21)", required: 1, current: 0, completed: false, weight: 15 },
        positiveBalance: { text: "Закончить сезон с положительным или нулевым балансом бюджета", required: 0, current: 0, completed: false, weight: 5 } // Check budget at end of season
    },
    seasonProgress: 0,
    achievements: {
        topPlayersProduced: 0,
        championshipsWon: 0,
        internationalTournamentsWon: 0,
        playersInNationalTeam: 0,
        revenueFromTransfers: 0
    }
};

// Store chart instances to destroy them when needed
let chartInstances = {}; 

// DOM elements
const viewButtons = {
    'btn-season': 'dashboard-view',
    'btn-academy': 'academy-view',
    'btn-staff': 'staff-view',
    'btn-players': 'players-view',
    'btn-scouting': 'scouting-view',
    'btn-finance': 'finance-view'
};

// Temporary store for player chart instance
let playerChartInstance = null;

// --- Utility Functions ---

// Generate star rating HTML
function getStarsHTML(rating) {
    const maxStars = 5;
    let stars = '';
    for (let i = 0; i < maxStars; i++) {
        stars += i < rating ? '★' : '☆';
    }
    return stars;
}

// Get staff category name (for display)
function getStaffCategory(categoryId) {
    switch(categoryId) {
        case 'coaches': return 'Тренеры';
        case 'scouts': return 'Скауты';
        case 'medical': return 'Медперсонал';
        default: return 'Неизвестно';
    }
}

// --- Game Initialization and Core Logic ---

// Initialize the game
function initGame() {
    // Set up event listeners for navigation
    for (const [buttonId, viewId] of Object.entries(viewButtons)) {
        document.getElementById(buttonId).addEventListener('click', () => {
            switchView(viewId);
        });
    }

    // Initialize charts
    renderFinanceCharts();

    // Set up other event listeners
    setupBudgetSliders();
    setupInfrastructureView();
    setupScoutingMap();
    setupObjectivesTracking(); 

    // Initial load of data
    generatePlayers();
    generateStaff();

    // Initialize the first random event
    setTimeout(() => {
        triggerRandomEvent();
    }, 10000);

    // Set up complete season button
    document.getElementById('complete-season').addEventListener('click', completeCurrentSeason);

    // Initial UI Update
    updateObjectivesDisplay();
    updateBudgetDisplay();
}

// Placeholder/Initial setup for objectives tracking
function setupObjectivesTracking() {
    console.log("Objectives tracking setup initialized.");
    updateObjectivesDisplay();
}

// Update the display of seasonal objectives
function updateObjectivesDisplay() {
    const objectivesList = document.getElementById('objectives-list');
    const currentSeasonDisplay = document.getElementById('current-season-display');
    if (!objectivesList || !currentSeasonDisplay) return;

    currentSeasonDisplay.textContent = gameState.currentSeason;
    objectivesList.innerHTML = ''; 

    for (const key in gameState.objectives) {
        const objective = gameState.objectives[key];
        const listItem = document.createElement('li');
        listItem.className = 'objective' + (objective.completed ? ' completed' : '');

        let progressText = '';
        if (key === 'hireTopCoaches' || key === 'scoutRegionsDeep' || key === 'findTopTalents') {
            progressText = ` (${objective.current}/${objective.required})`;
        } else if (key === 'upgradeKeyFacility') {
            progressText = objective.completed ? '' : ` (Прогресс: ${objective.current}% / ${objective.required}%)`;
        } else if (key === 'winYouthLeague' && !objective.completed) {
             progressText = ` (${objective.current}/${objective.required})`;
        } else if (key === 'positiveBalance' && !objective.completed && gameState.currentSeason > 0) {
            progressText = gameState.budget >= 0 ? ' (Пока в плюсе)' : ` (Дефицит: €${Math.abs(gameState.budget).toLocaleString()})`;
        }

        listItem.innerHTML = `
            <span class="checkbox">${objective.completed ? '✔' : '☐'}</span>
            <span>${objective.text.replace('{required}', objective.required)}${progressText}</span>
            <span style="margin-left: auto; font-size: 0.8em; color: #6c757d;">(Вес: ${objective.weight})</span>
        `;
        objectivesList.appendChild(listItem);
    }

    updateSeasonProgress();
}

// Complete current season
function completeCurrentSeason() {
    if (gameState.seasonProgress < 80) {
        alert('Вы не выполнили достаточно задач, чтобы завершить сезон. Необходимо выполнить минимум 80% задач (по весу).');
        return;
    }

    gameState.objectives.positiveBalance.completed = gameState.budget >= 0;
    updateSeasonProgress(); 

    gameState.budget += calculateSeasonalIncome();
    gameState.achievements.revenueFromTransfers = 0; 

    updateBudgetDisplay();

    if (gameState.currentSeason >= gameState.totalSeasons) {
        showFinalResults();
        return;
    }

    showSeasonSummary(); 

    gameState.currentSeason++;
    gameState.seasonProgress = 0;
    gameState.scoutedRegions = []; 

    for (const key in gameState.objectives) {
        gameState.objectives[key].current = 0;
        gameState.objectives[key].completed = false;
        if (key === 'upgradeKeyFacility') {
            gameState.objectives[key].facilityType = null; 
        }
    }

    if (gameState.currentSeason > 1) {
        gameState.objectives.hireTopCoaches.required += 1;
        gameState.objectives.scoutRegionsDeep.required = Math.min(regions.length, gameState.objectives.scoutRegionsDeep.required + 1); 
        gameState.objectives.findTopTalents.required += 1;
        gameState.objectives.upgradeKeyFacility.required = Math.min(50, gameState.objectives.upgradeKeyFacility.required + 5); 
        gameState.objectives.winYouthLeague.required = 1; 
    }

    updateObjectivesDisplay();

}

// Calculate seasonal income
function calculateSeasonalIncome() {
    let income = 500000;

    let academyPerformanceBonus = 0;
    gameState.teams.forEach(team => {
        const position = Math.ceil(Math.random() * team.maxTeams);
        team.position = position; 
        if (position <= 3) {
            academyPerformanceBonus += 50000 * (4 - position);
            if (position === 1 && ['u17', 'u19', 'u21'].includes(team.id) && !gameState.objectives.winYouthLeague.completed) {
                gameState.objectives.winYouthLeague.current = 1;
                gameState.objectives.winYouthLeague.completed = true;
                gameState.achievements.championshipsWon++; 
            }
        }
    });

    const transferIncome = gameState.achievements.revenueFromTransfers;

    let objectivesBonus = 0;
    for (const key in gameState.objectives) {
        if (gameState.objectives[key].completed) {
            objectivesBonus += gameState.objectives[key].weight * 1000; 
        }
    }

    console.log(`Seasonal Income: Base(${income}) + Performance(${academyPerformanceBonus}) + Transfers(${transferIncome}) + Objectives(${objectivesBonus})`);
    return income + academyPerformanceBonus + transferIncome + objectivesBonus;
}

// Show season summary
function showSeasonSummary() {
    const eventContent = document.getElementById('event-content');
    const eventTitle = document.getElementById('event-title');
    const eventOptions = document.getElementById('event-options');

    eventTitle.textContent = `Итоги сезона ${gameState.currentSeason}`; 

    const teamsPerformance = gameState.teams.map(team => {
        return `<li>${team.name}: ${team.position || 'N/A'} место из ${team.maxTeams}</li>`;
    }).join('');

    const completedObjectives = Object.values(gameState.objectives).filter(o => o.completed).length;
    const totalObjectives = Object.keys(gameState.objectives).length;

    eventContent.innerHTML = `
        <div class="season-summary">
            <h3>Результаты команд</h3>
            <ul>${teamsPerformance}</ul>

            <h3>Выполнение задач сезона</h3>
            <p>Завершено задач: ${completedObjectives} из ${totalObjectives} (${gameState.seasonProgress}%)</p>
            <p>${gameState.objectives.positiveBalance.completed ? 'Бюджет в плюсе!' : 'Сезон завершен с дефицитом бюджета.'}</p>

            <h3>Развитие академии</h3>
            <p>Обнаружено новых талантов (5 звезд): ${gameState.objectives.findTopTalents.current}</p>
            <p>Нанято топ-тренеров: ${gameState.objectives.hireTopCoaches.current}</p>

            <h3>Финансы</h3>
            <p>Бюджет на конец сезона: €${gameState.budget.toLocaleString()}</p>
            <p>Доход от трансферов за сезон: €${gameState.achievements.revenueFromTransfers.toLocaleString()}</p>

            <h3>Следующий сезон (${gameState.currentSeason + 1})</h3>
            <p>Ожидаемый бюджет: €${(gameState.budget + calculateSeasonalIncome()).toLocaleString()} (после начисления дохода)</p>
            <h4>Предварительные задачи на сезон ${gameState.currentSeason + 1}:</h4>
            <ul>
                ${Object.entries(gameState.objectives).map(([key, obj]) => {
                    let nextReq = obj.required;
                    if (gameState.currentSeason + 1 > 1) { 
                        if(key === 'hireTopCoaches') nextReq += 1;
                        if(key === 'scoutRegionsDeep') nextReq = Math.min(regions.length, nextReq + 1);
                        if(key === 'findTopTalents') nextReq += 1;
                        if(key === 'upgradeKeyFacility') nextReq = Math.min(50, nextReq + 5);
                    }
                    return `<li>${obj.text.replace('{required}', nextReq)}</li>`;
                }).join('')}
            </ul>
        </div>
    `;

    eventOptions.innerHTML = `<button id="start-new-season">Начать сезон ${gameState.currentSeason + 1}</button>`;

    document.getElementById('game-events').classList.remove('hidden');

    document.getElementById('start-new-season').addEventListener('click', () => {
        document.getElementById('game-events').classList.add('hidden');
    });

    document.getElementById('close-event').addEventListener('click', () => {
        document.getElementById('game-events').classList.add('hidden');
    });
}

// Show final results
function showFinalResults() {
    const eventContent = document.getElementById('event-content');
    const eventTitle = document.getElementById('event-title');
    const eventOptions = document.getElementById('event-options');

    eventTitle.textContent = `Завершение игры - Итоги 5 сезонов управления Академией`;

    const producedPlayers = gameState.achievements.topPlayersProduced; 
    const championshipsWon = gameState.achievements.championshipsWon;
    const internationalSuccess = gameState.achievements.internationalTournamentsWon; 
    const playersInNational = gameState.achievements.playersInNationalTeam; 
    const totalTransferRevenue = gameState.achievements.revenueFromTransfers; 

    let totalPoints = 0;
    totalPoints += championshipsWon * 20;
    totalPoints += producedPlayers * 10; 
    totalPoints += internationalSuccess * 30; 
    totalPoints += playersInNational * 25; 
    totalPoints += Math.max(0, gameState.budget / 50000); 

    const avgInfraLevel = gameState.facilities.reduce((sum, f) => sum + f.level, 0) / gameState.facilities.length;
    totalPoints += Math.max(0, avgInfraLevel - 60) * 2; 

    const thresholds = { 1: 0, 2: 80, 3: 150, 4: 250, 5: 400 };
    let finalRating = 1;
    for (let rating = 5; rating >= 2; rating--) {
        if (totalPoints >= thresholds[rating]) {
            finalRating = rating;
            break;
        }
    }

    eventContent.innerHTML = `
        <div class="final-results">
            <h3>Ваши достижения за 5 сезонов</h3>
            <p><strong>Выиграно молодежных чемпионатов:</strong> ${championshipsWon}</p>
            <p><strong>Подготовлено игроков для основной команды:</strong> ${producedPlayers} (требуется трекинг)</p>
            <p><strong>Успехи на международных турнирах:</strong> ${internationalSuccess} (требуется трекинг)</p>
            <p><strong>Игроков в национальной сборной:</strong> ${playersInNational} (требуется трекинг)</p>
            <p><strong>Итоговый бюджет:</strong> €${gameState.budget.toLocaleString()}</p>
            <p><strong>Средний уровень инфраструктуры:</strong> ${avgInfraLevel.toFixed(0)}%</p>

            <h3>Итоговая оценка Вашей работы</h3>
            <p><strong>Набрано очков:</strong> ${totalPoints.toFixed(0)}</p>
            <div class="final-rating">
                <p>Ваш рейтинг: ${getStarsHTML(finalRating)}</p>
                <p>${getFinalRatingText(finalRating)}</p>
            </div>
        </div>
    `;

    eventOptions.innerHTML = `<button id="restart-game">Начать новую игру</button>`;

    document.getElementById('game-events').classList.remove('hidden');

    document.getElementById('restart-game').addEventListener('click', () => {
        window.location.reload();
    });

    document.getElementById('close-event').addEventListener('click', () => {
        document.getElementById('game-events').classList.add('hidden');
    });
}

// Get final rating text
function getFinalRatingText(rating) {
    switch(rating) {
        case 5: return "Мастер-класс! Вы создали машину по производству талантов мирового уровня!";
        case 4: return "Превосходно! Академия 'Кайрат' стала настоящей гордостью Казахстана под Вашим руководством!";
        case 3: return "Хорошая работа! Вы выстроили крепкую систему и добились заметных успехов.";
        case 2: return "Удовлетворительно. Академия функционирует, но до статуса лидера еще далеко.";
        default: return "Требуется улучшение. Результаты не оправдали ожиданий руководства.";
    }
}

// Update staff when hiring
function inviteProspect(prospect) {
    const reportsContainer = document.getElementById('reports-list');

    const reportEl = document.createElement('div');
    reportEl.className = 'scouting-report'; 
    reportEl.innerHTML = `
        <h4>${prospect.name}</h4>
        <div class="report-details">
            <p><strong>Возраст:</strong> ${prospect.age} лет</p>
            <p><strong>Позиция:</strong> ${prospect.position}</p>
            <p><strong>Регион:</strong> ${prospect.region}</p>
            <p><strong>Потенциал:</strong> ${getStarsHTML(prospect.potential)}</p>
        </div>
        <div class="report-status">
            <span class="status invited">Приглашен на просмотр</span>
        </div>
    `;

    reportsContainer.appendChild(reportEl);

    const objective = gameState.objectives.findTopTalents;
    if (prospect.potential === 5 && !objective.completed) {
        objective.current++;
        if (objective.current >= objective.required) {
            objective.completed = true;
        }
        updateSeasonProgress();
        updateObjectivesDisplay();
    }

    alert(`${prospect.name} (Потенциал: ${prospect.potential} звезд) приглашен на просмотр в Академию ФК "Кайрат".`);
}

// Modified scout region function
function scoutRegion(regionId) {
    const region = regions.find(r => r.id === regionId);
    if (!region) return;

    const availableScouts = gameState.staff.filter(s => s.category === 'scouts' && !s.isBusy);

    if (availableScouts.length === 0) {
        alert('У вас нет доступных скаутов. Все скауты уже заняты или вам нужно нанять новых.');
        return;
    }

    const eventContent = document.getElementById('event-content');
    const eventTitle = document.getElementById('event-title');
    const eventOptions = document.getElementById('event-options');

    eventTitle.textContent = `Отправить скаутов в ${region.name}`;

    eventContent.innerHTML = `
        <div class="scouting-dialog">
            <p>Отправьте скаутов в ${region.name} для поиска молодых талантов.</p>
            <div class="region-info">
                <p><strong>Население:</strong> ${(region.population/1000).toFixed(0)}k</p>
                <p><strong>Потенциал талантов:</strong> ${getStarsHTML(region.talentRating)}</p>
            </div>
            <div class="scouting-options">
                <h4>Выберите скаутов для отправки:</h4>
                <div class="scouts-list">
                    ${availableScouts.map(scout => `
                        <div class="scout-option">
                            <input type="checkbox" id="scout_${scout.id}" value="${scout.id}">
                            <label for="scout_${scout.id}">
                                ${scout.name} (${scout.title}) - Навык: ${getStarsHTML(scout.skill)}
                            </label>
                        </div>
                    `).join('')}
                </div>
                <div class="scouting-parameters">
                    <h4>Параметры поиска:</h4>
                    <div class="parameter">
                        <label for="scout-duration">Продолжительность:</label>
                        <select id="scout-duration">
                            <option value="1">1 неделя (€5,000) - Поверхностный</option>
                            <option value="2">2 недели (€9,000) - Стандартный</option>
                            <option value="4">1 месяц (€15,000) - Углубленный</option>
                        </select>
                    </div>
                    <div class="parameter">
                        <label for="scout-age">Приоритетный возраст:</label>
                        <select id="scout-age">
                            <option value="6-9">6-9 лет</option>
                            <option value="10-12">10-12 лет</option>
                            <option value="13-15">13-15 лет</option>
                            <option value="16-18">16-18 лет</option>
                        </select>
                    </div>
                    <div class="parameter">
                        <label>Приоритетные позиции:</label>
                        <div class="checkbox-group">
                            <label><input type="checkbox" value="gk" checked> Вратари</label>
                            <label><input type="checkbox" value="def" checked> Защитники</label>
                            <label><input type="checkbox" value="mid" checked> Полузащитники</label>
                            <label><input type="checkbox" value="att" checked> Нападающие</label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    eventOptions.innerHTML = `
        <button id="cancel-scouting">Отмена</button>
        <button id="start-scouting">Начать скаутинг</button>
    `;

    document.getElementById('game-events').classList.remove('hidden');

    document.getElementById('cancel-scouting').addEventListener('click', () => {
        document.getElementById('game-events').classList.add('hidden');
    });

    document.getElementById('start-scouting').addEventListener('click', () => {
        const selectedScouts = [];
        document.querySelectorAll('.scout-option input:checked').forEach(checkbox => {
            selectedScouts.push(checkbox.value);
        });

        if (selectedScouts.length === 0) {
            alert('Выберите хотя бы одного скаута.');
            return;
        }

        const duration = parseInt(document.getElementById('scout-duration').value); 
        const cost = duration === 1 ? 5000 : (duration === 2 ? 9000 : 15000);

        if (gameState.scoutingBudget < cost) {
            alert(`У вас недостаточно средств в бюджете скаутинга. Требуется: €${cost.toLocaleString()}, Доступно: €${gameState.scoutingBudget.toLocaleString()}`);
            return;
        }
        if (gameState.budget < cost) { 
            alert(`Недостаточно средств в основном бюджете. Требуется: €${cost.toLocaleString()}, Доступно: €${gameState.budget.toLocaleString()}`);
            return;
        }

        gameState.budget -= cost;
        updateBudgetDisplay();
        selectedScouts.forEach(scoutId => {
            const scout = gameState.staff.find(s => s.id === scoutId);
            if (scout) {
                scout.isBusy = true;
            }
        });

        document.getElementById('game-events').classList.add('hidden');

        const durationText = duration === 1 ? '1 неделю' : (duration === 2 ? '2 недели' : '1 месяц');
        alert(`Скауты (${selectedScouts.length} чел.) отправлены в ${region.name} на ${durationText}. Стоимость: €${cost.toLocaleString()}`);

        const objective = gameState.objectives.scoutRegionsDeep;
        if (duration >= 2 && !gameState.scoutedRegions.includes(regionId) && !objective.completed) {
            gameState.scoutedRegions.push(regionId); 
            objective.current++;
            if (objective.current >= objective.required) {
                objective.completed = true;
            }
            updateSeasonProgress();
            updateObjectivesDisplay();
        }

        setTimeout(() => {
            generateScoutingResults(region, selectedScouts.length, duration);
            selectedScouts.forEach(scoutId => {
                const scout = gameState.staff.find(s => s.id === scoutId);
                if (scout) scout.isBusy = false;
            });
        }, 5000); 
    });

    document.getElementById('close-event').addEventListener('click', () => {
        document.getElementById('game-events').classList.add('hidden');
    });
}

// Modified hire staff functionality
function generateCandidates() {
    const category = document.getElementById('hire-category').value;
    const roleId = document.getElementById('hire-role').value;
    if (!roleId) return; 

    const role = staffRoles[category][roleId];
    const candidatesContainer = document.getElementById('hire-candidates');
    candidatesContainer.innerHTML = ''; 

    const firstNames = ['Александр', 'Сергей', 'Дмитрий', 'Андрей', 'Максим', 'Иван', 'Артем', 'Николай', 'Михаил', 'Егор'];
    const lastNames = ['Иванов', 'Смирнов', 'Кузнецов', 'Попов', 'Васильев', 'Петров', 'Соколов', 'Михайлов', 'Новиков', 'Федоров'];

    for (let i = 0; i < 3; i++) {
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const experience = 3 + Math.floor(Math.random() * 15);
        let skillRoll = Math.random();
        let skill = 2;
        if (skillRoll < 0.10) skill = 5;
        else if (skillRoll < 0.30) skill = 4;
        else if (skillRoll < 0.60) skill = 3;

        const salary = role.salaryRange[0] + Math.floor(Math.random() * (role.salaryRange[1] - role.salaryRange[0]));

        const candidateEl = document.createElement('div');
        candidateEl.className = 'candidate';
        candidateEl.innerHTML = `
            <div class="candidate-info">
                <h4>${firstName} ${lastName}</h4>
                <p><strong>Опыт:</strong> ${experience} лет</p>
                <p><strong>Навык:</strong> ${getStarsHTML(skill)}</p>
                <p><strong>Зарплата:</strong> €${salary.toLocaleString()}/мес</p>
            </div>
            <button class="hire-btn" data-name="${firstName} ${lastName}" data-experience="${experience}" data-skill="${skill}" data-salary="${salary}">Нанять</button>
        `;

        candidatesContainer.appendChild(candidateEl);
    }

    document.querySelectorAll('.hire-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const category = document.getElementById('hire-category').value;
            const roleId = document.getElementById('hire-role').value;
            const role = staffRoles[category][roleId];
            const salary = parseInt(e.target.dataset.salary);
            const skill = parseInt(e.target.dataset.skill);

            if (gameState.budget < salary * 12) {
                alert(`Недостаточно средств в бюджете для найма. Годовая зарплата €${salary * 12} превышает текущий бюджет €${gameState.budget.toLocaleString()}.`);
                return;
            }

            const newStaff = {
                id: `${category}_${Date.now()}`,
                name: e.target.dataset.name,
                title: role.title,
                category: category,
                experience: parseInt(e.target.dataset.experience),
                salary: salary,
                skill: skill,
                effect: role.effect,
                isBusy: false 
            };

            gameState.staff.push(newStaff);
            document.getElementById('game-events').classList.add('hidden');
            updateStaffView(); 
            alert(`${newStaff.name} (${newStaff.title}) успешно нанят! Зарплата: €${salary.toLocaleString()}/мес.`);

            const objective = gameState.objectives.hireTopCoaches;
            if (category === 'coaches' && skill >= 4 && !objective.completed) {
                objective.current++;
                if (objective.current >= objective.required) {
                    objective.completed = true;
                }
                updateSeasonProgress();
                updateObjectivesDisplay();
            }
        });
    });
}

// Modified upgrade facility function
function upgradeFacility(facilityId, amount) {
    const facility = gameState.facilities.find(f => f.id === facilityId);
    if (!facility) return;

    const baseCostPerPercent = facility.cost / 100; 
    const currentLevelMultiplier = 1 + (facility.level / 100); 
    const cost = Math.round(baseCostPerPercent * amount * currentLevelMultiplier);

    if (gameState.budget < cost) {
        alert(`Недостаточно средств для улучшения! Требуется: €${cost.toLocaleString()}, Доступно: €${gameState.budget.toLocaleString()}`);
        return;
    }

    const targetLevel = facility.level + amount;
    if (targetLevel > facility.maxLevel) {
        const possibleAmount = facility.maxLevel - facility.level;
        alert(`Нельзя улучшить выше ${facility.maxLevel}%. Максимальное улучшение возможно на +${possibleAmount}%.`);
        return;
    }

    facility.level = targetLevel;
    gameState.budget -= cost;

    updateBudgetDisplay();

    showFacilityDetails(facilityId); 

    alert(`${facility.name} успешно улучшен на ${amount}% до уровня ${facility.level}%! Потрачено: €${cost.toLocaleString()}`);

    const objective = gameState.objectives.upgradeKeyFacility;
    if (['trainingFields', 'medicalCenter'].includes(facilityId) && !objective.completed) {
        if (!objective.facilityType) {
            objective.facilityType = facilityId;
        }
        if (objective.facilityType === facilityId) {
            objective.current += amount; 
            objective.current = Math.min(100, objective.current); 

            if (objective.current >= objective.required) {
                objective.completed = true;
            }
            updateSeasonProgress();
            updateObjectivesDisplay();
        } else {
            alert(`Задача сезона: улучшить *один* ключевой объект (${gameState.facilities.find(f=>f.id === objective.facilityType)?.name || 'Поля/Мед.Центр'}) на ${objective.required}%. Вы уже начали улучшать ${gameState.facilities.find(f=>f.id === objective.facilityType)?.name || ''}.`);
        }
    }
}

// Update overall season progress based on weighted objectives
function updateSeasonProgress() {
    const objectives = gameState.objectives;
    let totalWeight = 0;
    let completedWeight = 0;

    for (const key in objectives) {
        const objective = objectives[key];
        totalWeight += objective.weight;
        if (objective.completed) {
            completedWeight += objective.weight;
        }
    }

    gameState.seasonProgress = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;

    const completeSeasonBtn = document.getElementById('complete-season');
    completeSeasonBtn.disabled = gameState.seasonProgress < 80; 
    completeSeasonBtn.textContent = `Завершить текущий сезон (${gameState.seasonProgress < 80 ? 'Мин. 80% задач' : 'Готово'})`;

    const progressBar = document.getElementById('season-progress');
    const progressPercentage = document.getElementById('progress-percentage');
    if(progressBar && progressPercentage) {
        progressBar.style.width = `${gameState.seasonProgress}%`;
        progressPercentage.textContent = `${gameState.seasonProgress}%`;
    }
}

// Switch between game views
function switchView(viewId) {
    document.querySelectorAll('.game-view').forEach(view => {
        view.classList.remove('active-view');
    });

    document.getElementById(viewId).classList.add('active-view');
    gameState.currentView = viewId;

    updateViewContent(viewId);
}

// Update content of specific views
function updateViewContent(viewId) {
    switch(viewId) {
        case 'dashboard-view':
            updateDashboardView(); 
            break;
        case 'academy-view':
            updateAcademyView();
            break;
        case 'staff-view':
            updateStaffView();
            break;
        case 'players-view':
            updatePlayersView();
            break;
        case 'scouting-view':
            updateScoutingView();
            break;
        case 'finance-view':
            updateFinanceView();
            break;
    }
}

// Update dashboard view (potentially refresh dynamic elements)
function updateDashboardView() {
    updateTeamsOverview();
    updateInfrastructureOverview();
    updateObjectivesDisplay(); 
    updateBudgetDisplay();
}

function updateTeamsOverview() {
    const teamsContainer = document.querySelector('.teams-overview');
    teamsContainer.innerHTML = ''; 

    gameState.teams.forEach(team => {
        const teamDiv = document.createElement('div');
        teamDiv.className = 'team';
        teamDiv.innerHTML = `
            <h4>${team.name}</h4>
            <div class="team-stats">
                <span>Игроки: ${team.playerCount}</span>
                <span>Рейтинг: ${getStarsHTML(team.rating)}</span>
                <span>Позиция: ${team.position || 'N/A'}/${team.maxTeams}</span>
            </div>
        `;
        teamsContainer.appendChild(teamDiv);
    });
}

function updateInfrastructureOverview() {
    const infraContainer = document.querySelector('.infrastructure-overview');
    infraContainer.innerHTML = ''; 

    gameState.facilities.forEach(facility => {
        const facilityDiv = document.createElement('div');
        facilityDiv.className = 'facility';
        facilityDiv.innerHTML = `
            <h4>${facility.name}</h4>
            <div class="facility-level">
                <div class="progress-bar">
                    <div class="progress" style="width: ${facility.level}%"></div>
                </div>
                <span>${facility.level}%</span>
            </div>
        `;
        infraContainer.appendChild(facilityDiv);
    });
}

// Update academy view
function updateAcademyView() {
    setupInfrastructureView(); 
}

// Setup infrastructure 3D view and details selection
function setupInfrastructureView() {
    const facilityDetails = document.getElementById('facility-details');
    const view3D = document.getElementById('infrastructure-3d-view'); 

    facilityDetails.innerHTML = '<h4>Выберите объект для улучшения</h4>';
    view3D.innerHTML = ''; 

    gameState.facilities.forEach((facility, index) => {
        const facilityIcon = document.createElement('div');
        facilityIcon.className = 'facility-icon-placeholder'; 
        facilityIcon.style.position = 'absolute';
        const positions = [ {top: '20%', left: '15%'}, {top: '30%', left: '60%'}, {top: '65%', left: '25%'}, {top: '70%', left: '70%'}, {top: '50%', left: '45%'} ];
        facilityIcon.style.top = positions[index % positions.length].top;
        facilityIcon.style.left = positions[index % positions.length].left;
        facilityIcon.style.cursor = 'pointer';
        facilityIcon.style.padding = '10px';
        facilityIcon.style.background = 'rgba(0, 85, 164, 0.7)';
        facilityIcon.style.color = 'white';
        facilityIcon.style.borderRadius = '5px';
        facilityIcon.style.textAlign = 'center';
        facilityIcon.style.fontSize = '11px';
        facilityIcon.style.minWidth = '50px'; 
        facilityIcon.textContent = facility.name.split(' ')[0]; 
        facilityIcon.title = facility.name; 

        if (gameState.scoutedRegions.includes(facility.id)) {
            facilityIcon.style.border = '2px solid var(--primary-color)';
            facilityIcon.title += '\n(Углубленный скаутинг проведен в этом сезоне)';
        }

        facilityIcon.addEventListener('click', () => {
            document.querySelectorAll('.facility-icon-placeholder').forEach(icon => icon.style.border = 'none');
            facilityIcon.style.border = '2px solid var(--primary-color)';
            showFacilityDetails(facility.id);
        });
        view3D.style.position = 'relative'; 
        view3D.appendChild(facilityIcon);
    });

    facilityDetails.innerHTML = '<h4><-- Кликните на объект на схеме для просмотра деталей и улучшения</h4>';
}

// Show facility details
function showFacilityDetails(facilityId) {
    const facility = gameState.facilities.find(f => f.id === facilityId);
    if (!facility) return;

    const facilityDetails = document.getElementById('facility-details');

    const baseCostPerPercent = facility.cost / 100; 
    const currentLevelMultiplier = 1 + (facility.level / 100);
    const cost10 = Math.round(baseCostPerPercent * 10 * currentLevelMultiplier);
    const cost25 = Math.round(baseCostPerPercent * 25 * currentLevelMultiplier);

    facilityDetails.innerHTML = `
        <h4>${facility.name}</h4>
        <p>${facility.description}</p>
        <div class="facility-stats">
            <div class="stat">
                <span>Текущий уровень:</span>
                <div class="progress-bar">
                    <div class="progress" style="width: ${facility.level}%"></div>
                </div>
                <span>${facility.level}% / ${facility.maxLevel}%</span>
            </div>
            <div class="stat">
                <span>Эффект:</span>
                <p>${facility.effect}</p>
            </div>
            <div class="stat">
                <span>Стоимость улучшения (зависит от уровня):</span>
                <p>+10%: ~€${cost10.toLocaleString()}</p>
                <p>+25%: ~€${cost25.toLocaleString()}</p>
            </div>
        </div>
        <div class="upgrade-options">
            <button id="upgrade-10" class="upgrade-btn" ${facility.level >= facility.maxLevel ? 'disabled' : ''}>Улучшить на +10%</button>
            <button id="upgrade-25" class="upgrade-btn" ${facility.level >= facility.maxLevel - 15 ? 'disabled' : ''}>Улучшить на +25%</button>
        </div>
    `;

    const btn10 = document.getElementById('upgrade-10');
    if (btn10 && !btn10.disabled) {
        btn10.addEventListener('click', () => upgradeFacility(facilityId, 10));
    }
    const btn25 = document.getElementById('upgrade-25');
    if (btn25 && !btn25.disabled) {
        btn25.addEventListener('click', () => upgradeFacility(facilityId, 25));
    }
}

// Update staff view
function updateStaffView() {
    const staffList = document.getElementById('staff-list');
    staffList.innerHTML = '';

    let filteredStaff = gameState.staff;

    const staffFilter = document.getElementById('staff-filter').value;
    if (staffFilter !== 'all') {
        filteredStaff = gameState.staff.filter(staff => staff.category === staffFilter);
    }

    if (filteredStaff.length === 0) {
        staffList.innerHTML = '<p>Нет сотрудников в этой категории.</p>';
    } else {
        filteredStaff.forEach(staff => {
            const staffCard = document.createElement('div');
            staffCard.className = 'staff-card'; 
            staffCard.innerHTML = `
                <div class="staff-avatar"></div> 
                <h4>${staff.name}</h4>
                <div class="staff-details">
                    <p><strong>Должность:</strong> ${staff.title}</p>
                    <p><strong>Опыт:</strong> ${staff.experience} лет</p>
                    <p><strong>Зарплата:</strong> €${staff.salary.toLocaleString()}/мес</p>
                    <p><strong>Навык:</strong> ${getStarsHTML(staff.skill)}</p>
                    ${staff.isBusy ? '<p style="color: orange;"><strong>Статус:</strong> Занят (Скаутинг)</p>' : ''}
                </div>
                <div class="staff-actions">
                    <button class="btn-fire" data-id="${staff.id}">Уволить</button>
                    <button class="btn-details" data-id="${staff.id}">Подробнее</button>
                </div>
            `;
            staffList.appendChild(staffCard);
        });
    }

    document.querySelectorAll('.btn-fire').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const staffId = e.target.dataset.id;
            fireStaff(staffId);
        });
    });

    document.querySelectorAll('.btn-details').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const staffId = e.target.dataset.id;
            showStaffDetails(staffId);
        });
    });

    const staffFilterSelect = document.getElementById('staff-filter');
    staffFilterSelect.removeEventListener('change', updateStaffView); 
    staffFilterSelect.addEventListener('change', updateStaffView);

    const hireButton = document.getElementById('hire-staff');
    if (!hireButton.getAttribute('data-listener-added')) {
        hireButton.addEventListener('click', showHireStaffDialog);
        hireButton.setAttribute('data-listener-added', 'true');
    }
}

// Show hire staff dialog
function showHireStaffDialog() {
    const eventContent = document.getElementById('event-content');
    const eventTitle = document.getElementById('event-title');
    const eventOptions = document.getElementById('event-options');

    eventTitle.textContent = 'Нанять сотрудника';

    eventContent.innerHTML = `
        <div class="hire-staff-form">
            <div class="form-group">
                <label for="hire-category">Категория:</label>
                <select id="hire-category">
                    <option value="coaches">Тренеры</option>
                    <option value="scouts">Скауты</option>
                    <option value="medical">Медперсонал</option>
                </select>
            </div>
            <div class="form-group">
                <label for="hire-role">Должность:</label>
                <select id="hire-role">
                    <!-- Will be populated based on category -->
                </select>
            </div>
            <hr>
            <div class="form-group">
                <label>Кандидаты:</label>
                <div id="hire-candidates">
                    <!-- Will be populated with random candidates -->
                    <p>Выберите категорию и должность для просмотра кандидатов.</p>
                </div>
            </div>
        </div>
    `;

    eventOptions.innerHTML = `
        <button id="close-hire-dialog">Отмена</button>
    `;

    document.getElementById('game-events').classList.remove('hidden');

    const categorySelect = document.getElementById('hire-category');
    const roleSelect = document.getElementById('hire-role');

    categorySelect.removeEventListener('change', updateHireRoles); 
    categorySelect.addEventListener('change', updateHireRoles);

    roleSelect.removeEventListener('change', generateCandidates); 
    roleSelect.addEventListener('change', generateCandidates);

    updateHireRoles();

    document.getElementById('close-hire-dialog').addEventListener('click', () => {
        document.getElementById('game-events').classList.add('hidden');
    });

    document.getElementById('close-event').addEventListener('click', () => {
        document.getElementById('game-events').classList.add('hidden');
    });
}

// Update roles based on selected category
function updateHireRoles() {
    const category = document.getElementById('hire-category').value;
    const roleSelect = document.getElementById('hire-role');

    roleSelect.innerHTML = '<option value="">-- Выберите должность --</option>'; 

    for (const [roleId, role] of Object.entries(staffRoles[category])) {
        const option = document.createElement('option');
        option.value = roleId;
        option.textContent = role.title;
        roleSelect.appendChild(option);
    }

    document.getElementById('hire-candidates').innerHTML = '<p>Выберите должность для просмотра кандидатов.</p>';
}

// Update players view
function updatePlayersView() {
    const playersList = document.getElementById('players-list');
    playersList.innerHTML = '';

    let filteredPlayers = gameState.players;

    const teamFilter = document.getElementById('team-filter').value;
    const positionFilter = document.getElementById('position-filter').value;
    const potentialFilter = document.getElementById('potential-filter').value;

    if (teamFilter !== 'all') {
        filteredPlayers = filteredPlayers.filter(player => player.team === teamFilter);
    }

    if (positionFilter !== 'all') {
        filteredPlayers = filteredPlayers.filter(player => {
            if (positionFilter === 'gk') return player.position === 'GK';
            if (positionFilter === 'def') return ['RB', 'CB', 'LB'].includes(player.position);
            if (positionFilter === 'mid') return ['DM', 'CM', 'AM', 'RW', 'LW'].includes(player.position); 
            if (positionFilter === 'att') return player.position === 'ST';
            return false; 
        });
    }

    if (potentialFilter !== 'all') {
        filteredPlayers = filteredPlayers.filter(player => player.potential == parseInt(potentialFilter));
    }

    filteredPlayers.sort((a, b) => {
        if (b.potential !== a.potential) {
            return b.potential - a.potential;
        }
        return a.name.localeCompare(b.name);
    });

    if (filteredPlayers.length === 0) {
        playersList.innerHTML = '<p>Нет игроков, соответствующих фильтрам.</p>';
    } else {
        filteredPlayers.forEach(player => {
            const playerCard = document.createElement('div');
            playerCard.className = 'player-card'; 
            playerCard.innerHTML = `
                <div class="player-avatar"></div> 
                <h4>${player.name}</h4>
                <div class="player-details">
                    <p><strong>Возраст:</strong> ${player.age} лет</p>
                    <p><strong>Позиция:</strong> ${player.position} (${player.positionName})</p>
                    <p><strong>Команда:</strong> ${player.team.toUpperCase()}</p>
                    <p><strong>Потенциал:</strong> <span class="stars">${getStarsHTML(player.potential)}</span></p>
                    <p><strong>Стоимость:</strong> €${player.value.toLocaleString()}</p>
                </div>
                <div class="player-stats">
                    <div class="stat" title="Технические навыки">
                        <span>Тех:</span>
                        <div class="progress-bar"><div class="progress tech" style="width: ${player.technical}%"></div></div>
                        <span>${player.technical}</span>
                    </div>
                    <div class="stat" title="Физические качества">
                        <span>Физ:</span>
                        <div class="progress-bar"><div class="progress phys" style="width: ${player.physical}%"></div></div>
                        <span>${player.physical}</span>
                    </div>
                    <div class="stat" title="Тактическое понимание">
                        <span>Так:</span>
                        <div class="progress-bar"><div class="progress tact" style="width: ${player.tactical}%"></div></div>
                        <span>${player.tactical}</span>
                    </div>
                    <div class="stat" title="Ментальные атрибуты">
                        <span>Мен:</span>
                        <div class="progress-bar"><div class="progress ment" style="width: ${player.mental}%"></div></div>
                        <span>${player.mental}</span>
                    </div>
                </div>
                <div class="player-actions">
                    <button class="btn-details" data-id="${player.id}">Подробнее</button>
                </div>
            `;
            playersList.appendChild(playerCard);
        });
    }

    document.querySelectorAll('.btn-details').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const playerId = e.target.dataset.id;
            showPlayerDetails(playerId);
        });
    });

    ['team-filter', 'position-filter', 'potential-filter'].forEach(filterId => {
        const select = document.getElementById(filterId);
        if (select && !select.getAttribute('data-listener-added')) {
            select.addEventListener('change', updatePlayersView);
            select.setAttribute('data-listener-added', 'true');
        }
    });
}

// Update scouting view
function updateScoutingView() {
    setupScoutingMap();
    updateScoutingReports(); 
    document.getElementById('scout-budget').textContent = `€${gameState.scoutingBudget.toLocaleString()}`;
}

// Setup scouting map (interactive regions)
function setupScoutingMap() {
    const kazakhstanMap = document.getElementById('kazakhstan-map');
    kazakhstanMap.innerHTML = ''; 
    kazakhstanMap.style.position = 'relative';
    kazakhstanMap.style.backgroundColor = '#e0f2f7'; 
    kazakhstanMap.style.border = '1px solid #b0bec5';
    kazakhstanMap.style.overflow = 'hidden'; 

    const mapTitle = document.createElement('div');
    mapTitle.textContent = 'Карта Регионов Казахстана';
    mapTitle.style.position = 'absolute';
    mapTitle.style.top = '10px';
    mapTitle.style.left = '50%';
    mapTitle.style.transform = 'translateX(-50%)';
    mapTitle.style.fontWeight = 'bold';
    mapTitle.style.color = 'var(--dark-color)';
    kazakhstanMap.appendChild(mapTitle);

    const regionPositions = {
        almaty: { top: '75%', left: '70%' }, nursultan: { top: '35%', left: '55%' }, shymkent: { top: '80%', left: '45%' },
        karaganda: { top: '45%', left: '65%' }, aktobe: { top: '40%', left: '20%' }, taraz: { top: '80%', left: '55%' },
        pavlodar: { top: '30%', left: '75%' }, uskemen: { top: '40%', left: '85%' }, semey: { top: '35%', left: '80%' },
        kyzylorda: { top: '65%', left: '35%' }, uralsk: { top: '35%', left: '5%' }, kostanay: { top: '25%', left: '35%' },
        atyrau: { top: '55%', left: '5%' }, aktau: { top: '70%', left: '10%' }
    };

    regions.forEach(region => {
        const regionElement = document.createElement('div');
        regionElement.className = 'map-region'; 
        regionElement.style.position = 'absolute';
        regionElement.style.top = regionPositions[region.id]?.top || '50%';
        regionElement.style.left = regionPositions[region.id]?.left || '50%';
        regionElement.style.transform = 'translate(-50%, -50%)';
        regionElement.style.padding = '5px 8px';
        regionElement.style.backgroundColor = `rgba(0, 85, 164, ${0.4 + region.talentRating * 0.1})`; 
        regionElement.style.color = 'white';
        regionElement.style.borderRadius = '50%';
        regionElement.style.cursor = 'pointer';
        regionElement.style.textAlign = 'center';
        regionElement.style.fontSize = '11px';
        regionElement.style.minWidth = '50px'; 
        regionElement.textContent = region.name.split('-')[0]; 
        regionElement.title = `${region.name}\nТалант: ${getStarsHTML(region.talentRating)}\nНаселение: ${(region.population/1000).toFixed(0)}k`; 

        if (gameState.scoutedRegions.includes(region.id)) {
            regionElement.style.border = '2px solid var(--primary-color)';
            regionElement.title += '\n(Углубленный скаутинг проведен в этом сезоне)';
        }

        regionElement.addEventListener('click', () => scoutRegion(region.id));
        kazakhstanMap.appendChild(regionElement);
    });
}

// Update the display of scouting reports/invited prospects
function updateScoutingReports() {
    const reportsContainer = document.getElementById('reports-list');
    if (!reportsContainer) {
        console.error("Element #reports-list not found.");
        return;
    }
}

// Generate scouting results
function generateScoutingResults(region, scoutCount, duration) {
    const baseProspects = region.talentRating * 0.5; 
    const durationMultiplier = duration === 1 ? 0.8 : (duration === 2 ? 1.5 : 2.5); 
    const scoutMultiplier = 1 + (scoutCount - 1) * 0.3; 

    const avgScoutSkill = 3;
    const skillMultiplier = 0.7 + avgScoutSkill * 0.1; 

    const prospectsFound = Math.max(0, Math.floor(baseProspects * durationMultiplier * scoutMultiplier * skillMultiplier * (Math.random() * 0.4 + 0.8))); 

    const firstNames = ['Аскар', 'Арман', 'Бауыржан', 'Тимур', 'Ерлан', 'Нурлан', 'Данияр', 'Руслан', 'Алихан', 'Диас'];
    const lastNames = ['Жумабеков', 'Оразов', 'Алиев', 'Нурпеисов', 'Сулейменов', 'Байтасов', 'Ахметов', 'Касымов', 'Жанибеков', 'Айтжанов'];
    const positions = Object.keys(playerPositions);
    const prospects = [];

    for (let i = 0; i < prospectsFound; i++) {
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

        const age = 6 + Math.floor(Math.random() * 13);

        const posKey = positions[Math.floor(Math.random() * positions.length)];
        const position = playerPositions[posKey].code;
        const positionName = playerPositions[posKey].name;
        const potentialRoll = Math.random(); 
        let potential = 1;
        const qualityThreshold = 0.5 + (duration - 1) * 0.1 + (region.talentRating - 1) * 0.05;

        if (potentialRoll < 0.05 * qualityThreshold) potential = 5; 
        else if (potentialRoll < 0.15 * qualityThreshold) potential = 4;
        else if (potentialRoll < 0.40 * qualityThreshold) potential = 3;
        else if (potentialRoll < 0.70 * qualityThreshold) potential = 2;

        prospects.push({
            id: `prospect_${Date.now()}_${i}`,
            name: `${firstName} ${lastName}`,
            age: age,
            position: position,
            positionName: positionName,
            potential: potential,
            region: region.name
        });
    }

    prospects.sort((a, b) => b.potential - a.potential);

    const eventContent = document.getElementById('event-content');
    const eventTitle = document.getElementById('event-title');
    const eventOptions = document.getElementById('event-options');

    eventTitle.textContent = `Результаты скаутинга: ${region.name}`;

    if (prospects.length === 0) {
        eventContent.innerHTML = `<p>Скауты завершили поиск в ${region.name}, но, к сожалению, не обнаружили достаточно перспективных игроков в этот раз.</p>`;
    } else {
        eventContent.innerHTML = `
            <div class="scouting-results">
                <p>Скауты завершили поиск в ${region.name}. Обнаружено ${prospects.length} перспективных игроков:</p>
                <div class="prospects-list" style="max-height: 300px; overflow-y: auto;">
                    ${prospects.map(prospect => `
                        <div class="prospect" style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #eee;">
                            <div class="prospect-info">
                                <h4 style="margin-bottom: 3px;">${prospect.name}</h4>
                                <p style="font-size: 0.9em; margin: 2px 0;">${prospect.age} лет, ${prospect.position} (${prospect.positionName})</p>
                                <p style="font-size: 0.9em; margin: 2px 0;">Потенциал: <span class="stars">${getStarsHTML(prospect.potential)}</span></p>
                            </div>
                            <button class="invite-btn" data-id="${prospect.id}" style="padding: 4px 8px; font-size: 0.9em;">Пригласить</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    eventOptions.innerHTML = `<button id="close-results">Закрыть</button>`;

    document.getElementById('game-events').classList.remove('hidden');

    document.querySelectorAll('.invite-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const prospectId = e.target.dataset.id;
            const prospect = prospects.find(p => p.id === prospectId);

            if (prospect) {
                inviteProspect(prospect);
                e.target.textContent = 'Приглашен';
                e.target.disabled = true;
                e.target.style.backgroundColor = '#ccc';
            }
        });
    });

    document.getElementById('close-results').addEventListener('click', () => {
        document.getElementById('game-events').classList.add('hidden');
    });

    document.getElementById('close-event').addEventListener('click', () => {
        document.getElementById('game-events').classList.add('hidden');
    });
}

// Update finance view
function updateFinanceView() {
    renderFinanceCharts(); 
    updateBudgetSlidersUI(); 
    updateBudgetDisplay();
}

// Setup budget sliders and link to gameState
function setupBudgetSliders() {
    ['salaries', 'scouting', 'infrastructure', 'tournaments', 'medical'].forEach(category => {
        const slider = document.getElementById(`${category}-slider`);
        const valueDisplay = document.getElementById(`${category}-value`);

        slider.value = gameState.budgetDistribution[category];
        valueDisplay.textContent = `${slider.value}%`;

        if (!slider.getAttribute('data-listener-added')) {
            slider.addEventListener('input', () => {
                const newValue = parseInt(slider.value);
                valueDisplay.textContent = `${newValue}%`;

                gameState.budgetDistribution[category] = newValue;

                validateAndUpdateBudget();
            });
            slider.setAttribute('data-listener-added', 'true');
        }
    });

    const saveButton = document.getElementById('save-budget');
    if (saveButton && !saveButton.getAttribute('data-listener-added')) {
        saveButton.addEventListener('click', saveBudgetDistribution);
        saveButton.setAttribute('data-listener-added', 'true');
    }

    validateAndUpdateBudget(); 
}

// Update sliders UI (e.g., when loading Finance view)
function updateBudgetSlidersUI() {
    ['salaries', 'scouting', 'infrastructure', 'tournaments', 'medical'].forEach(category => {
        const slider = document.getElementById(`${category}-slider`);
        const valueDisplay = document.getElementById(`${category}-value`);
        if (slider && valueDisplay) {
            slider.value = gameState.budgetDistribution[category];
            valueDisplay.textContent = `${slider.value}%`;
        }
    });
    validateAndUpdateBudget(); 
}

// Validate budget total and update chart/UI
function validateAndUpdateBudget() {
    const total = Object.values(gameState.budgetDistribution).reduce((sum, value) => sum + value, 0);
    const saveButton = document.getElementById('save-budget');

    if (!saveButton) return; 

    if (total !== 100) {
        saveButton.textContent = `Сохранить (Текущая сумма: ${total}%)`;
        saveButton.style.backgroundColor = '#ffc107'; 
        saveButton.disabled = true; 
    } else {
        saveButton.textContent = 'Сохранить распределение';
        saveButton.style.backgroundColor = ''; 
        saveButton.disabled = false; 
    }

    if (chartInstances['budget-distribution-chart']) {
        updateBudgetChartData(Object.values(gameState.budgetDistribution));
    } else {
        console.warn("Budget chart not ready for update during validation.");
    }
}

// Save budget distribution
function saveBudgetDistribution() {
    const total = Object.values(gameState.budgetDistribution).reduce((sum, value) => sum + value, 0);

    if (total !== 100) {
        alert('Общая сумма распределения бюджета должна быть 100%. Пожалуйста, скорректируйте значения.');
        return;
    }

    alert('Распределение бюджета сохранено. Изменения вступят в силу со следующего месяца.');
    document.getElementById('save-budget').disabled = true;
}

// Handle event option selection
function handleEventOption(event, option) { 
    let resultMessage = 'Решение принято.';

    if (option.budget) {
        gameState.budget += option.budget;
        updateBudgetDisplay(); 
        if (option.budget > 0) {
            resultMessage += ` Бюджет увеличен на €${option.budget.toLocaleString()}.`;
        } else {
            resultMessage += ` Бюджет уменьшен на €${Math.abs(option.budget).toLocaleString()}.`;
        }
    }

    if (event.id === 'topClubInterest') {
        if (option.talentLoss && option.playerId) {
            const playerIndex = gameState.players.findIndex(p => p.id === option.playerId);
            if (playerIndex !== -1) {
                const playerName = gameState.players[playerIndex].name;
                const transferFee = option.budget; 
                gameState.players.splice(playerIndex, 1); 
                gameState.achievements.revenueFromTransfers += transferFee; 
                resultMessage += ` ${playerName} продан. Получено €${transferFee.toLocaleString()}.`;
                updatePlayersView(); 
            }
        } else if (option.talentRetention) {
            resultMessage += ` Талантливый игрок остается в академии!`;
        } else if (option.partialRetention && option.playerId) {
            const transferFee = option.budget; 
            gameState.achievements.revenueFromTransfers += transferFee;
            resultMessage += ` Сделка согласована. Получено €${transferFee.toLocaleString()} + будущие бонусы.`;
        }
    }

    if (option.coachingLevel > 0) {
        resultMessage += ` Уровень тренерского штаба повышен.`;
    }
    if (option.infrastructure > 0) {
        const randomFacility = gameState.facilities[Math.floor(Math.random() * gameState.facilities.length)];
        const improvement = Math.min(option.infrastructure, randomFacility.maxLevel - randomFacility.level);
        if (improvement > 0) {
            randomFacility.level += improvement;
            resultMessage += ` ${randomFacility.name} улучшен на ${improvement}%.`;
            updateInfrastructureOverview(); 
            if (gameState.currentView === 'academy-view') updateAcademyView(); 
        } else {
            resultMessage += ` Инфраструктура уже максимальна.`;
        }
    }
    if (option.injuries < 0) {
        resultMessage += ` Снижен риск травм.`;
    }
    if (option.reputation > 0) {
        resultMessage += ` Повышена репутация академии.`;
    } else if (option.reputation < 0) {
        resultMessage += ` Снижена репутация академии.`;
    }

    alert(resultMessage); 

    setTimeout(triggerRandomEvent, 60000 + Math.random() * 30000);
}

// Trigger random event
function triggerRandomEvent() {
    if (document.hidden) { 
        setTimeout(triggerRandomEvent, 30000); 
        return;
    }

    const randomEvent = events[Math.floor(Math.random() * events.length)];

    let description = randomEvent.description;
    if (description.includes('{region}')) {
        const randomRegion = regions[Math.floor(Math.random() * regions.length)];
        description = description.replace('{region}', randomRegion.name);
    }
    if (randomEvent.id === 'topClubInterest') {
        const potentialPlayer = gameState.players.find(p => p.potential >= 4 && p.age >= 16 && p.age <= 18);
        if (potentialPlayer) {
            description = description.replace('нашим 16-летним талантом', `нашим ${potentialPlayer.age}-летним талантом (${potentialPlayer.positionName}, ${potentialPlayer.name})`);
            const baseOffer = potentialPlayer.value * (0.5 + Math.random()); 
            randomEvent.options.forEach(opt => {
                if (opt.budget) { 
                    opt.budget = Math.round(baseOffer * (opt.budget / 200000)); 
                }
                opt.playerId = potentialPlayer.id; 
            });
            randomEvent.options[0].text = `Продать игрока (€${randomEvent.options[0].budget.toLocaleString()})`;
            randomEvent.options[2].text = `Сделка с бонусами (€${randomEvent.options[2].budget.toLocaleString()} + %)`;

        } else {
            console.log("No suitable player found for top club interest event.");
            setTimeout(triggerRandomEvent, 5000); 
            return; 
        }
    }

    const eventContent = document.getElementById('event-content');
    const eventTitle = document.getElementById('event-title');
    const eventOptions = document.getElementById('event-options');

    eventTitle.textContent = randomEvent.title;
    eventContent.innerHTML = `<p>${description}</p>`;

    eventOptions.innerHTML = '';
    randomEvent.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.textContent = option.text;
        button.addEventListener('click', () => {
            handleEventOption(randomEvent, option); 
            document.getElementById('game-events').classList.add('hidden');
        });
        eventOptions.appendChild(button);
    });

    document.getElementById('game-events').classList.remove('hidden');

    document.getElementById('close-event').addEventListener('click', () => {
        document.getElementById('game-events').classList.add('hidden');
        setTimeout(triggerRandomEvent, 60000 + Math.random() * 30000);
    });
}

// Initialize the game when DOM is fully loaded
document.addEventListener('DOMContentLoaded', initGame);

// --- Data Generation and Helpers ---

// Generate random players for initialization
function generatePlayers() {
    const firstNames = ['Аскар', 'Арман', 'Бауыржан', 'Тимур', 'Ерлан', 'Нурлан', 'Данияр', 'Руслан', 'Алихан', 'Диас'];
    const lastNames = ['Жумабеков', 'Оразов', 'Алиев', 'Нурпеисов', 'Сулейменов', 'Байтасов', 'Ахметов', 'Касымов', 'Жанибеков', 'Айтжанов'];
    const positions = Object.keys(playerPositions);
    const teams = academyTeams.map(t => t.id); 

    gameState.players = []; 

    teams.forEach(teamId => {
        const teamConfig = academyTeams.find(t => t.id === teamId);
        const teamPlayerCount = teamConfig ? teamConfig.playerCount : 20; 

        for (let i = 0; i < teamPlayerCount; i++) {
            const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

            const age = parseInt(teamId.replace('u', '')) - Math.floor(Math.random() * 3); 
            const posKey = positions[Math.floor(Math.random() * positions.length)];
            const position = playerPositions[posKey].code;
            const positionName = playerPositions[posKey].name;
            const potential = Math.ceil(Math.random() * 5); 

            const baseStat = 20 + Math.random() * 30; 
            const ageBonus = (age - 10) * 1.5; 
            const potentialBonus = potential * 5; 

            const technical = Math.min(100, Math.max(10, Math.round(baseStat + ageBonus + potentialBonus * (0.8 + Math.random() * 0.4))));
            const physical = Math.min(100, Math.max(10, Math.round(baseStat + ageBonus + potentialBonus * (0.8 + Math.random() * 0.4))));
            const tactical = Math.min(100, Math.max(10, Math.round(baseStat + ageBonus + potentialBonus * (0.8 + Math.random() * 0.4))));
            const mental = Math.min(100, Math.max(10, Math.round(baseStat + ageBonus + potentialBonus * (0.8 + Math.random() * 0.4))));

            const player = {
                id: `${teamId}_player_${Date.now()}_${i}`,
                name: `${firstName} ${lastName}`,
                age: age,
                position: position,
                positionName: positionName,
                team: teamId,
                potential: potential,
                technical: technical,
                physical: physical,
                tactical: tactical,
                mental: mental,
                value: calculatePlayerValue({ age, potential, technical, physical, tactical, mental }),
                developmentHistory: [] 
            };
            gameState.players.push(player);
        }
    });

    console.log(`Generated ${gameState.players.length} players.`);
}

// Generate initial staff
function generateStaff() {
    const firstNames = ['Александр', 'Сергей', 'Дмитрий', 'Андрей', 'Максим', 'Иван', 'Артем', 'Николай', 'Михаил', 'Егор'];
    const lastNames = ['Иванов', 'Смирнов', 'Кузнецов', 'Попов', 'Васильев', 'Петров', 'Соколов', 'Михайлов', 'Новиков', 'Федоров'];

    gameState.staff = []; 

    let staffCount = 0;
    for (const category in staffRoles) {
        for (const roleId in staffRoles[category]) {
            const numToGenerate = Math.random() > 0.3 ? 1 : 2;
            for (let i = 0; i < numToGenerate; i++) {
                if (staffCount >= 15) break;

                const role = staffRoles[category][roleId];
                const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
                const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
                const experience = 5 + Math.floor(Math.random() * 10);
                let skillRoll = Math.random();
                let skill = 2;
                if (skillRoll < 0.05) skill = 5;
                else if (skillRoll < 0.20) skill = 4;
                else if (skillRoll < 0.50) skill = 3;

                const salary = role.salaryRange[0] + Math.floor(Math.random() * (role.salaryRange[1] - role.salaryRange[0]));

                const newStaff = {
                    id: `${category}_${roleId}_${Date.now()}_${i}`,
                    name: `${firstName} ${lastName}`,
                    title: role.title,
                    category: category,
                    experience: experience,
                    salary: salary,
                    skill: skill,
                    effect: role.effect,
                    isBusy: false 
                };

                gameState.staff.push(newStaff);
                staffCount++;
            }
        }
    }
    console.log(`Generated ${gameState.staff.length} initial staff members.`);
}

// Fire staff member
function fireStaff(staffId) {
    const staffIndex = gameState.staff.findIndex(s => s.id === staffId);
    if (staffIndex !== -1) {
        const staff = gameState.staff[staffIndex];
        const severancePay = staff.salary * 3; 

        if (gameState.budget < severancePay) {
            alert(`Недостаточно средств для выплаты компенсации (€${severancePay.toLocaleString()}). Увольнение невозможно.`);
            return;
        }

        if (confirm(`Вы уверены, что хотите уволить ${staff.name} (${staff.title})? Потребуется выплата компенсации в размере €${severancePay.toLocaleString()}.`)) {
            gameState.budget -= severancePay;
            updateBudgetDisplay();
            gameState.staff.splice(staffIndex, 1); 
            alert(`${staff.name} уволен. Выплачена компенсация.`);
            updateStaffView(); 
        }
    }
}

// Show staff details (placeholder for more info)
function showStaffDetails(staffId) {
    const staff = gameState.staff.find(s => s.id === staffId);
    if (!staff) return;
    alert(`Подробная информация о ${staff.name}:\nДолжность: ${staff.title}\nКатегория: ${getStaffCategory(staff.category)}\nОпыт: ${staff.experience} лет\nЗарплата: €${staff.salary.toLocaleString()}/мес\nНавык: ${getStarsHTML(staff.skill)}\nЭффект: ${staff.effect}`);
}

// Calculate player value based on attributes
function calculatePlayerValue(player) {
    let baseValue = 5000; 
    baseValue += player.age * 1000; 
    baseValue += player.potential * 10000; 
    const avgSkill = (player.technical + player.physical + player.tactical + player.mental) / 4;
    baseValue += avgSkill * 500; 

    baseValue *= (0.8 + Math.random()*0.4); 

    return Math.round(baseValue / 100) * 100; 
}

// Show player details (placeholder for detailed view/chart)
function showPlayerDetails(playerId) {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return;

    const eventContent = document.getElementById('event-content');
    const eventTitle = document.getElementById('event-title');
    const eventOptions = document.getElementById('event-options');

    eventTitle.textContent = `Карточка игрока: ${player.name}`;

    eventContent.innerHTML = `
        <div class="player-details-modal" style="display: flex; gap: 20px;">
            <div class="player-info">
                <div class="player-avatar" style="width: 80px; height: 80px; background-color: var(--secondary-color); border-radius: 50%; margin-bottom: 15px;"></div>
                <p><strong>Возраст:</strong> ${player.age} лет</p>
                <p><strong>Позиция:</strong> ${player.position} (${player.positionName})</p>
                <p><strong>Команда:</strong> ${player.team.toUpperCase()}</p>
                <p><strong>Потенциал:</strong> <span class="stars">${getStarsHTML(player.potential)}</span></p>
                <p><strong>Стоимость:</strong> €${player.value.toLocaleString()}</p>
            </div>
            <div class="player-skills" style="flex: 1;">
                <h4>Навыки</h4>
                <div class="player-stats">
                    <div class="stat" title="Технические навыки">
                        <span>Тех:</span>
                        <div class="progress-bar"><div class="progress tech" style="width: ${player.technical}%"></div></div>
                        <span>${player.technical}</span>
                    </div>
                    <div class="stat" title="Физические качества">
                        <span>Физ:</span>
                        <div class="progress-bar"><div class="progress phys" style="width: ${player.physical}%"></div></div>
                        <span>${player.physical}</span>
                    </div>
                    <div class="stat" title="Тактическое понимание">
                        <span>Так:</span>
                        <div class="progress-bar"><div class="progress tact" style="width: ${player.tactical}%"></div></div>
                        <span>${player.tactical}</span>
                    </div>
                    <div class="stat" title="Ментальные атрибуты">
                        <span>Мен:</span>
                        <div class="progress-bar"><div class="progress ment" style="width: ${player.mental}%"></div></div>
                        <span>${player.mental}</span>
                    </div>
                </div>
                <h4>График Развития (Placeholder)</h4>
                <canvas id="player-development-chart" style="max-height: 150px;"></canvas>
                <button id="sell-player" data-id="${player.id}" ${player.age < 16 ? 'disabled' : ''}>Продать</button>
            </div>
        </div>
    `;

    eventOptions.innerHTML = `
        <button id="close-player-details">Закрыть</button>
    `;

    document.getElementById('game-events').classList.remove('hidden');

    simulatePlayerDevelopmentChart(player);

    document.getElementById('close-player-details').addEventListener('click', () => {
        document.getElementById('game-events').classList.add('hidden');
    });
    document.getElementById('close-event').addEventListener('click', () => {
        document.getElementById('game-events').classList.add('hidden');
    });

    const sellBtn = document.getElementById('sell-player');
    if (sellBtn && !sellBtn.disabled) {
        sellBtn.addEventListener('click', (e) => {
            const playerIdToSell = e.target.dataset.id;
            const playerToSell = gameState.players.find(p => p.id === playerIdToSell);
            if(playerToSell) {
                const offer = Math.round(playerToSell.value * (0.8 + Math.random() * 0.4)); 
                if (confirm(`Предложение о продаже ${playerToSell.name} за €${offer.toLocaleString()}. Принять?`)) {
                    gameState.budget += offer;
                    gameState.achievements.revenueFromTransfers += offer; 
                    const playerIndex = gameState.players.findIndex(p => p.id === playerIdToSell);
                    gameState.players.splice(playerIndex, 1); 
                    updateBudgetDisplay();
                    alert(`${playerToSell.name} продан за €${offer.toLocaleString()}.`);
                    document.getElementById('game-events').classList.add('hidden');
                    updatePlayersView(); 
                }
            }
        });
    }
}

// Simulate player development chart data (placeholder)
function simulatePlayerDevelopmentChart(player) {
    const ctx = document.getElementById('player-development-chart');
    if (!ctx) return;

    if (playerChartInstance) {
        playerChartInstance.destroy();
        playerChartInstance = null;
    }

    const labels = ['Год 1', 'Год 2', 'Год 3', 'Сейчас']; 
    const historyPoints = Math.max(1, player.age - 14); 
    const generateHistory = (currentStat) => {
        let history = [];
        let startStat = Math.max(10, currentStat - historyPoints * (3 + Math.random() * 4)); 
        for (let i=0; i < historyPoints; i++) {
            history.push(Math.round(startStat + (currentStat - startStat) * (i / historyPoints) * (0.8 + Math.random()*0.4) ));
        }
        history.push(currentStat); 
        while(history.length < labels.length) {
            history.unshift(null);
        }
        return history.slice(0, labels.length); 
    };

    playerChartInstance = new ChartModule.Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Техника',
                    data: generateHistory(player.technical),
                    borderColor: '#007bff',
                    tension: 0.1
                },
                {
                    label: 'Физика',
                    data: generateHistory(player.physical),
                    borderColor: '#dc3545',
                    tension: 0.1
                },
                {
                    label: 'Тактика',
                    data: generateHistory(player.tactical),
                    borderColor: '#ffc107',
                    tension: 0.1
                },
                {
                    label: 'Ментал',
                    data: generateHistory(player.mental),
                    borderColor: '#28a745',
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { font: { size: 10 } }
                },
                x: { ticks: { font: { size: 10 } } }
            },
            plugins: { legend: { display: false } } 
        }
    });
}

// Update budget display
function updateBudgetDisplay() {
    document.getElementById('budget').textContent = `Бюджет: €${gameState.budget.toLocaleString()}`;
    document.getElementById('current-season-display').textContent = gameState.currentSeason;
    document.getElementById('season-goal').textContent = `Сезон: ${gameState.currentSeason} из ${gameState.totalSeasons}`;
}