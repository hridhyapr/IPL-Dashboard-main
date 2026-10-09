/* =========================================
   Cricket Team Performance Analytics
   Interactive Dashboard Logic
   ========================================= */

// Global state
const body = document.body;
const themeToggle = document.getElementById("themeToggle");
const exportBtn = document.querySelector(".export-btn");
const teamSelect = document.getElementById("teamSelect");
const teamOne = document.getElementById("teamOne");
const teamTwo = document.getElementById("teamTwo");
const searchTeam = document.getElementById("searchTeam");
const gradeFilter = document.getElementById("gradeFilter");
const sortBy = document.getElementById("sortBy");
const resetFilters = document.getElementById("resetFilters");

let chartData = (window.DASHBOARD_DATA && window.DASHBOARD_DATA.charts) || {};
let rankingData = (window.DASHBOARD_DATA && window.DASHBOARD_DATA.ranking) || [];

// =========================================
// Theme Management
// =========================================
function getCurrentMode() {
    return body.classList.contains("dark-mode") ? "dark" : "light";
}

function getLayout(mode) {
    const isDark = mode === "dark";
    return {
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: {
            color: isDark ? "#F8FAFC" : "#111827",
            family: "Inter, sans-serif",
            size: 11
        },
        margin: {
            t: 20,
            l: 45,
            r: 25,
            b: 40
        }
    };
}

function applyTheme(mode) {
    body.classList.remove("light-mode", "dark-mode");
    body.classList.add(mode + "-mode");
    localStorage.setItem("theme", mode);

    if (typeof Plotly !== "undefined" && Object.keys(chartData).length > 0) {
        updateCharts(mode);
        if (teamSelect && teamSelect.value) {
            updateTeamProfile(teamSelect.value);
        }
        updateComparison();
    }
}

function initializeTheme() {
    const savedTheme = localStorage.getItem("theme") || "light";
    body.classList.remove("light-mode", "dark-mode");
    body.classList.add(savedTheme + "-mode");

    if (themeToggle) {
        themeToggle.checked = savedTheme === "dark";
        themeToggle.addEventListener("change", () => {
            applyTheme(themeToggle.checked ? "dark" : "light");
        });
    }
}

// =========================================
// Smooth Scrolling for Sidebar
// =========================================
document.querySelectorAll(".sidebar a").forEach(link => {
    link.addEventListener("click", function (e) {
        const href = this.getAttribute("href");
        if (href && href.startsWith("#")) {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                document.querySelectorAll(".sidebar a").forEach(a => a.classList.remove("active"));
                this.classList.add("active");
                target.scrollIntoView({ behavior: "smooth" });
            }
        }
    });
});

