# 数据看板重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将管理端「数据看板」重构为基于学生评价提交数据的教师多维分析页面，并支持按年级查看教师整体情况。

**Architecture:** 保持当前静态 HTML 原型形态。`index.html` 在最终提交时写入 `localStorage.teacherEvaluationSubmissions`；`admin-system.html` 优先读取该数据，无数据时生成模拟数据，再通过统一的 dashboard model 驱动指标、图表和表格渲染。测试使用从 HTML 抽取脚本到临时 JS 文件的方式做语法检查，并用 Node 中的纯函数测试验证核心计算口径。

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, localStorage, inline SVG, Node.js syntax/function tests, Git.

---

## File Structure

- Modify: `E:\AI_Space\AI_Project\教師評價\index.html`
  - Add student submission persistence in `finalSubmit()`.
  - Keep the existing student flow and UI unchanged.
- Modify: `E:\AI_Space\AI_Project\教師評價\admin-system.html`
  - Replace current dashboard markup.
  - Add dashboard-specific CSS.
  - Add data access, scoring, aggregation, mock data, and rendering functions.
  - Call dashboard rendering when opening the dashboard page and during app init.
- Create: `E:\AI_Space\AI_Project\教師評價\tests\dashboard-model.test.js`
  - Contains a small copied test harness for scoring and aggregation rules used by the dashboard.
  - Tests are intentionally plain Node without dependencies.

## Task 1: Add Dashboard Model Test Harness

**Files:**
- Create: `E:\AI_Space\AI_Project\教師評價\tests\dashboard-model.test.js`

- [ ] **Step 1: Create the failing dashboard model test**

Create `tests/dashboard-model.test.js` with this content:

```javascript
const assert = require('node:assert/strict');

function scoreAnswer(answerIndex, optionCount) {
  if (optionCount <= 1) return 0;
  const max = optionCount - 1;
  return 100 - (Number(answerIndex) / max) * 50;
}

function scoreSubmission(submission, dimensionCount) {
  const scores = [];
  for (let i = 0; i < dimensionCount; i += 1) {
    if (submission.answers && Object.prototype.hasOwnProperty.call(submission.answers, String(i))) {
      scores.push(scoreAnswer(submission.answers[String(i)], submission.optionCount));
    }
  }
  return scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : 0;
}

function buildTeacherSummary(submissions) {
  const byTeacher = new Map();
  submissions.forEach((submission) => {
    const key = submission.teacherName + '|' + submission.subject;
    const score = scoreSubmission(submission, submission.dimensionCount);
    if (!byTeacher.has(key)) {
      byTeacher.set(key, {
        teacherName: submission.teacherName,
        subject: submission.subject,
        gradeSet: new Set(),
        classSet: new Set(),
        scores: [],
      });
    }
    const item = byTeacher.get(key);
    item.gradeSet.add(submission.grade);
    item.classSet.add(submission.className);
    item.scores.push(score);
  });

  return Array.from(byTeacher.values()).map((item) => {
    const average = item.scores.reduce((sum, value) => sum + value, 0) / item.scores.length;
    return {
      teacherName: item.teacherName,
      subject: item.subject,
      grades: Array.from(item.gradeSet),
      classes: Array.from(item.classSet),
      responseCount: item.scores.length,
      averageScore: Math.round(average * 10) / 10,
      status: item.scores.length < 8 ? '样本不足' : average < 75 ? '需关注' : average >= 90 ? '优秀' : '稳定',
    };
  });
}

const submissions = [
  {teacherName:'方民主', subject:'英语', grade:'8', className:'801班', optionCount:5, dimensionCount:6, answers:{0:0,1:0,2:1,3:0,4:1,5:0}},
  {teacherName:'方民主', subject:'英语', grade:'8', className:'801班', optionCount:5, dimensionCount:6, answers:{0:1,1:1,2:1,3:1,4:1,5:1}},
  {teacherName:'方民主', subject:'英语', grade:'8', className:'802班', optionCount:5, dimensionCount:6, answers:{0:0,1:0,2:0,3:0,4:0,5:0}},
  {teacherName:'方民主', subject:'英语', grade:'8', className:'802班', optionCount:5, dimensionCount:6, answers:{0:0,1:1,2:0,3:1,4:0,5:1}},
  {teacherName:'方民主', subject:'英语', grade:'8', className:'803班', optionCount:5, dimensionCount:6, answers:{0:1,1:0,2:1,3:0,4:1,5:0}},
  {teacherName:'方民主', subject:'英语', grade:'8', className:'803班', optionCount:5, dimensionCount:6, answers:{0:0,1:0,2:0,3:0,4:0,5:0}},
  {teacherName:'方民主', subject:'英语', grade:'8', className:'804班', optionCount:5, dimensionCount:6, answers:{0:1,1:1,2:1,3:1,4:1,5:1}},
  {teacherName:'方民主', subject:'英语', grade:'8', className:'804班', optionCount:5, dimensionCount:6, answers:{0:0,1:0,2:0,3:0,4:0,5:0}},
];

assert.equal(scoreAnswer(0, 5), 100);
assert.equal(scoreAnswer(4, 5), 50);
assert.equal(scoreAnswer(1, 3), 75);

const summary = buildTeacherSummary(submissions);
assert.equal(summary.length, 1);
assert.equal(summary[0].teacherName, '方民主');
assert.equal(summary[0].responseCount, 8);
assert.equal(summary[0].status, '优秀');
assert.deepEqual(summary[0].grades, ['8']);
assert.equal(summary[0].classes.length, 4);

console.log('dashboard model tests passed');
```

