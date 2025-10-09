let curOpenStack = ['root'];

window.addEventListener('load', function() {
    let st = this.sessionStorage.getItem('lastPath');
    if(st != null) curOpenStack = JSON.parse(st);
    else curOpenStack = ['root'];
    if(curOpenStack[curOpenStack.length - 1] == 'quiz') curOpenStack.pop();
    buildByUUID(curOpenStack[curOpenStack.length - 1]);
});

function fullscreenButtonClick() {
    if(document.fullscreenElement) {
        document.exitFullscreen();
        document.querySelector('body').style = '';
    } else {
        document.querySelector('html').requestFullscreen();
        document.querySelector('body').style = "transform: translate(-20%, 0) scale(0.6, 0.6); zoom: calc(1 / 0.6); overflow: hidden;";
    }
}

function settingsButtonClick() {
    document.querySelector('.settings_overlay_container').style.display = 'block';
}

function setEnabledPanel(name) {
    let selectorContainer = document.querySelector('.selector_container');
    let prequizContainer = document.querySelector('.prequiz_container');
    let quizContainer = document.querySelector('.quiz_container');
    let panels = new Map([
        ['selector', selectorContainer],
        ['prequiz', prequizContainer],
        ['quiz', quizContainer]
    ]);
    panels.forEach((val, key, map) => {
        if(key == name) val.style.display = 'flex';
        else val.style.display = 'none';
    });
}

function selCardClick(caller) {
    let card_uuid = caller.querySelector('.selector_card_target_uuid').innerText;
    curOpenStack.push(card_uuid);
    sessionStorage.setItem('lastPath', JSON.stringify(curOpenStack));
    buildByUUID(card_uuid);
}

let curQuiz = {};
let curQuizQuestion = 0;
let maxChoices = 1;
let choiceList = [];
let curQuestionAnswers = [];

function buildByUUID(uuid) {
    fetch(`assets/configs/${uuid}.json`).then(function(response) {
        response.json().then(function(obj) {
            if(obj.type == 'list') {
                setEnabledPanel('selector');
                buildList(obj);
            }
            if(obj.type == 'quiz') {
                setEnabledPanel('prequiz');
                curQuiz = obj;
                curQuizQuestion = 0;
                buildPrequiz(obj);
            }
        });
    });
}

function buildList(jsonObj) {
    let container = document.querySelector('.selector_container');
    let title = document.querySelector('.header_title');
    title.innerText = `${jsonObj.title} (${jsonObj.uuid})`;
    let targHtml = '';
    for(let idx = 0; idx < jsonObj.items.length; idx++) {
        let item = jsonObj.items[idx];
        targHtml += `
            <div class="selector_card" onclick="selCardClick(this);">
                <div style="display: none;" class="selector_card_target_uuid">${item.target}</div>
                <div class="selector_card_img_cont"><img class="selector_card_img" src="assets/media/${item.image}"></div>
                <span class="selector_card_title">${item.title}</span>
            </div>
        `;
    }
    container.innerHTML = targHtml;
}

function buildPrequiz(jsonObj) {
    let container = document.querySelector('.prequiz_container');
    let title = document.querySelector('.header_title');
    title.innerText = `${jsonObj.title} (${jsonObj.uuid})`;
    container.querySelector('.prequiz_header').innerText = jsonObj.title;
    container.querySelector('.prequiz_cover').src = `assets/media/${jsonObj.coverImg}`;
}

function backButtonClick() {
    if(curOpenStack.length == 1) {
        buildByUUID(curOpenStack[curOpenStack.length - 1]);
        return;
    }
    curOpenStack.pop();
    sessionStorage.setItem('lastPath', JSON.stringify(curOpenStack));
    buildByUUID(curOpenStack[curOpenStack.length - 1]);
}

function startQuiz() {
    setEnabledPanel('quiz');
    curOpenStack.push('quiz');
    sessionStorage.setItem('lastPath', JSON.stringify(curOpenStack));
    curQuizQuestion = 0;
    if(curQuiz.order == 'random') curQuizQuestion = Math.floor(Math.random() * curQuiz.questions.length);
    loadQuizQuestion(curQuizQuestion);
}