// =========================================
// Export CSV
// =========================================
if (exportBtn) {
    exportBtn.addEventListener("click", () => {
        const table = document.querySelector("#ranking table");
        if (!table) return;

        let csv = [];
        table.querySelectorAll("tr").forEach(row => {
            if (row.style.display === "none") return;
            let cols = row.querySelectorAll("th, td");
            let rowData = [];
            cols.forEach(col => {
                rowData.push('"' + col.innerText.replace(/"/g, '""').trim() + '"');
            });
            if (rowData.length) csv.push(rowData.join(","));
        });

        const blob = new Blob([csv.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "Cricket_Team_Performance_Report.csv";
        a.click();
        URL.revokeObjectURL(url);
    });
}

// =========================================
// Draw Dashboard Charts
// =========================================
function updateCharts(mode) {
    if (typeof Plotly === "undefined") return;
    const baseLayout = getLayout(mode);
    const gridColor = mode === "dark" ? "#334155" : "#E2E8F0";

    // 1. Top Teams Wins (Batting 1st vs Chasing)
    const topWins = chartData.top_teams_wins || {
        teams: [],
        bat_first_wins: [],
        chase_wins: []
    };

    if (document.getElementById("subjectChart")) {
        Plotly.newPlot(
            "subjectChart",
            [
                {
                    name: "Bat 1st (Defended)",
                    x: topWins.teams,
                    y: topWins.bat_first_wins,
                    type: "bar",
                    marker: { color: "#F59E0B" }
                },
                {
                    name: "Chasing (Bowled 1st)",
                    x: topWins.teams,
                    y: topWins.chase_wins,
                    type: "bar",
                    marker: { color: "#5B6CFF" }
                }
            ],
            {
                ...baseLayout,
                barmode: "stack",
                legend: {
                    orientation: "h",
                    x: 0,
                    y: 1.15,
                    font: { size: 10 }
                },
                xaxis: {
                    tickangle: -30,
                    gridcolor: gridColor
                },
                yaxis: {
                    title: "Total Wins",
                    gridcolor: gridColor
                }
            },
            { responsive: true, displayModeBar: false }
        );
    }

    // 2. Match Win Method Distribution (Donut Chart)
    const winMethods = chartData.win_method_distribution || {
        labels: ["Chased (Wickets)", "Defended (Runs)", "Tied (Super Over)"],
        values: [578, 498, 14]
    };

    if (document.getElementById("gradeChart")) {
        Plotly.newPlot(
            "gradeChart",
            [
                {
                    labels: winMethods.labels,
                    values: winMethods.values,
                    type: "pie",
                    hole: 0.55,
                    textinfo: "percent+label",
                    textposition: "outside",
                    automargin: true,
                    marker: {
                        colors: ["#5B6CFF", "#22C55E", "#F59E0B", "#94A3B8"]
                    }
                }
            ],
            {
                ...baseLayout,
                showlegend: false,
                margin: { t: 25, b: 25, l: 20, r: 20 }
            },
            { responsive: true, displayModeBar: false }
        );
    }

    // 3. Matches Played vs Win Rate (%)
    const scatterData = chartData.win_rate_vs_matches || {
        team: [],
        matches: [],
        win_rate: [],
        wins: []
    };

    const hoverLabels = (scatterData.team || []).map((t, idx) => {
        const m = scatterData.matches ? scatterData.matches[idx] : 0;
        const w = scatterData.wins ? scatterData.wins[idx] : 0;
        const wr = scatterData.win_rate ? scatterData.win_rate[idx] : 0;
        return `<b>${t}</b><br>Matches: ${m}<br>Wins: ${w}<br>Win Rate: ${wr}%`;
    });

    const markerSizes = (scatterData.wins || []).map(w => Math.max(9, Math.min(26, w * 0.14 + 8)));

    if (document.getElementById("scatterChart")) {
        Plotly.newPlot(
            "scatterChart",
            [
                {
                    x: scatterData.matches || [],
                    y: scatterData.win_rate || [],
                    text: hoverLabels,
                    hoverinfo: "text",
                    mode: "markers",
                    type: "scatter",
                    marker: {
                        size: markerSizes,
                        color: "#06B6D4",
                        opacity: 0.85,
                        line: { color: "#0891B2", width: 1.5 }
                    }
                }
            ],
            {
                ...baseLayout,
                xaxis: {
                    title: "Matches Played",
                    gridcolor: gridColor
                },
                yaxis: {
                    title: "Win Rate (%)",
                    gridcolor: gridColor
                }
            },
            { responsive: true, displayModeBar: false }
        );
    }

    // 4. Tournament Scoring Trend (Line Chart)
    const trend = chartData.scoring_trend || { seasons: [], avg_targets: [] };

    if (document.getElementById("lineChart")) {
        Plotly.newPlot(
            "lineChart",
            [
                {
                    x: trend.seasons || [],
                    y: trend.avg_targets || [],
                    mode: "lines+markers",
                    line: { color: "#5B6CFF", width: 3 },
                    marker: { size: 7, color: "#4B5AF2" }
                }
            ],
            {
                ...baseLayout,
                xaxis: {
                    tickangle: -40,
                    gridcolor: gridColor
                },
                yaxis: {
                    title: "Avg Target Runs",
                    gridcolor: gridColor
                }
            },
            { responsive: true, displayModeBar: false }
        );
    }

    // 5. Correlation Heatmap
    if (chartData.heatmap && document.getElementById("heatmapChart")) {
        Plotly.newPlot(
            "heatmapChart",
            [
                {
                    z: chartData.heatmap.values,
                    x: chartData.heatmap.labels,
                    y: chartData.heatmap.labels,
                    type: "heatmap",
                    colorscale: "Blues",
                    zmin: -1,
                    zmax: 1
                }
            ],
            {
                ...baseLayout,
                margin: { t: 15, l: 85, r: 25, b: 65 },
                xaxis: { tickangle: -30 }
            },
            { responsive: true, displayModeBar: false }
        );
    }
}

// =========================================
// Team Profile & Tactical Radar
// =========================================
function updateTeamProfile(teamName) {
    const team = rankingData.find(item => item.Team === teamName);
    if (!team) return;

    const setElemText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    const setElemWidth = (id, pct) => {
        const el = document.getElementById(id);
        if (el) el.style.width = Math.min(100, Math.max(0, pct)) + "%";
    };

    setElemText("teamRank", "#" + team.Rank);
    setElemText("teamGrade", team.Tier || team.Grade || "-");
    setElemText("teamAverage", team.Matches ?? "-");
    setElemText("teamWinRate", (team.WinRate ?? 0) + "%");

    const winRateVal = team.WinRate ?? 0;
    const defendVal = team.DefendWinRate ?? team.SQL ?? 0;
    const chaseVal = team.ChaseWinRate ?? team["Power BI"] ?? 0;
    const tossVal = team.TossWinRate ?? team.AI ?? 0;

    // Numerical scores
    setElemText("pythonScore", winRateVal + "%");
    setElemText("sqlScore", defendVal + "%");
    setElemText("powerbiScore", chaseVal + "%");
    setElemText("aiScore", tossVal + "%");

    // Progress bar fills
    setElemWidth("pythonBar", winRateVal);
    setElemWidth("sqlBar", defendVal);
    setElemWidth("powerbiBar", chaseVal);
    setElemWidth("aiBar", tossVal);

    // Radar Chart
    if (typeof Plotly !== "undefined" && document.getElementById("teamRadar")) {
        const radarCategories = (chartData.radar_chart && chartData.radar_chart.categories) || [
            "Win Rate %",
            "Bat 1st Win %",
            "Chase Win %",
            "Toss Win %",
            "Toss-to-Win %"
        ];

        const radarStats = [
            winRateVal,
            defendVal,
            chaseVal,
            tossVal,
            team.TossConversion ?? 0
        ];

        Plotly.newPlot(
            "teamRadar",
            [
                {
                    type: "scatterpolar",
                    r: radarStats,
                    theta: radarCategories,
                    fill: "toself",
                    marker: { color: "#5B6CFF" },
                    fillcolor: "rgba(91, 108, 255, 0.35)"
                }
            ],
            {
                paper_bgcolor: "transparent",
                plot_bgcolor: "transparent",
                font: {
                    color: getCurrentMode() === "dark" ? "#F8FAFC" : "#111827",
                    family: "Inter, sans-serif",
                    size: 10
                },
                margin: { t: 15, l: 35, r: 35, b: 25 },
                polar: {
                    radialaxis: {
                        visible: true,
                        range: [0, 100],
                        gridcolor: getCurrentMode() === "dark" ? "#334155" : "#E2E8F0"
                    },
                    angularaxis: {
                        gridcolor: getCurrentMode() === "dark" ? "#334155" : "#E2E8F0"
                    }
                },
                showlegend: false
            },
            { responsive: true, displayModeBar: false }
        );
    }
}

// =========================================
// Compare Teams Head-to-Head
// =========================================
function updateComparison() {
    if (!teamOne || !teamTwo || typeof Plotly === "undefined") return;

    const s1 = rankingData.find(t => t.Team === teamOne.value);
    const s2 = rankingData.find(t => t.Team === teamTwo.value);
    if (!s1 || !s2) return;

    const categories = [
        "Win Rate %",
        "Bat 1st Win %",
        "Chase Win %",
        "Toss Win %",
        "Toss Conv %"
    ];

    const vals1 = [
        s1.WinRate ?? 0,
        s1.DefendWinRate ?? 0,
        s1.ChaseWinRate ?? 0,
        s1.TossWinRate ?? 0,
        s1.TossConversion ?? 0
    ];

    const vals2 = [
        s2.WinRate ?? 0,
        s2.DefendWinRate ?? 0,
        s2.ChaseWinRate ?? 0,
        s2.TossWinRate ?? 0,
        s2.TossConversion ?? 0
    ];

    const isDark = getCurrentMode() === "dark";
    const gridColor = isDark ? "#334155" : "#E2E8F0";

    Plotly.newPlot(
        "compareChart",
        [
            {
                x: categories,
                y: vals1,
                name: s1.Team,
                type: "bar",
                marker: { color: "#5B6CFF" }
            },
            {
                x: categories,
                y: vals2,
                name: s2.Team,
                type: "bar",
                marker: { color: "#22C55E" }
            }
        ],
        {
            barmode: "group",
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: {
                color: isDark ? "#F8FAFC" : "#111827",
                family: "Inter, sans-serif"
            },
            margin: { t: 20, l: 40, r: 20, b: 35 },
            legend: { orientation: "h", y: 1.15, x: 0 },
            yaxis: {
                title: "Percentage (%)",
                range: [0, 100],
                gridcolor: gridColor
            },
            xaxis: { gridcolor: gridColor }
        },
        { responsive: true, displayModeBar: false }
    );
}

if (teamSelect) {
    teamSelect.addEventListener("change", e => {
        updateTeamProfile(e.target.value);
    });
}
if (teamOne) teamOne.addEventListener("change", updateComparison);
if (teamTwo) teamTwo.addEventListener("change", updateComparison);

// =========================================
// Table Filtering & Sorting
// =========================================
function filterAndSortTable() {
    const tableBody = document.querySelector("#ranking tbody");
    if (!tableBody) return;

    const searchTerm = (searchTeam ? searchTeam.value : "").trim().toLowerCase();
    const selectedTier = (gradeFilter ? gradeFilter.value : "").trim();
    const sortVal = (sortBy ? sortBy.value : "rank").toLowerCase();

    const rows = Array.from(tableBody.querySelectorAll("tr"));

    rows.forEach(row => {
        const teamText = (row.querySelector(".team-label")?.textContent || row.children[1]?.textContent || "").toLowerCase();
        const rowTier = row.getAttribute("data-tier") || "";

        const matchesSearch = !searchTerm || teamText.includes(searchTerm);
        const matchesTier = !selectedTier || rowTier.toLowerCase() === selectedTier.toLowerCase();

        if (matchesSearch && matchesTier) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    });

    // Sort visible rows
    const parseColVal = (row, colIndex, isFloat = false) => {
        const cell = row.children[colIndex];
        if (!cell) return 0;
        const text = cell.textContent.replace(/[#%,]/g, "").trim();
        return isFloat ? parseFloat(text) || 0 : parseInt(text, 10) || 0;
    };

    rows.sort((a, b) => {
        switch (sortVal) {
            case "matches":
                return parseColVal(b, 2) - parseColVal(a, 2);
            case "wins":
                return parseColVal(b, 3) - parseColVal(a, 3);
            case "winrate":
                return parseColVal(b, 5, true) - parseColVal(a, 5, true);
            case "batfirst":
                return parseColVal(b, 6) - parseColVal(a, 6);
            case "chase":
                return parseColVal(b, 7) - parseColVal(a, 7);
            case "toss":
                return parseColVal(b, 8, true) - parseColVal(a, 8, true);
            case "rank":
            default:
                return parseColVal(a, 0) - parseColVal(b, 0);
        }
    });

    rows.forEach(row => tableBody.appendChild(row));
}

if (searchTeam) searchTeam.addEventListener("input", filterAndSortTable);
if (gradeFilter) gradeFilter.addEventListener("change", filterAndSortTable);
if (sortBy) sortBy.addEventListener("change", filterAndSortTable);

if (resetFilters) {
    resetFilters.addEventListener("click", () => {
        if (searchTeam) searchTeam.value = "";
        if (gradeFilter) gradeFilter.value = "";
        if (sortBy) sortBy.value = "rank";
        filterAndSortTable();
    });
}

// =========================================
// Initialization
// =========================================
document.addEventListener("DOMContentLoaded", () => {
    initializeTheme();

    if (window.DASHBOARD_DATA) {
        chartData = window.DASHBOARD_DATA.charts || {};
        rankingData = window.DASHBOARD_DATA.ranking || [];
    }

    const mode = getCurrentMode();
    updateCharts(mode);

    if (teamSelect && teamSelect.options.length > 0) {
        updateTeamProfile(teamSelect.value || teamSelect.options[0].value);
    }
    updateComparison();
});