- [ ] **Step 2: Run the test to establish the harness**

Run:

```powershell
node tests\dashboard-model.test.js
```

Expected:

```text
dashboard model tests passed
```

- [ ] **Step 3: Commit the test harness**

Run:

```powershell
git add tests\dashboard-model.test.js
git commit -m "Add dashboard model test harness"
```

## Task 2: Persist Student Submissions From `index.html`

**Files:**
- Modify: `E:\AI_Space\AI_Project\教師評價\index.html`

- [ ] **Step 1: Add a storage helper before `finalSubmit()`**

Insert this function before the existing `finalSubmit()`:

```javascript
function persistEvaluationSubmission(){
  const key='teacherEvaluationSubmissions';
  let existing=[];
  try{
    existing=JSON.parse(localStorage.getItem(key)||'[]');
    if(!Array.isArray(existing)) existing=[];
  }catch(e){
    existing=[];
  }
  const now=new Date().toISOString();
  const records=S.teachers.map((t,i)=>({
    id:'submission-'+Date.now()+'-'+i,
    submittedAt:now,
    tier:S.tier,
    grade:String(S.grade||''),
    gradeName:S.gradeName,
    className:S.className,
    teacherName:t.name,
    subject:t.subject,
    answers:t.answers||{},
    comment:t.comment||''
  }));
  localStorage.setItem(key,JSON.stringify(existing.concat(records)));
}
```

- [ ] **Step 2: Update `finalSubmit()` to call the helper**

Replace:

```javascript
function finalSubmit(){ go('s-success'); }
```

With:

```javascript
function finalSubmit(){
  persistEvaluationSubmission();
  go('s-success');
}
```

- [ ] **Step 3: Verify script syntax**

Run:

```powershell
$path='E:\AI_Space\AI_Project\教師評價\index.html'
$text=[System.IO.File]::ReadAllText($path)
$script=[regex]::Match($text,'<script>([\s\S]*)</script>').Groups[1].Value
$out=Join-Path $env:TEMP 'student-index-script-check.js'
$enc=New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($out,$script,$enc)
node --check $out
Remove-Item -LiteralPath $out
```

Expected: exit code `0` and no syntax error output.

- [ ] **Step 4: Commit student submission persistence**

Run:

```powershell
git add index.html
git commit -m "Persist student evaluation submissions locally"
```

## Task 3: Replace Dashboard Markup and Styles

**Files:**
- Modify: `E:\AI_Space\AI_Project\教師評價\admin-system.html`

- [ ] **Step 1: Replace the existing dashboard HTML block**

Replace the content inside:

```html
<div class="page active" id="page-dashboard">
  ...
</div>
```

With a dashboard shell containing:

