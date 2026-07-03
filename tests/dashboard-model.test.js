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
assert.equal(buildTeacherSummary(submissions.slice(0, 7))[0].status, '样本不足');

console.log('dashboard model tests passed');