function loadQuizQuestion(idx) {
    let question = curQuiz.questions[idx];
    let qcont = document.querySelector('.quiz_container');
    let qtitle = qcont.querySelector('.quiz_header');
    let qb1 = qcont.querySelector('#quiz_button_1');
    let qb2 = qcont.querySelector('#quiz_button_2');
    let qb3 = qcont.querySelector('#quiz_button_3');
    let qb4 = qcont.querySelector('#quiz_button_4');
    qtitle.innerText = question.title;

    let qimg = qcont.querySelector('.quiz_question_image');
    let qvid = qcont.querySelector('.quiz_question_video');
    if(question.contentType == 'image') {
        qimg.style = "display: block;";
        qvid.style = "display: none;";
        qimg.src = `assets/media/${question.content}`;
    } else {
        qimg.style = "display: none;";
        qvid.style = "display: block;";
        qvid.src = `assets/media/${question.content}`;
        qvid.loop = true;
        qvid.autoplay = true;
    }

    let curAnsSet = [];
    curAnsSet.push(question.rightChoices[0]);
    let qsAnsSet = curQuiz.answerSets[question.answerSet];
    while(curAnsSet.length < 4) {
        let idx = Math.floor(Math.random() * qsAnsSet.length);
        let flag = true;
        for(let i = 0; i < curAnsSet.length; i++) {
            if(curAnsSet[i] == idx) {
                flag = false;
                break;
            }
        }
        if(flag) curAnsSet.push(idx);
    }

    let ansPermutation = [0, 1, 2, 3];
    for(let i = ansPermutation.length - 1; i >= 0; i--) {
        let idx = Math.floor(Math.random() * (i + 1));
        let t = ansPermutation[i];
        ansPermutation[i] = ansPermutation[idx];
        ansPermutation[idx] = t;
    }
    qb1.innerText = qsAnsSet[curAnsSet[ansPermutation[0]]];
    qb2.innerText = qsAnsSet[curAnsSet[ansPermutation[1]]];
    qb3.innerText = qsAnsSet[curAnsSet[ansPermutation[2]]];
    qb4.innerText = qsAnsSet[curAnsSet[ansPermutation[3]]];
    curQuestionAnswers = [ansPermutation.findIndex((x) => {return x == 0;}) + 1];
    curQuestionAnswers.sort();
    document.querySelector('.wa_overlay_text').innerText = question['answerDesc'];
}

function verifyAnswer() {
    choiceList.sort();
    if(JSON.stringify(choiceList) == JSON.stringify(curQuestionAnswers)) {
        console.log('так да');
        choiceList = [];
        curQuizQuestion++;
        if(curQuizQuestion >= curQuiz.questions.length) curQuizQuestion = 0;
        if(curQuiz.order == 'random') curQuizQuestion = Math.floor(Math.random() * curQuiz.questions.length);
        // alert(`так да: ${curQuizQuestion}/${curQuiz.questions.length}`);
        loadQuizQuestion(curQuizQuestion);
    } else {
        // alert('нет, ты не прав');
        document.querySelector('.wa_overlay_container').style.display = 'block';
        choiceList = [];
    }
}

function quizBtnClick(btn) {
    if(btn.id == 'quiz_button_ans') {
        verifyAnswer();
    } else {
        let clIdx = Number(btn.id.charAt(btn.id.length - 1));
        if(choiceList.indexOf(clIdx) != -1) choiceList.splice(choiceList.indexOf(clIdx), 1);
        else choiceList.push(clIdx);
        if(choiceList.length > maxChoices) choiceList.splice(0, 1);
    }
    for(let i = 1; i <= 4; i++) {
        let cbtn = document.querySelector(`#quiz_button_${i}`);
        if(choiceList.indexOf(i) == -1) cbtn.classList.remove('quiz_button_on');
        else cbtn.classList.add('quiz_button_on');
    }
}

function hideWAOverlay(btn) {
    document.querySelector('.wa_overlay_container').style.display = 'none';
}

function hideSettingsOverlay(btn) {
    document.querySelector('.settings_overlay_container').style.display = 'none';
}

function resetAllSettings(btn) {
    sessionStorage.clear();
    location.reload();
}