```html
<div class="page active" id="page-dashboard">
  <div class="page-header">
    <div>
      <h1 class="page-title">数据看板</h1>
      <p class="page-subtitle">基于学生评价数据分析教师表现、年级整体情况与风险信号</p>
    </div>
    <div class="page-actions">
      <button class="btn btn-sec btn-sm" onclick="exportDashboardReport()">📥 导出报告</button>
      <button class="btn btn-pri btn-sm" onclick="showCreateEvalModal()">+ 新建任务</button>
    </div>
  </div>

  <div class="dashboard-filter-bar">
    <select class="filter-select" id="dashboardTaskFilter" onchange="renderDashboard()">
      <option value="spring-2026">2026 春季学生评教</option>
    </select>
    <select class="filter-select" id="dashboardTierFilter" onchange="handleDashboardTierChange()">
      <option value="">全部学段</option>
      <option value="low">小学低年级</option>
      <option value="mid">小学高年级</option>
      <option value="high">初中</option>
    </select>
    <select class="filter-select" id="dashboardGradeFilter" onchange="renderDashboard()"></select>
    <select class="filter-select" id="dashboardSubjectFilter" onchange="renderDashboard()"></select>
    <div class="search-box dashboard-search">
      <button>🔍</button>
      <input type="text" id="dashboardSearch" placeholder="搜索教师、学科、班级..." oninput="renderDashboard()">
    </div>
    <span class="dashboard-source-pill" id="dashboardSourceLabel">演示模拟数据</span>
  </div>

  <div class="stats-grid dashboard-kpis" id="dashboardKpis"></div>

  <div class="dashboard-main-grid">
    <section class="card dashboard-panel dashboard-grade-panel">
      <div class="dashboard-panel-head">
        <div>
          <div class="card-title">年级整体情况</div>
          <div class="dashboard-panel-sub">按年级汇总教师评价结果、完成率和主要短板</div>
        </div>
      </div>
      <div id="dashboardGradeChart" class="dashboard-grade-chart"></div>
      <div id="dashboardGradeCards" class="dashboard-grade-cards"></div>
    </section>

    <section class="card dashboard-panel">
      <div class="card-title">维度表现</div>
      <div id="dashboardDimensionBars" class="dashboard-bars"></div>
      <div class="card-title dashboard-section-title">学科对比</div>
      <div id="dashboardSubjectBars" class="dashboard-bars compact"></div>
    </section>
  </div>

  <div class="dashboard-secondary-grid">
    <section class="card dashboard-panel">
      <div class="card-title">教师得分分布</div>
      <div id="dashboardScoreDistribution" class="dashboard-distribution"></div>
    </section>
    <section class="card dashboard-panel">
      <div class="card-title">风险提醒</div>
      <div id="dashboardAlerts" class="dashboard-alerts"></div>
    </section>
  </div>

  <div class="card dashboard-panel">
    <div class="table-header">
      <div>
        <div class="card-title">教师分析明细</div>
        <div class="dashboard-panel-sub">展示当前筛选范围内教师的样本量、平均分和短板维度</div>
      </div>
    </div>
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>教师</th>
            <th>学科</th>
            <th>任教范围</th>
            <th>评价人数</th>
            <th>平均分</th>
            <th>优势维度</th>
            <th>短板维度</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody id="dashboardTeacherBody"></tbody>
      </table>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Add dashboard CSS near existing chart/table CSS**

Add CSS classes for:

```css
.dashboard-filter-bar
.dashboard-source-pill
.dashboard-kpis
.dashboard-main-grid
.dashboard-secondary-grid
.dashboard-panel
.dashboard-panel-head
.dashboard-panel-sub
.dashboard-grade-chart
.dashboard-grade-cards
.dashboard-grade-card
.dashboard-bars
.dashboard-bar-row
.dashboard-distribution
.dashboard-alerts
.dashboard-empty
```

Use the existing color variables and keep card radius at or below the current system style. Add responsive rules so grids collapse to one column below `900px`.

- [ ] **Step 3: Verify script syntax after markup/style change**

Run the existing admin script extraction check:

```powershell
$path='E:\AI_Space\AI_Project\教師評價\admin-system.html'
$text=[System.IO.File]::ReadAllText($path)
$script=[regex]::Match($text,'<script>([\s\S]*)</script>').Groups[1].Value
$out=Join-Path $env:TEMP 'admin-system-script-check.js'
$enc=New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($out,$script,$enc)
node --check $out
Remove-Item -LiteralPath $out
```

Expected: exit code `0`.

- [ ] **Step 4: Commit dashboard shell**

Run:

```powershell
git add admin-system.html
git commit -m "Redesign dashboard shell"
```

## Task 4: Add Dashboard Data and Aggregation Functions

**Files:**
- Modify: `E:\AI_Space\AI_Project\教師評價\admin-system.html`
- Test: `E:\AI_Space\AI_Project\教師評價\tests\dashboard-model.test.js`

- [ ] **Step 1: Add constants and data access functions in `admin-system.html`**

Add functions after schedule/teacher data helpers:

```javascript
const DASHBOARD_STORAGE_KEY = 'teacherEvaluationSubmissions';
const DASHBOARD_DIMENSIONS = {
  low:['讲解理解','课堂体验','耐心关爱','课堂秩序','难度感受'],
  mid:['讲解理解','课堂秩序','作业反馈','关心解答','启发实践'],
  high:['讲解清晰','课堂管理','启发思维','关爱公平','作业反馈','责任态度']
};

function getDashboardSubmissions(){
  try{
    const raw = localStorage.getItem(DASHBOARD_STORAGE_KEY);
    const parsed = JSON.parse(raw || '[]');
    if(Array.isArray(parsed) && parsed.length){
      return {source:'real', rows:normalizeDashboardRows(parsed)};
    }
  }catch(e){}
  return {source:'mock', rows:buildMockDashboardSubmissions()};
}
```

- [ ] **Step 2: Add scoring and normalization functions**

Add:

```javascript
function getDashboardOptionCount(tier){
  return tier === 'low' ? 3 : tier === 'mid' ? 4 : 5;
}

function scoreDashboardAnswer(answerIndex, optionCount){
  if(optionCount <= 1) return 0;
  const max = optionCount - 1;
  return 100 - (Number(answerIndex) / max) * 50;
}

function getDashboardSubmissionScore(row){
  const dimensionCount = (DASHBOARD_DIMENSIONS[row.tier] || DASHBOARD_DIMENSIONS.high).length;
  const optionCount = getDashboardOptionCount(row.tier);
  const scores = [];
  for(let i=0;i<dimensionCount;i++){
    if(row.answers && Object.prototype.hasOwnProperty.call(row.answers, String(i))){
      scores.push(scoreDashboardAnswer(row.answers[String(i)], optionCount));
    }
  }
  return scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : 0;
}
```

- [ ] **Step 3: Add mock data generation from teaching schedule**

Use existing primary and junior schedule arrays to create deterministic rows. Generate 10 to 18 pseudo-student submissions per teacher/class pair with stable answer patterns based on grade, subject, and teacher name length.

- [ ] **Step 4: Add aggregation model**

Implement `buildDashboardModel(filters)` returning:

```javascript
{
  source,
  kpis,
  gradeSummaries,
  dimensionSummaries,
  subjectSummaries,
  scoreDistribution,
  alerts,
  teacherSummaries
}
```

Each summary should contain only display-ready fields plus raw numbers needed by render functions.

- [ ] **Step 5: Extend the Node test for aggregation status**

Append assertions in `tests/dashboard-model.test.js` verifying:

```javascript
assert.equal(buildTeacherSummary(submissions.slice(0, 7))[0].status, '样本不足');
```

Run:

```powershell
node tests\dashboard-model.test.js
```

Expected:

```text
dashboard model tests passed
```

- [ ] **Step 6: Verify admin syntax and commit**

Run:

```powershell
$path='E:\AI_Space\AI_Project\教師評價\admin-system.html'
$text=[System.IO.File]::ReadAllText($path)
$script=[regex]::Match($text,'<script>([\s\S]*)</script>').Groups[1].Value
$out=Join-Path $env:TEMP 'admin-system-script-check.js'
$enc=New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($out,$script,$enc)
node --check $out
Remove-Item -LiteralPath $out
node tests\dashboard-model.test.js
git add admin-system.html tests\dashboard-model.test.js
git commit -m "Add dashboard data model"
```

## Task 5: Render Dashboard KPIs, Charts, Cards, and Table

**Files:**
- Modify: `E:\AI_Space\AI_Project\教師評價\admin-system.html`

- [ ] **Step 1: Add filter initialization**

Implement:

```javascript
function initDashboardFilters(){
  renderDashboardGradeOptions();
  renderDashboardSubjectOptions();
}

function handleDashboardTierChange(){
  renderDashboardGradeOptions();
  renderDashboard();
}
```

- [ ] **Step 2: Add render functions**

Implement:

```javascript
function renderDashboard(){
  initDashboardFilters();
  const filters = getDashboardFilters();
  const model = buildDashboardModel(filters);
  renderDashboardSource(model);
  renderDashboardKpis(model.kpis);
  renderDashboardGradeChart(model.gradeSummaries);
  renderDashboardGradeCards(model.gradeSummaries);
  renderDashboardDimensionBars(model.dimensionSummaries);
  renderDashboardSubjectBars(model.subjectSummaries);
  renderDashboardScoreDistribution(model.scoreDistribution);
  renderDashboardAlerts(model.alerts);
  renderDashboardTeacherTable(model.teacherSummaries);
}
```

Each render function should set `innerHTML` only for its own container.

- [ ] **Step 3: Add year grade card interaction**

Grade cards should call:

```javascript
function filterDashboardByGrade(grade){
  document.getElementById('dashboardGradeFilter').value = String(grade);
  renderDashboard();
}
```

- [ ] **Step 4: Add empty states**

If any section has no rows, render:

```html
<div class="dashboard-empty">当前筛选范围暂无评价数据</div>
```

- [ ] **Step 5: Wire dashboard rendering into navigation and init**

In `showPage(pageId)`, add dashboard render behavior:

```javascript
if(pageId === 'dashboard'){
  renderDashboard();
}
```

In `initApp()`, call:

```javascript
initDashboardFilters();
renderDashboard();
```

- [ ] **Step 6: Verify and commit**

Run:

```powershell
$path='E:\AI_Space\AI_Project\教師評價\admin-system.html'
$text=[System.IO.File]::ReadAllText($path)
$script=[regex]::Match($text,'<script>([\s\S]*)</script>').Groups[1].Value
$out=Join-Path $env:TEMP 'admin-system-script-check.js'
$enc=New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($out,$script,$enc)
node --check $out
Remove-Item -LiteralPath $out
node tests\dashboard-model.test.js
git add admin-system.html
git commit -m "Render dashboard analytics"
```

## Task 6: Manual Browser Verification and Push

**Files:**
- Modify only if verification finds defects.

- [ ] **Step 1: Run full local verification**

Run:

```powershell
$admin='E:\AI_Space\AI_Project\教師評價\admin-system.html'
$student='E:\AI_Space\AI_Project\教師評價\index.html'
foreach($path in @($admin,$student)){
  $text=[System.IO.File]::ReadAllText($path)
  $script=[regex]::Match($text,'<script>([\s\S]*)</script>').Groups[1].Value
  $name=[System.IO.Path]::GetFileNameWithoutExtension($path)
  $out=Join-Path $env:TEMP ($name + '-script-check.js')
  $enc=New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($out,$script,$enc)
  node --check $out
  Remove-Item -LiteralPath $out
}
node tests\dashboard-model.test.js
```

Expected: all commands exit `0`, test prints `dashboard model tests passed`.

- [ ] **Step 2: Open files in browser for manual checks**

Open:

```text
E:\AI_Space\AI_Project\教師評價\admin-system.html
E:\AI_Space\AI_Project\教師評價\index.html
```

Check:

- Dashboard loads with simulated data when local storage is empty.
- Filter controls update the KPI cards, grade cards, charts, alerts, and teacher table.
- Student flow can submit one complete evaluation.
- After student submission, dashboard source label changes to real submission data.
- Text does not overlap at desktop width.

- [ ] **Step 3: Commit any verification fixes**

If manual verification required fixes:

```powershell
git add admin-system.html index.html tests\dashboard-model.test.js
git commit -m "Fix dashboard verification issues"
```

- [ ] **Step 4: Push all commits**

Run:

```powershell
git push
```

Expected: remote `main` updates successfully.

## Self-Review Notes

- Spec coverage: The plan covers data source fallback, local student storage, dashboard filters, KPIs, grade analysis, multidimensional charts, teacher table, alert states, and verification.
- Placeholder scan: No task contains open-ended placeholders; mock generation is bounded to existing schedule arrays with deterministic answer generation.
- Type consistency: The plan uses one storage key, one submission shape, and one dashboard model shape throughout.
